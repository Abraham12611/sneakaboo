# 06 Art Pipeline (Oblique Look)

Goal: produce **consistent** sprites in the mockup-04 look at manageable cost and speed. Consistency (camera angle, light direction, outline weight, palette) matters more than detail.

## Style lock (done in P0.6 before any production art)
| Property | Spec |
|----------|------|
| Camera | Pitch about 60 degrees, no perspective convergence (orthographic) |
| Light | Warm key light from top-left, soft ambient shadow below-right |
| Outline | 3 px dark brown (#3A2418), uniform |
| Shading | Soft cel shading, 2 to 3 tones, no photoreal textures |
| Palette | Warm interiors (see `docs/10-art-audio-direction.md`), cool exteriors |
| Scale | 1 tile = 64 px wide at zoom 1.0. A bed is about 2x3 tiles on the floor. A wardrobe is 1 tile wide, 2 tiles tall on screen. Pip stands about 0.8 tile tall (1.1 tile with the hood shadow). |
| Reference | `mockups/04-inspect-painting-key.png` (look), `mockups/02-level1-gameplay.png` (HUD), `mockups/07-seeker-characters.png` (characters) |

Produce a **Style Bible** page (one image + one markdown) with: reference sprites, palette hex values, do and don't examples. Every later prompt starts from this.

## Production flow
1. **Prompt** with fal `openai/gpt-image-2.6/sunburst/text-to-image`, using fixed prefix: "Game sprite, oblique 60-degree high-angle view, orthographic, flat cel shading, 3px dark brown outline, warm top-left light, transparent background, centered, no ground shadow".
2. Generate **sheets** (a grid of 8 to 12 objects) to keep style consistent per batch, `background: transparent`, PNG.
3. **Slice** with a tool (`tools/slice-sheet`): detect connected components, crop, trim, name by manifest.
4. **QA each sprite**: angle matches, outline OK, no stray text, scale fits. Reject and regenerate otherwise. Log accepted sprites in `public/assets/manifest.json`.
5. **Pack** into atlases per zone (`tools/pack-atlas`): 2048x2048 max, WebP + PNG fallback.
6. **Shadow and baseline metadata:** for each sprite store `anchor` (baseline point), `footprint` (tiles), `height`, and `hideEntry` points.
7. **Credits:** write `CREDITS.md` entries (model, date, prompt id).

Alternative if the AI sprites drift: keep the generated set as concept, and create final furniture with simple vector shapes through code (rounded rectangles with gradient and outline) in the same palette. Uses less art budget, still consistent.

## Characters (oblique 8-direction)
| Character | Animations |
|-----------|-----------|
| Pip | idle, sneak (crouch walk), walk, run, search (hands up), hide enter/exit, found (surprised), win (cheer), potion drink |
| Seekers | walk, idle look (left/right), suspicious (hand to ear), search (bend down), chase, sleep (zzz), found-pose (pointing, laughing) |
- 8 directions: use **4 directions mirrored** where possible (left-right flip) to halve the work: N, NE, E, SE, S with mirrored W sides. 5 sprites per animation.
- Frame budget: walk 6, run 6, idle 4, special 4 to 6.
- **Generation approach:** generate a single character turnaround (front, back, side, 3/4) first. Use the image-edit model for consistent poses. For animation frames, generate a strip of 6 and hand-pick. Accept small flaws. **If drift is too large:** build characters from layered parts (body, head, hood, arms, legs) and animate in code (skeletal animation with a few joints), which gives perfect consistency. Decide in P0.4.
- Top-down fallback: separate set (flat plan view), see Robbery Bob refs.

## Asset list (Tier 1, contest build)
| Group | Count | Items |
|-------|-------|-------|
| Floors | 8 | wood, dark wood, kitchen tile, carpet, creaky wood, grass, stone path, bathroom tile |
| Walls | 6 | interior wall top + face, exterior wall, window wall, door frames (3 colors), half wall |
| Doors | 8 | closed, open, locked bronze/silver/gold, jammed, exit (green glow) |
| Furniture | 50 | sofa, armchair, dining table + chairs, coffee table, bed, nightstand, dresser, wardrobe, closet, bookshelf, desk, fridge, stove, counter, sink, bathtub, toilet, piano, chest, box, barrel, crate, laundry basket, toy chest, lamp, plants (2), rugs (4), paintings (4), mirror, curtains (2), clock, fireplace, TV unit, shoe rack, coat stand, car (garage level) |
| Items | 20 | icons from `mockups/05-items-sheet.png` (potion, keys, radio, toy, slippers, teddy, stopwatch, map, coin, trophy, flashlight, treat) |
| Characters | 7 | Pip, Grandma Gus, Uncle Marlo, Tilly, Tobi, Biscuit, Sprinter |
| FX | 12 | dust puff, noise ring, sparkle, confetti, ?, !, zzz, magnifier, potion shimmer, door swing, search ring, drawer slide |
| UI | 40 | buttons, icons, meter frames, panels (partly from CSS/SVG, not AI) |
Tier 2 adds mansion furniture, haunted decor, museum, tower, remaining seekers.

## UI art
- Build UI from **SVG and CSS** (React) for sharpness and small size. Use AI art only for hero screens (title, key art, level-select background).
- Fonts: choose a free-license rounded display font (e.g. an OFL font). Record the license in `CREDITS.md`.

## Audio pipeline
- Generate SFX and music with fal audio models or use CC0 packs; record licenses.
- Normalize to -16 LUFS, trim silence, export `.ogg` and `.mp3`, mono for SFX.
- Target total audio under 3 MB for first load.

## Acceptance (P4.1)
- [ ] Style bible approved by the owner.
- [ ] A test room with 12 props + Pip + Grandma looks like mockup 04 side by side.
- [ ] All Tier 1 assets listed and tracked in `manifest.json`.
- [ ] Atlas size under 3 MB for zone 1.
