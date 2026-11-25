/**
 * Frame-rate benchmark of the real game (Vite dev server + headless Chromium, real GPU via ANGLE/D3D11 like the
 * P0.4 spike bench), 1280x720 at DPR 1, `?level=L01&debug=1`, while Pip walks up and down the west yard and
 * through the house walls' shadow. 3 zooms x 2 projections at 1x and 4x CPU throttle
 * (CDP `Emulation.setCPUThrottlingRate`). Each combo runs `--repeat` times; the run with the median FPS is reported.
 *
 * Run: npx tsx tools/e2e/perf.ts [--secs=8] [--repeat=3] [--only=4x] [--proj=oblique] [--zoom=1] [--debug=1]
 *                                [--verbose] [--cpuprofile=out/prefix] [--json=out.json]
 * Needs spike/node_modules (Playwright + Chromium).
 */
import fs from "node:fs";
import { launchBrowser, startServer } from "./common";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const flag = (k: string) => process.argv.includes(`--${k}`);
const SECS = Number(arg("secs", "8"));
const REPEAT = Math.max(1, Number(arg("repeat", "3")));
const ONLY = arg("only", "");
const ONLY_PROJ = arg("proj", "");
const ONLY_ZOOM = arg("zoom", "");
const DEBUG = arg("debug", "1");
const PROFILE = arg("cpuprofile", "");
const JSON_OUT = arg("json", "");
const VERBOSE = flag("verbose");
const ZOOMS = [0.6, 1.0, 1.8];
const PROJS = ["oblique", "topdown"] as const;
const THROTTLES = [1, 4];

interface Stats { frameMs: number; drawOps: number; sections: Record<string, number> }
interface ViewLike { getProjection(): string; setZoom(z: number): void; getZoom(): number; skipIntro(): void; getStats(): Stats; frame(...a: unknown[]): void }
interface HostLike { getWorld(): { player: { x: number; y: number }; status: string }; toggleProjection(): void; restart(): void; getView(): ViewLike; tick(t: number): void }
interface PerfWin { __sneakaboo: { host: HostLike }; __perf: { d: number[]; vf: number[]; tk: number[]; done: boolean; restarts: number } }

interface Run { fps: number; p50: number; p95: number; max: number; frames: number; zoom: number; viewP50: number; viewP95: number; tickP50: number; restarts: number; sections: Record<string, number> }
interface Row extends Run { throttle: number; proj: string; reqZoom: number; runs: number[] }

const q = (a: number[], p: number) => {
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))] ?? 0;
};

const srv = await startServer();
const browser = await launchBrowser();
const rows: Row[] = [];
const errors: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e: Error) => errors.push(e.message));
  page.on("console", (m: { type(): string; text(): string }) => { if (m.type() === "error") errors.push(m.text()); });
  const cdp = await page.context().newCDPSession(page);
  await page.addInitScript("window.__name = (f) => f;"); // esbuild helper referenced inside evaluate callbacks
  await page.goto(`${srv.base}?level=L01&debug=${DEBUG}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window as unknown as { __sneakaboo?: unknown }).__sneakaboo, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  // time view.frame and host.tick (main-thread work per frame)
  await page.evaluate(() => {
    const w = window as unknown as PerfWin;
    w.__perf = { d: [], vf: [], tk: [], done: true, restarts: 0 };
    const host = w.__sneakaboo.host;
    const view = host.getView();
    const of = view.frame.bind(view);
    view.frame = (...a: unknown[]) => { const t0 = performance.now(); of(...a); w.__perf.vf.push(performance.now() - t0); };
    const ot = host.tick.bind(host);
    host.tick = (t: number) => { const t0 = performance.now(); ot(t); w.__perf.tk.push(performance.now() - t0); };
  });

  const measure = async (throttle: number, proj: string, reqZoom: number, profileOut: string | null): Promise<Run> => {
    await page.evaluate((p: string) => {
      const h = (window as unknown as PerfWin).__sneakaboo.host;
      if (h.getView().getProjection() !== p) h.toggleProjection();
      h.restart();
    }, proj);
    await page.evaluate((z: number) => {
      const v = (window as unknown as PerfWin).__sneakaboo.host.getView();
      v.skipIntro();
      v.setZoom(z);
    }, reqZoom);
    await page.waitForTimeout(1500); // zoom tween settles, caches fill
    if (profileOut) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.start"); }
    // Everything runs in-page (synthetic key events + rAF timing) so Node-side polling does not use the throttled CPU.
    await page.evaluate(({ secs, z }: { secs: number; z: number }) => {
      const w = window as unknown as PerfWin;
      w.__perf = { d: [], vf: [], tk: [], done: false, restarts: 0 };
      const held = new Set<string>();
      const key = (code: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, key: code, bubbles: true }));
      const hold = (codes: string[]) => {
        for (const c of [...held]) if (!codes.includes(c)) { key(c, false); held.delete(c); }
        for (const c of codes) if (!held.has(c)) { key(c, true); held.add(c); }
      };
      let dir = "KeyS";
      const steer = window.setInterval(() => {
        const host = w.__sneakaboo.host;
        const s = host.getWorld();
        if (s.status === "won" || s.status === "found" || s.status === "timeout") {
          hold([]);
          w.__perf.restarts++;
          host.restart();
          host.getView().skipIntro();
          host.getView().setZoom(z);
          return;
        }
        if (s.player.y > 12.2) dir = "KeyW"; else if (s.player.y < 3.6) dir = "KeyS";
        const codes = [dir];
        if (s.player.x < 2.2) codes.push("KeyD"); else if (s.player.x > 2.8) codes.push("KeyA");
        hold(codes);
      }, 50);
      let last = performance.now();
      const end = last + secs * 1000;
      const loop = (t: number) => {
        w.__perf.d.push(t - last);
        last = t;
        if (t < end) requestAnimationFrame(loop);
        else { w.__perf.done = true; window.clearInterval(steer); hold([]); }
      };
      requestAnimationFrame(loop);
    }, { secs: SECS, z: reqZoom });
    await page.waitForFunction(() => (window as unknown as PerfWin).__perf.done, null, { timeout: (SECS + 60) * 1000 });
    if (profileOut) {
      const { profile } = await cdp.send("Profiler.stop");
      fs.writeFileSync(profileOut, JSON.stringify(profile));
    }
    const m = await page.evaluate(() => {
      const w = window as unknown as PerfWin;
      const v = w.__sneakaboo.host.getView();
      return { ...w.__perf, zoom: v.getZoom(), sections: { ...v.getStats().sections } };
    });
    const d: number[] = m.d.slice(1);
    const total = d.reduce((a: number, b: number) => a + b, 0);
    return {
      fps: (d.length / total) * 1000,
      p50: q(d, 0.5),
      p95: q(d, 0.95),
      max: q(d, 1),
      frames: d.length,
      zoom: m.zoom,
      viewP50: q(m.vf, 0.5),
      viewP95: q(m.vf, 0.95),
      tickP50: q(m.tk, 0.5),
      restarts: m.restarts,
      sections: m.sections,
    };
  };

  for (const throttle of THROTTLES) {
    if (ONLY && ONLY !== `${throttle}x`) continue;
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    for (const proj of PROJS) {
      if (ONLY_PROJ && ONLY_PROJ !== proj) continue;
      for (const reqZoom of ZOOMS) {
        if (ONLY_ZOOM && Number(ONLY_ZOOM) !== reqZoom) continue;
        const runs: Run[] = [];
        for (let r = 0; r < REPEAT; r++) {
          const prof = PROFILE && throttle === 4 && r === 0 ? `${PROFILE}-${proj}-${reqZoom}.cpuprofile` : null;
          runs.push(await measure(throttle, proj, reqZoom, prof));
        }
        runs.sort((a, b) => a.fps - b.fps);
        const med = runs[Math.floor(runs.length / 2)]!;
        const row: Row = { ...med, throttle, proj, reqZoom, runs: runs.map((r) => +r.fps.toFixed(1)) };
        rows.push(row);
        console.error(`${throttle}x ${proj} z${reqZoom}: ${med.fps.toFixed(1)} fps (runs ${row.runs.join(", ")}), view p50 ${med.viewP50.toFixed(1)} ms`);
        if (VERBOSE) console.error("  sections (EMA ms):", Object.entries(med.sections).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(" "));
      }
    }
  }
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
} finally {
  await browser.close();
  await srv.close();
}

if (errors.length) console.log("page errors:", errors.slice(0, 5));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(rows, null, 1));
console.log(`\nL01, 1280x720 DPR 1, debug=1, ${SECS}s walking per run, median of ${REPEAT} runs\n`);
console.log("| CPU throttle | projection | zoom (requested -> clamped) | avg FPS | frame p50 ms | frame p95 ms | max ms | view.frame p50 / p95 ms | host.tick p50 ms | FPS of each run |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows) {
  console.log(`| ${r.throttle}x | ${r.proj} | ${r.reqZoom} -> ${r.zoom.toFixed(2)} | ${r.fps.toFixed(1)} | ${r.p50.toFixed(1)} | ${r.p95.toFixed(1)} | ${r.max.toFixed(1)} | ${r.viewP50.toFixed(1)} / ${r.viewP95.toFixed(1)} | ${r.tickP50.toFixed(1)} | ${r.runs.join(", ")} |`);
}
