import { launch, open } from './common.mjs';
const browser = await launch();
for (const proj of ['oblique','topdown']) {
const { ctx, page, errors } = await open(browser, `renderer=pixi&proj=${proj}&sprites=1&zoom=1&debug=1`);
await page.evaluate(() => { window.__spike.god(); window.__spike.teleport(9.5, 5); });
await page.waitForTimeout(2500);
await page.screenshot({ path: new URL(`../screenshots/pixi-${proj}-sprites.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
console.log(errors); await ctx.close(); }
await browser.close();
