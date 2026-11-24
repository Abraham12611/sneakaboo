// P0.4.8: headless FPS / frame-time benchmark. Usage: node bench/bench.mjs [seconds=10]
// Needs `npm run dev` (or `npm run preview` with BASE=http://localhost:4173) running.
import fs from 'node:fs';
import { launch, open, stats } from './common.mjs';

const SPR = process.env.SPRITES === '1';
const TAG = SPR ? '-sprites' : '';
const SECONDS = Number(process.argv[2] || 10);
const rows = [];
const browser = await launch();
for (const throttle of [1, 4]) {
  for (const stress of [0, 1]) {
    for (const renderer of ['pixi', 'canvas']) {
      for (const proj of ['oblique', 'topdown']) {
        const q = `renderer=${renderer}&proj=${proj}&bot=1${stress ? '&stress=1' : ''}${SPR ? '&sprites=1' : ''}`;
        const { ctx, page, errors } = await open(browser, q, { throttle });
        await page.waitForTimeout(2500 * throttle);
        await page.evaluate(() => window.__spike.startRecord());
        await page.waitForTimeout(SECONDS * 1000);
        const d = await page.evaluate(() => ({ ...window.__spike.stopRecord(), st: window.__spike.renderer.stats(), cmds: window.__spike.scene.lastStats.cmds, seekers: window.__spike.sim.seekers.length, props: window.__spike.sim.level.props.length }));
        const f = stats(d.frame), w = stats(d.work);
        const totalSec = d.frame.reduce((a, b) => a + b, 0) / 1000;
        const row = {
          throttle, stress, renderer, proj, seekers: d.seekers, props: d.props, frames: d.frame.length,
          fps: +(d.frame.length / totalSec).toFixed(1), frameMean: +f.mean.toFixed(1), frameP95: +f.p95.toFixed(1), frameMax: +f.max.toFixed(0),
          workMean: +w.mean.toFixed(2), workP95: +w.p95.toFixed(2), cmds: d.cmds, drawCalls: d.st.drawCalls, errors: errors.length,
        };
        rows.push(row);
        console.log(JSON.stringify(row));
        await ctx.close();
      }
    }
  }
}
await browser.close();
fs.writeFileSync(new URL(`./results${TAG}.json`, import.meta.url), JSON.stringify(rows, null, 1));
const md = ['| CPU | mode | renderer | projection | avg FPS | frame mean ms | frame p95 ms | JS work mean ms | JS work p95 ms | cmds | draw calls |', '|---|---|---|---|---|---|---|---|---|---|---|'];
for (const r of rows) md.push(`| ${r.throttle}x | ${r.stress ? 'stress' : 'normal'} | ${r.renderer} | ${r.proj} | ${r.fps} | ${r.frameMean} | ${r.frameP95} | ${r.workMean} | ${r.workP95} | ${r.cmds} | ${r.drawCalls} |`);
fs.writeFileSync(new URL(`./results${TAG}.md`, import.meta.url), md.join('\n') + '\n');
console.log(md.join('\n'));
