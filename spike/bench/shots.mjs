// Saves screenshots into spike/screenshots: oblique + topdown at zoom 0.6 / 1.0 / 1.8, fog + cones visible.
import { launch, open } from './common.mjs';

const browser = await launch();
const out = new URL('../screenshots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const renderer = process.argv[2] || 'pixi';
for (const proj of ['oblique', 'topdown']) {
  for (const zoom of [0.6, 1.0, 1.8]) {
    const { ctx, page, errors } = await open(browser, `renderer=${renderer}&proj=${proj}&zoom=${zoom}&debug=1`);
    // put Pip in room A near the door, seeker 'Gus' cone is in view, room B is "unknown" (fog)
    await page.evaluate(() => { window.__spike.god(); window.__spike.teleport(11.5, 6.5); });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${out}${renderer}-${proj}-z${zoom}.png` });
    if (errors.length) console.log(proj, zoom, 'ERRORS', errors);
    await ctx.close();
  }
}
// remembered-room shot: walk into room B then back
for (const proj of ['oblique', 'topdown']) {
  const { ctx, page } = await open(browser, `renderer=${renderer}&proj=${proj}&zoom=1&debug=1`);
  await page.evaluate(() => { window.__spike.god(); window.__spike.teleport(19, 7); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__spike.teleport(13, 7); });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}${renderer}-${proj}-remembered.png` });
  await ctx.close();
}
// occlusion fade: Pip standing just north of the table (table is in front of him)
{
  const { ctx, page } = await open(browser, `renderer=${renderer}&proj=oblique&zoom=1.8&debug=1`);
  await page.evaluate(() => { window.__spike.god(); window.__spike.teleport(7.0, 5.35); });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}${renderer}-oblique-occlusion.png` });
  await ctx.close();
}
await browser.close();
console.log('done');
