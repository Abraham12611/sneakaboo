/**
 * End-to-end smoke: start the Vite dev server, open the game in headless Chromium,
 * walk the validated route of L01 with real keyboard events, and check the result.
 * Run: npx tsx tools/e2e/play-l01.ts   (needs spike/node_modules for Playwright)
 */
import { createServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { parseLevel } from "../../src/game/sim/levelSchema";
import { computeRoute } from "../validate-levels/validate";

const require = createRequire(path.resolve("spike/package.json"));
const { chromium } = require("playwright");

const OUT = path.resolve("docs/screenshots/p1-e2e");
fs.mkdirSync(OUT, { recursive: true });

const level = parseLevel(JSON.parse(fs.readFileSync("levels/L01.json", "utf8")));
const route = computeRoute(level) as { path?: { x: number; y: number }[]; length?: number } | null;
console.log("route keys:", route ? Object.keys(route) : null);

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: "error" });
await server.listen();
const addr = server.httpServer!.address();
const port = typeof addr === "object" && addr ? addr.port : 5199;
const base = `http://localhost:${port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors: string[] = [];
page.on("console", (m: { type(): string; text(): string }) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e: Error) => errors.push("pageerror: " + e.message));

const result: Record<string, unknown> = {};
try {
  await page.goto(`${base}?level=L01&debug=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window as unknown as { __sneakaboo?: unknown }).__sneakaboo, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "01-start.png") });

  const state = () =>
    page.evaluate(() => {
      const w = (window as unknown as { __sneakaboo: { host: { getWorld(): any; isPaused(): boolean } } }).__sneakaboo.host;
      const world = w.getWorld();
      return { x: world.player.x, y: world.player.y, status: world.status, timeLeft: world.timeLeft, room: world.currentRoom, paused: w.isPaused(), vis: world.roomVis, noise: world.noise.length };
    });

  const s0 = await state();
  result.start = s0;

  // Waypoint list: use the validator's route if it exposes tile centres, else a hand route for L01.
  const wps: { x: number; y: number }[] =
    (route && Array.isArray((route as any).path) && (route as any).path.length > 1
      ? (route as any).path.map((p: any) => ({ x: p.x + 0.5, y: p.y + 0.5 }))
      : [{ x: 8, y: 10.5 }, { x: 12, y: 10.5 }, { x: 12, y: 11 }, { x: 16, y: 10.5 }, { x: 24, y: 10.5 }]);

  const held = new Set<string>();
  const set = async (keys: string[]) => {
    for (const k of [...held]) if (!keys.includes(k)) { await page.keyboard.up(k); held.delete(k); }
    for (const k of keys) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
  };

  let shots = 0;
  const t0 = Date.now();
  let idx = 0;
  let last = await state();
  while (last.status !== "won" && Date.now() - t0 < 40000 && idx < wps.length) {
    const wp = wps[idx]!;
    const dx = wp.x - last.x, dy = wp.y - last.y;
    if (Math.hypot(dx, dy) < 0.35) { idx++; continue; }
    const keys: string[] = [];
    if (Math.abs(dx) > 0.2) keys.push(dx > 0 ? "KeyD" : "KeyA");
    if (Math.abs(dy) > 0.2) keys.push(dy > 0 ? "KeyS" : "KeyW");
    await set(keys);
    await page.waitForTimeout(40);
    last = await state();
    if (shots < 6 && Date.now() - t0 > (shots + 1) * 1800) { await page.screenshot({ path: path.join(OUT, `02-walk-${shots}.png`) }); shots++; }
  }
  await set([]);
  await page.waitForTimeout(400);
  const end = await state();
  result.end = end;
  result.walkedMs = Date.now() - t0;
  await page.screenshot({ path: path.join(OUT, "03-end.png") });

  // Zoom, projection toggle, peek, pause, restart
  await page.keyboard.press("Backquote");
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(300);
  const afterRestart = await state();
  result.afterRestart = { status: afterRestart.status, x: afterRestart.x, y: afterRestart.y };
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(80); }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "04-zoomed-out.png") });
  await page.keyboard.press("KeyP");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "05-topdown.png") });
  await page.keyboard.press("KeyP");
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(60); }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "06-zoomed-in.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  result.pausedAfterEsc = (await state()).paused;
  await page.screenshot({ path: path.join(OUT, "07-paused.png") });
} finally {
  result.errors = errors;
  await browser.close();
  await server.close();
}
console.log(JSON.stringify(result, null, 2));
