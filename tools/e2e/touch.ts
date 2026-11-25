/**
 * Touch/mobile e2e: emulate a phone in landscape, drive the floating joystick and pinch with real
 * touch events (CDP), check the rotate overlay in portrait. Run: npx tsx tools/e2e/touch.ts
 */
import fs from "node:fs";
import path from "node:path";
import { launchBrowser, startServer } from "./common";

const OUT = path.resolve("docs/screenshots/p1-touch");
fs.mkdirSync(OUT, { recursive: true });

const srv = await startServer(5198);
const browser = await launchBrowser();
const result: Record<string, unknown> = {};
const errors: string[] = [];
try {
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
  });
  const page = await ctx.newPage();
  page.on("console", (m: { type(): string; text(): string }) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e: Error) => errors.push("pageerror: " + e.message));
  const cdp = await ctx.newCDPSession(page);
  const touch = (type: string, pts: { x: number; y: number; id: number }[]) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id })) });

  await page.goto(`${srv.base}?level=L01&debug=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window as unknown as { __sneakaboo?: unknown }).__sneakaboo, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const state = () => page.evaluate(() => {
    const h = (window as unknown as { __sneakaboo: { host: { getWorld(): any; isPaused(): boolean; getView(): any } } }).__sneakaboo.host;
    const w = h.getWorld();
    return { x: w.player.x, y: w.player.y, gait: w.player.gait, status: w.status, paused: h.isPaused(), zoom: h.getView().getZoom() };
  });
  const dom = () => page.evaluate(() => ({
    buttons: Array.from(document.querySelectorAll("button, [role=button], [data-ctl]")).map((e) => (e.textContent || e.getAttribute("aria-label") || e.getAttribute("data-ctl") || "").trim()).filter(Boolean).slice(0, 20),
    canvas: !!document.querySelector("canvas"),
  }));

  result.dom = await dom();
  result.s0 = await state();
  await page.screenshot({ path: path.join(OUT, "01-landscape-start.png") });

  // Joystick: touch down in the left 40%, push right gently (sneak), medium (walk), far (run)
  const base = { x: 120, y: 290 };
  const push = async (dx: number, ms: number, label: string) => {
    await touch("touchMove", [{ x: base.x + dx, y: base.y, id: 1 }]);
    await page.waitForTimeout(ms);
    const s = await state();
    result[label] = { x: +s.x.toFixed(2), gait: s.gait };
  };
  await touch("touchStart", [{ ...base, id: 1 }]);
  const a = await state();
  await push(18, 700, "afterSneakPush");
  await push(40, 700, "afterWalkPush");
  await push(75, 700, "afterRunPush");
  await page.screenshot({ path: path.join(OUT, "02-joystick-running.png") });
  await touch("touchEnd", []);
  await page.waitForTimeout(300);
  const b = await state();
  result.movedRight = +(b.x - a.x).toFixed(2);

  // Pinch out (zoom in) with two fingers on the right half
  const z0 = (await state()).zoom;
  await touch("touchStart", [{ x: 520, y: 200, id: 2 }, { x: 600, y: 200, id: 3 }]);
  for (let i = 1; i <= 10; i++) {
    await touch("touchMove", [{ x: 520 - i * 8, y: 200, id: 2 }, { x: 600 + i * 8, y: 200, id: 3 }]);
    await page.waitForTimeout(30);
  }
  await touch("touchEnd", []);
  await page.waitForTimeout(500);
  const z1 = (await state()).zoom;
  result.zoomBeforeAfterPinchOut = [+z0.toFixed(3), +z1.toFixed(3)];

  // Portrait -> rotate overlay and auto pause
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  result.portrait = { ...(await state()), overlayText: await page.evaluate(() => document.body.innerText.slice(0, 120)) };
  await page.screenshot({ path: path.join(OUT, "03-portrait-overlay.png") });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(700);
  result.backToLandscape = await state();
  await page.screenshot({ path: path.join(OUT, "04-landscape-again.png") });
} finally {
  result.errors = errors;
  await browser.close();
  await srv.close();
}
console.log(JSON.stringify(result, null, 2));
