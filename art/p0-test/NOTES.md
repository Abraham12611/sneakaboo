# P0.6 test notes (2026-11-24)

## Folder map
| Path | What |
|------|------|
| `props/*.png` | 12 final props, transparent, trimmed, stored at 2x. `props/manifest.json` has sizes and anchors. |
| `characters/{pip,gus}_{S,SE,E,NE,N}.png` | Technique A (turnaround sheet, cropped). 288 px tall, shared canvas, pivot bottom center. |
| `characters/techB/` | Technique B (edit models) Pip outputs: `pip_ref_S` (reference), `pipB_gpt_*` (gpt-image-2.6 edit, transparent), `pipB_nb_*` (nano-banana-2.1 edit, white background, not keyed). |
| `walk/pip_S_walk_01..06.png`, `walk/pip_S_walk_strip.png` | Walk strip test from gpt-image-2.6 (cut from one 6-frame generation, same crop box per frame so the generator's own vertical motion is kept). |
| `walk/pip_S_walk_strip_nanobanana_whitebg.png` | Same test with nano-banana-2.1 edit using the single Pip as reference. White background. |
| `composite_test_room.png` | Test room, 1088x608, 1 tile = 64 px, K = 0.85, y-sorted. |
| `compare_mockup04_vs_composite.jpg` | Mockup 04 (left) and the composite (right). |
| `audio/` | 6 SFX + 30 s music (mp3). |
| `raw/` | Palette-compressed originals from the models (input of `art/tools/build.js`). |
| `../tools/` | Isolated Node project (`sharp`). `node build.js` rebuilds props, characters, walk strips and the composite from `raw/`. `node sheet.js out.png cell in1 in2 ...` makes a contact sheet. |

## Models and jobs
| Use | Endpoint | Jobs |
|-----|----------|------|
| Props, sheets, walk strip, floor, wall | `openai/gpt-image-2.6/sunburst/text-to-image` | 4 + 8 + 1 (painting) + 2 sheets + 2 single refs + 1 strip + floor + wall = 20 |
| Direction edits (technique B) | `openai/gpt-image-2.6/sunburst/edit` | 4 |
| Direction edits (technique B), walk strip | `google/nano-banana-2.1/edit` | 4 + 1 |
| SFX | `elevenlabs/sound-effects/v3` | 6 |
| Music | `elevenlabs/music/v2.5` | 1 |
Total: 29 image jobs and 7 audio jobs. No job failed. The first bed (single-width) was replaced by a second generation (kept: `raw/bed_double.v2.png`; the first file was overwritten by mistake during download, it only appears in the count).

## Floor and wall prompts (opaque, 1024x1024 and 1536x512, quality medium)
- Floor: `A seamless tileable floor texture for a cozy game room: warm amber wooden floorboards running horizontally, flat cel-shaded cartoon style, soft 2 to 3 tone shading, thin dark brown (#3A2418) plank gaps, subtle wood grain, seen from a high-angle oblique view, uniformly lit, no shadows, no objects, no text, fills the entire image edge to edge, tiles seamlessly.`
- Wall: `A flat front-view segment of a cozy interior back wall for a game room, flat cel-shaded cartoon style with 3px dark brown (#3A2418) outlines, soft 2 to 3 tone shading: warm peach-cream wallpaper with a subtle small pattern on the upper part, a wooden wainscoting panel band in the lower third, a wooden baseboard at the bottom edge, a thin wooden crown molding at the top edge. Straight on orthographic view, no furniture, no objects, no text, fills the whole image edge to edge, can be tiled horizontally.`
The floor is not truly seamless: the composite scales it to 256x218 tiles and a few plank seams show. The wall is tileable in practice (repeated 2.5 times).

## Composite layout rules used
`sx = ox + x*64`, `sy = floorTop + y*64*0.85`. Sprites are bottom-centered at (sx, sy). Draw order: wall, floor, rug (floor decal), then everything else sorted by baseline y, soft ellipse shadow under each standing item, painting on the wall. Pip (76 px tall) and Gus (94 px tall) are drawn with the `S` and `SE` sprites.

## What I could not check
- Audio was not listened to (no audio playback here). I only checked that files exist, sizes, and durations from the requested lengths. Loudness is not normalized, loop seam of the music is untested, and the music has an intro/outro that may not loop cleanly. Treat all audio as unreviewed.
- Phone frame rate and real Pixi rendering were not tested (this is P0.4's job).
- Image jobs had no price in `get_pricing` (it returned a placeholder of "1 unit"). Check the fal billing page for real spend.

