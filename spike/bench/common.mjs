import { chromium } from 'playwright';

export const BASE = process.env.BASE || 'http://localhost:5173';
// default: real GPU via ANGLE/D3D11 (Intel UHD on the test laptop). GL=swiftshader forces software GL.
export const ARGS = process.env.GL === 'swiftshader'
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  : ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'];

export async function launch() {
  return chromium.launch({ headless: true, args: ARGS });
}

export async function open(browser, query, { throttle = 1, width = 1280, height = 720 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (throttle > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }
  await page.goto(`${BASE}/?${query}`);
  await page.waitForFunction(() => window.__spike && window.__spike.sim, null, { timeout: 30000 });
  return { ctx, page, errors };
}

export function stats(a) {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  const mean = s.reduce((p, c) => p + c, 0) / n;
  const pct = (p) => s[Math.min(n - 1, Math.floor(p * n))];
  return { n, mean, p50: pct(0.5), p95: pct(0.95), max: s[n - 1] };
}
