# P0.4 view and renderer spike: results

Throwaway prototype. Isolated Vite + TypeScript project (own `package.json`, `node_modules`, config). Nothing outside `spike/` was touched.

## How to run

```powershell
cd spike
npm install
npx playwright install chromium   # only needed for the benchmark / screenshots
npm run dev                        # = vite --host, http://localhost:5173
```

Phone test: `npm run dev` already exposes the LAN. Open `http://<your-PC-LAN-IP>:5173/` on a phone on the same Wi-Fi. The PC this was built on printed `http://192.168.0.198:5173/`. If it does not load, allow Node through Windows Firewall (private network). Add query parameters to the URL, for example `http://<ip>:5173/?renderer=canvas&proj=oblique&stress=1&debug=1`.

| Query | Values | Default |
|---|---|---|
| `renderer` | `pixi` / `canvas` | `pixi` |
| `proj` | `oblique` / `topdown` (also key **P** or the on-screen P button) | `oblique` |
| `stress` | `1` = +10 seekers with cones, +150 non-colliding props | off |
| `sprites` | `1` = load `art/p0-test/props/*.png` (served from `../art` by a dev-only Vite middleware); missing kinds fall back to placeholders | off |
| `debug` | `1` = debug overlay on at start (toggle with the backtick key) | off |
| `zoom` | initial zoom 0.6 to 1.8 (otherwise localStorage per device class: 1.0 desktop, 1.15 touch) | |
| `bot` | `1` = Pip walks a fixed route through both rooms and cannot be caught (used by the benchmark) | off |
| `aa` | `0` = Pixi antialiasing off | on |

Controls: WASD/arrows move, Shift sneak (1.8), default walk (3.0), Space run (4.6 tiles/s). Wheel, `+`/`-` keys, on-screen +/- and two-finger pinch zoom. Touch: floating joystick on the left half (tilt under 0.4 sneak, 0.4 to 0.85 walk, above 0.85 run). R or tap after "FOUND YOU" retries. P switches projection. Backtick toggles the debug overlay.

Other commands: `npm run typecheck`, `npm run build` (type-check + production build), `npm run bench` (needs the dev server up; `SPRITES=1` for the sprite variant), `npm run shots` (`node bench/shots.mjs pixi|canvas`). `node bench/touchtest.mjs` is a scripted touch/pinch/keyboard smoke test.

## What was built (maps to P0.4.1 to P0.4.7 and the 11-point brief)

- `src/sim/`: DOM-free sim. Flat tile grid, fixed 60 Hz step, circle-vs-grid collision with wall sliding (push-out), DDA raycast on a `sight` grid (walls and wardrobes block), seeker waypoint patrols, vision cones (max 48 rays, polygon computed in flat space), detection meter (never faster than 0.6 s), start safe zone, noise rings, room visited state. No view or camera import.
- `src/view/projection.ts`: `Projection` interface, `ObliqueProjection` (`sx = x*T`, `sy = y*T*K - z*H`, T=64, K=0.85, 1 z unit = 64 px, wall 1.6 tiles) and `TopDownProjection`. Switchable at runtime.
- `src/view/scene.ts`: one scene builder that turns sim state into renderer-agnostic draw commands (`cmds.ts`). Draw order: floor, decals (rugs, soft shadows), cones, noise rings, then standers sorted by baseline y (wall tiles, door, props, Pip, seekers), fog overlays, bubbles, HUD. Occlusion fade (to 35% alpha, within 2.2 tiles, smoothed over about 70 ms so it does not pop) plus a white silhouette outline for Pip when covered. Fog of war (visible / remembered 45% dim and desaturated / unknown near-black with room name), seekers hidden unless their room is visible, threat arrows for seekers within 10 tiles that are off-screen or in a hidden room.
- `src/view/canvasRenderer.ts` and `pixiRenderer.ts`: two implementations of one `Renderer` interface, same command list. Canvas uses a real radial gradient for cones. Pixi uses 5 nested scaled polygons (banded approximation).
- `src/view/manifest.ts`: per-kind procedural draw function plus a sprite spec (anchor, width, y-offset). `?sprites=1` swaps the procedural boxes for PNGs without touching sim or scene code.
- `src/view/camera.ts`: damped follow (0.15 s), look-ahead 1.5 tiles, deadzone 1.5 tiles, clamp to level plus 1 tile margin (top margin = wall height in oblique), centered when the level fits, smooth zoom (about 0.2 s), zoom 0.6 to 1.8.
- `src/input.ts`: keyboard, wheel, pointer-event touch joystick with tilt gaits, pinch, on-screen buttons. Logical viewport 1280x720, letterboxed 16:9 fit, devicePixelRatio capped at 2.
- Scene: 2 rooms joined by a 2-tile doorway; bed (2x1), wardrobe (2x1), table with tablecloth (2x2 and 2x1), sofa (3x1), plant, door leaf, rugs.

## Pass table (plan/01)

| Check | Pass criterion | Result | Verdict |
|---|---|---|---|
| Frame rate, mid-range phone, 1 room + 3 seekers | 50+ FPS (30 minimum) | **Not measured on a phone.** Laptop headless Chromium with real GPU (Intel UHD, D3D11): 59 to 60 FPS for every renderer and projection. With 4x CPU throttling (approximation of a mid-range phone, main thread only): **Canvas 46 to 57 FPS** (pass), **Pixi 16.5 FPS oblique / 22 to 29 FPS top-down** (fail in the current naive form). See benchmark. | **Canvas: provisional pass. Pixi: fail as written, fixable (see risks). Real phone test still required.** |
| Occlusion fade with 10 overlapping props | No flicker or pop | Fade is smoothed per object and keyed by stable ids, so no pop was seen in the screenshots or the 150-prop stress run (`screenshots/pixi-oblique-occlusion.png`). A deliberate 10-overlapping-props arrangement was not built. The overlap test uses coarse bounding boxes, so a sprite with a lot of transparent area can fade when Pip is not really covered. | **Provisional pass** |
| Cones look right against walls in oblique | Visually aligned with gameplay | Cones are computed in flat space with the same DDA grid used for detection, then projected, so alignment holds by construction. Screenshots show cones ending on wall bases and the wardrobe. A tall wall front face drawn over the cone is correct occlusion. Detection and drawing use the same polygon (drawn at the sim tick position, up to one frame behind the interpolated seeker sprite). | **Pass** |
| Art: 12 props + Pip in 8 directions, at least 80% usable | pending art agent | The art agent's props (`art/p0-test/props`, 11 PNGs) load through the manifest and sit correctly in the oblique scene (`screenshots/pixi-oblique-sprites.png`). Sprite sizes were not matched to footprints (sofa sprite is 2 tiles on a 3-tile footprint). Pip 8-direction art was not tested; Pip and seekers are procedural. | **pending art agent** |
| Dev effort to finish the oblique pipeline | Fits in P1 (1.5 days) | The oblique-specific code is small: projection (about 30 lines), box emitter, baseline sort, fade, fog overlay. The spike's sim/view split meant top-down came free. Remaining for P1: real sprite slicing for large props, pixel-accurate occlusion, door/hiding states, lights. | **Fits P1 if art passes. Estimate 1.5 days for the pipeline, plus art-dependent work.** |

Two of five checks are not yet measured on real hardware (phone FPS, art). Neither has failed. The fallback trigger (two or more failures) is not hit.

## Benchmark (P0.4.8)

Method: Playwright 1.65 + Chromium headless, viewport 1280x720, DPR 1, `?bot=1` so Pip walks through both rooms, 2.5 s warm-up (times the throttle factor), then 10 s recording per row. GPU: ANGLE/D3D11 on Intel UHD Graphics (real GPU, not SwiftShader). Throttled rows use CDP `Emulation.setCPUThrottlingRate` = 4. Frame times come from `requestAnimationFrame` deltas, so **FPS is capped at 60 by vsync**. "JS work" is main-thread time per frame for sim + scene build + renderer submit. It is the number to watch for headroom. Normal = 3 seekers, 12 props. Stress = 13 seekers with cones, 162 props. Draw calls: real GL draw calls for Pixi (patched `drawElements`/`drawArrays`), canvas fill/stroke operations for Canvas.

Raw files: `bench/results.md`, `bench/results.json`, `bench/results-sprites.md`, `bench/results-sprites.json`.

### Placeholder art (procedural boxes)

| CPU | mode | renderer | projection | avg FPS | frame mean ms | frame p95 ms | JS work mean ms | JS work p95 ms | cmds | draw calls |
|---|---|---|---|---|---|---|---|---|---|---|
| 1x | normal | pixi | oblique | 59.8 | 16.7 | 16.7 | 9.52 | 15.2 | 206 | 8 |
| 1x | normal | pixi | topdown | 59.8 | 16.7 | 16.7 | 7.36 | 14 | 103 | 8 |
| 1x | normal | canvas | oblique | 59.1 | 16.9 | 16.8 | 2.47 | 4.2 | 205 | 257 |
| 1x | normal | canvas | topdown | 57.1 | 17.5 | 33.2 | 1.9 | 3.3 | 104 | 174 |
| 1x | stress | pixi | oblique | 52.4 | 19.1 | 33.4 | 17.02 | 26.8 | 561 | 8 |
| 1x | stress | pixi | topdown | 57.9 | 17.3 | 16.8 | 13.92 | 21.1 | 213 | 8 |
| 1x | stress | canvas | oblique | 59.1 | 16.9 | 16.8 | 3.48 | 5.1 | 561 | 613 |
| 1x | stress | canvas | topdown | 51.2 | 19.5 | 33.4 | 2.83 | 4.5 | 214 | 369 |
| 4x | normal | pixi | oblique | 16.6 | 60.2 | 100 | 48.8 | 87.2 | 221 | 8 |
| 4x | normal | pixi | topdown | 21.9 | 45.6 | 66.8 | 36.9 | 58.4 | 101 | 8 |
| 4x | normal | canvas | oblique | 46.1 | 21.7 | 33.4 | 14.59 | 23.7 | 259 | 331 |
| 4x | normal | canvas | topdown | 49.3 | 20.3 | 33.4 | 13.09 | 20.4 | 106 | 176 |
| 4x | stress | pixi | oblique | 5.2 | 191.2 | 366.6 | 182.6 | 343 | 615 | 8 |
| 4x | stress | pixi | topdown | 8.5 | 118.3 | 333.4 | 112.18 | 321.1 | 229 | 8 |
| 4x | stress | canvas | oblique | 12.3 | 81.4 | 150 | 67.74 | 130.1 | 629 | 675 |
| 4x | stress | canvas | topdown | 26.8 | 37.3 | 66.7 | 29.34 | 50.3 | 204 | 349 |

### Real sprites (`?sprites=1`, art/p0-test/props)

| CPU | mode | renderer | projection | avg FPS | frame mean ms | frame p95 ms | JS work mean ms | JS work p95 ms | cmds | draw calls |
|---|---|---|---|---|---|---|---|---|---|---|
| 1x | normal | pixi | oblique | 59 | 16.9 | 16.8 | 7.52 | 11.9 | 163 | 12 |
| 1x | normal | pixi | topdown | 59.5 | 16.8 | 16.8 | 5.2 | 9.4 | 89 | 12 |
| 1x | normal | canvas | oblique | 59.3 | 16.9 | 16.8 | 2.03 | 3.1 | 162 | 214 |
| 1x | normal | canvas | topdown | 60 | 16.7 | 16.7 | 1.4 | 2.1 | 89 | 138 |
| 1x | stress | pixi | oblique | 59.5 | 16.8 | 16.7 | 12.76 | 17.8 | 388 | 20 |
| 1x | stress | pixi | topdown | 59 | 16.9 | 16.8 | 10.62 | 17.6 | 199 | 20 |
| 1x | stress | canvas | oblique | 51.5 | 19.4 | 33.4 | 3.48 | 5.3 | 387 | 439 |
| 1x | stress | canvas | topdown | 48.4 | 20.7 | 33.4 | 2.86 | 4.5 | 199 | 253 |
| 4x | normal | pixi | oblique | 16.5 | 60.6 | 116.7 | 53.04 | 109.9 | 247 | 16 |
| 4x | normal | pixi | topdown | 28.5 | 35.1 | 66.6 | 27.85 | 47.9 | 94 | 14 |
| 4x | normal | canvas | oblique | 56.8 | 17.6 | 16.8 | 9.59 | 16.9 | 166 | 218 |
| 4x | normal | canvas | topdown | 55.4 | 18 | 33.3 | 9.73 | 15.9 | 88 | 137 |
| 4x | stress | pixi | oblique | 7.7 | 129.4 | 250 | 120.94 | 239.9 | 450 | 16 |
| 4x | stress | pixi | topdown | 12.9 | 77.5 | 133.4 | 68.82 | 123.7 | 206 | 20 |
| 4x | stress | canvas | oblique | 15.3 | 65.4 | 133.4 | 46.49 | 100.1 | 472 | 540 |
| 4x | stress | canvas | topdown | 11.6 | 86 | 150 | 61.27 | 112.1 | 233 | 307 |

### Reading the numbers

- On an unthrottled laptop everything holds 60 FPS; the stress canvas/top-down and Pixi/oblique rows dip to 48 to 52 FPS from occasional 33 ms frames (p95), not from sustained load.
- Main-thread cost, normal scene, 1x: Canvas 1.4 to 2.5 ms, Pixi 5.2 to 9.5 ms. Pixi is 3 to 4 times more expensive here because it rebuilds a `Graphics` (triangulation and batch build) from about 200 commands every frame. Its measured split on the laptop: about 1.5 to 5 ms Graphics build plus about 3 to 5 ms in `app.render`. GL draw calls are tiny (8 to 20), so the GPU side is not the problem; the CPU-side geometry rebuild is.
- With 4x CPU throttle (rough mid-range phone proxy), Canvas normal stays at 46 to 57 FPS. Pixi normal drops to 16.5 FPS (oblique) and 22 to 29 FPS (top-down). Stress mode with 13 seekers and 162 props is below 30 FPS for both renderers under throttle (Canvas 11.6 to 27 FPS, Pixi 5 to 13 FPS). Stress is a limit test, not a target.
- Oblique costs about 1.3 to 2 times more commands than top-down (it draws extra front faces) and shows in the throttled Pixi numbers. Canvas oblique and top-down are within about 10% of each other in the normal scene.
- Sprites mode moves props from many vector polygons to fewer image draws. It helps Pixi a little in normal mode and does not fix the per-frame Graphics rebuild for floor, walls, cones and characters.

**These are headless-laptop approximations.** CPU throttling slows the main thread only, not the GPU, memory bandwidth, thermal limits or iOS Safari. Canvas 2D fill-rate at DPR 2 to 3 on a real phone is not represented (this run used DPR 1). A real-phone test is still required (P0.4.8 is not complete until it is done).

## Recommendations

### D-001 view: keep **oblique** as the target, top-down stays the one-key fallback

- Rendering oblique costs a little more than top-down but fits the budget in the canvas path (46 to 57 FPS at 4x throttle). Cone alignment, occlusion fade, fog and the sprite swap all work in oblique. Sim and levels are untouched by the switch (`P` key or `?proj=`), so the fallback is free.
- Conditions before locking: (1) phone FPS on at least one real mid-range Android and one iPhone, (2) the art agent's Pip/props pass the 80% usable check at the same angle. If both fail, switch to top-down; do not mass-produce art before that.

### D-004 renderer: **Canvas 2D for P1, behind the existing `Renderer` interface**; keep the Pixi adapter, revisit when lighting is needed

- Measured: Canvas uses 3 to 4 times less main-thread time than the current Pixi adapter, is about 15 KB gzip total versus about 180 KB gzip with Pixi, and has no bundling risk. This game's view is mostly flat vector shapes, a few sprites and translucent overlays, which Canvas 2D handles well at this scale.
- Caveats in favor of Pixi that this spike did **not** test: sprite-heavy scenes with pooled `Sprite`s (not `Graphics`), dark-level lighting and fog filters, masks, and high DPR on phones. The Pixi adapter here is the naive path. If it were rebuilt with pooled sprites and cached static geometry (floor, walls) it would likely beat its current numbers, but that is unproven.
- Decision rule: if the real-phone Canvas test at DPR 2 holds 50+ FPS in the normal scene, take Canvas 2D. If it drops below 40 FPS, or the dark-level lighting spec needs filters, switch to Pixi and spend the P1 time on sprite pooling. The interface makes that a contained change (one file).

## Bundle sizes (production build, gzip)

| Path | Chunks loaded | gzip |
|---|---|---|
| Canvas renderer | `index` (sim + view + input + main) 13.3 KB, `canvasRenderer` 1.1 KB, html 0.5 KB | **about 15 KB** |
| Pixi renderer | `index` 13.3 KB, `pixiRenderer` 86.9 KB, `Geometry` 35.4 KB, `RenderTargetSystem` 22.3 KB, `browserAll` 11.3 KB, `init` 4.8 KB, `getTexelRangeRects` 3.0 KB, `canvasUtils` 2.1 KB, small stubs, html | **about 180 KB** (Pixi itself about 165 KB) |

The renderer is loaded with a dynamic `import()`, so the Canvas path never downloads Pixi. Pixi v8 (8.23) built with Vite 8 and Rolldown without any config. Base44's own Vite pipeline was not tested here (P0.3.6 covers that).

## Risks and gotchas found

1. **Pixi `Graphics` rebuilt every frame is the main cost** (see numbers). A real Pixi implementation needs pooled sprites, cached static geometry and no per-frame vector rebuild. Budget this in P1 if Pixi is chosen.
2. **Pixi v8 bundling:** works out of the box with Vite, but pulls about 165 KB gzip even with `preference: 'webgl'`. Text uses a pooled `Text` per label; changing the string or style each frame regenerates a texture, so only change it when needed.
3. **Sort order:** sorting by baseline y (bottom edge of the footprint) is fine for 1-row props and characters. A wide or deep prop overlapping a character diagonally (sofa 3x1, table 2x2) can sort wrongly; real art for large props may need slicing or a sort split. Ties between a wall tile and a character on the same baseline are resolved by insertion order (walls first).
4. **Occlusion fade uses bounding boxes.** With sprites that have big transparent corners it fades too often. Needs a per-sprite alpha mask or a tighter hit rectangle. Occlusion for seekers (fade things in front of them) is not implemented; only Pip gets the outline.
5. **Tall walls hide 2 floor rows behind them** at 1.6 tiles high. The south outer wall is drawn as a low cutaway (0.45 tile). West and east wall sides are edge-on in this projection and invisible; wall cap outlines carry the look. Doorway jambs work.
6. **Cone cost:** the 48-ray DDA for 13 seekers is negligible (well under 0.2 ms). Drawing is what costs: Canvas uses one gradient fill per cone, Pixi needs 5 banded fills per cone. The cone gradient is a circle, not squashed by K, so in oblique the far tip is slightly lighter than the sides. The cone polygon is from the last sim tick while the seeker sprite is interpolated, up to 1 frame of mismatch.
7. **Headless FPS is capped at the 60 Hz rAF**; use "JS work" for headroom. SwiftShader (software GL) gave 4 FPS for Pixi in a first run and is not representative; the final runs used the real Intel GPU through ANGLE/D3D11. Override with `GL=swiftshader`.
8. **iOS Safari was not tested.** Things to check: pointer events with `touch-action: none` and pinch, rubber-band scrolling (CSS `overscroll-behavior` is set but iOS ignores parts of it), `innerHeight` changes when the URL bar moves (the layout recomputes on `resize`), WebGL context loss when the tab backgrounds (Pixi only), canvas memory at DPR 2 (capped), no safe-area insets are applied yet (the viewport meta has `viewport-fit=cover`), no audio so no unlock needed yet.
9. **Not implemented in the spike:** peek, camera shake, level intro pan, minimap, dotted patrol paths, hiding, A* seeker pathing (patrols are straight waypoint lines through free cells), settings slider for zoom. Furniture-based cover was out of scope.
10. **Sprite mode caveats:** sprite widths come from the art manifest (screen width at zoom 1) but footprints are fixed in the level, so some sprites are smaller than their collision box (sofa 2 vs 3 tiles, wardrobe 1 vs 2). The level JSON should store footprint per art asset. The sprite loader matches file names by substring plus a few aliases (crate to chest, box to nightstand, stool to armchair, pot to plant) so the stress props have art.
11. **Tooling:** the `npm install` pulled TypeScript 7 (native `tsc`), Vite 8 and Playwright 1.65; `npx tsc --noEmit` is clean under `strict` and `noUnused*`. `localStorage` zoom persistence is per device class (touch vs desktop).
12. **LAN access:** `vite --host` binds all interfaces. On Windows the firewall can block a phone; allow Node on private networks.

## Screenshots (`spike/screenshots/`)

`pixi-{oblique,topdown}-z{0.6,1,1.8}.png` and `canvas-{oblique,topdown}-z{0.6,1,1.8}.png` (Pip in the bedroom next to the doorway, Seeker cones visible, living room under fog), `*-remembered.png` (living room visited then left: dimmed, no characters), `pixi-oblique-occlusion.png` (table faded to 35% with Pip silhouette outline), `pixi-{oblique,topdown}-sprites.png` (real art). Seekers are walking, so cone positions differ between shots.
