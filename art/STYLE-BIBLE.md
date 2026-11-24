# Sneakaboo Style Bible (P0.6 draft, pending owner approval)

Visual reference sheet: `art/style-bible-sheet.png` (12 props + Pip and Grandma Gus in 5 directions).
Target look: `mockups/04-inspect-painting-key.png`. Side by side: `art/p0-test/compare_mockup04_vs_composite.jpg`.

## 1. Camera, light, outline, shading
| Property | Spec | Notes from the test |
|----------|------|---------------------|
| Camera | High-angle oblique, pitch about 60 degrees, orthographic. We see the top face and the front face. | Props came out at roughly 40 to 55 degrees (more front than top). Characters came out lower (about 30 to 40 degrees, nearly front-on chibi). See "Known drift". |
| Light | Warm key light from top-left. Shaded side right and bottom. | Held on all 12 props and both characters. |
| Outline | 3 px dark brown `#3A2418`, uniform. | Held at generation size (1024). After downscale to game size the outline becomes about 1 to 1.5 px. Characters have a thinner outline than props. |
| Shading | Flat cel shading, 2 to 3 tones, soft highlight on top-left edges. No photoreal texture. | Held. Wood grain stays graphic. |
| Ground shadow | None in the sprite. The engine draws a soft ellipse under each item (`#1A0C04` at 30% opacity, width about 85% of the sprite footprint). | Prompt always says "no ground shadow". It was respected on all 12 props and all 3 character sheets/strips. |
| Background | Transparent PNG (`background: "transparent"` on gpt-image-2.6 sunburst). | Worked first time on every prop and sheet. Edit model gpt-image-2.6 edit also supports it. nano-banana does not (white background, needs removal). |

## 2. Palette
Design palette from `docs/10-art-audio-direction.md`:

| Role | Hex |
|------|-----|
| Outline | `#3A2418` |
| Pip hoodie | `#FFC933` |
| Interior warm wood / cream | `#D9A066` / `#F6E3C5` |
| UI teal / purple (also Grandma cardigan) | `#1FB7B0` / `#6C4AB6` |
| Exterior night | `#1B2540` (and `#1E3B2C`) |

Colors the model produced for props (eyeballed from the PNGs, not measured): wood light `#E39A45`, wood mid `#C0782E`, wood shadow `#8A4A22`, red plaid/rug `#B8323A`, cream cloth `#F3DDB8`, teal sofa `#4E8C73`, mustard armchair `#E0A030`, brass `#E8B040`, leaf green `#6E9A3A`.
Rule: only Pip and pickups use saturated sunny yellow. The mustard armchair is the closest competitor, so keep furniture yellows more orange.

## 3. Scale rules (1 tile = 64 px wide at zoom 1.0)
Files in `art/p0-test/props/` are stored at **2x** (zoom 1.8 stays sharp). Draw at 0.5 for zoom 1. Anchor is bottom center. `props/manifest.json` has sizes.

| Sprite | On-screen width at zoom 1 | Result height at zoom 1 |
|--------|--------------------------|-------------------------|
| bed_double | 128 px (2 tiles) | 162 px (about 3 tiles deep incl. headboard) |
| wardrobe | 64 px (1 tile) | 122 px (about 1.9 tiles) |
| table_cloth | 128 px | 94 px |
| sofa | 128 px | 77 px |
| armchair / nightstand / bookshelf | 72 / 56 / 72 px | 80 / 78 / 101 px |
| rug_red | 192 px | 114 px |
| plant_large / chest_wood / door_closed | 64 px | 81 / 60 / 105 px |
| painting_framed | 72 px | 72 px |
| Pip | about 76 px tall (about 1.2 tiles incl. hair spikes) | The 0.8 tile rule gives only about 51 px, which is too small for a 3-head chibi. **Decision needed:** use 0.8 tile for the body without hair, or about 1.2 tile total. The composite uses 76 px. |
| Grandma Gus | about 94 px tall | Adult is taller than the kid. |
Characters are stored at 288 px tall (about 3.8x). Pivot: bottom center on a canvas shared by all 5 views, so frames do not jump.

## 4. Reusable prompt (this exact text produced the consistent set)
Model: `openai/gpt-image-2.6/sunburst/text-to-image`, `background: "transparent"`, `output_format: "png"`, `image_size: {width:1024, height:1024}`, `quality: "medium"` (props). `reasoning_effort` left at default (high).

**PREFIX**
```
Game asset sprite for a cozy stealth hide-and-seek video game, drawn in a high-angle oblique view: camera pitched about 60 degrees looking down, so we see the top surface and the front face of the object, orthographic with no perspective convergence. Flat cel-shaded cartoon illustration, soft 2 to 3 tone shading, clean uniform 3px dark brown outline (#3A2418), warm key light from the top-left, shaded side on the right and bottom. Warm cozy palette: amber wood, cream, muted red. One single object, centered, fully visible with margin, transparent background, no floor, no ground shadow, no text, no watermark.
```
**OBJECT line (suffix)**: `OBJECT: <one sentence: what it is, material, 1 or 2 distinguishing details, which face points at the viewer>.` Examples that worked:
- `OBJECT: a tall wooden wardrobe with two closed doors with brass knobs and a carved top cornice, front face toward the viewer, twice as tall as it is wide.`
- `OBJECT: a rectangular dining table covered by a cream tablecloth with a red trim that hangs all the way down to the floor on all sides, hiding the legs, with a small bowl of fruit on top.`
- `OBJECT: a rectangular red floor rug lying flat on the floor ... seen from the same high angle so it appears as a slightly squashed rectangle (height about 70 percent of its width).`

**Character turnaround sheet** (technique A, the winner). Size 2304x768, transparent:
```
Game character turnaround sheet for a cozy stealth hide-and-seek video game, drawn in a high-angle oblique view: camera pitched about 60 degrees looking down, orthographic with no perspective convergence. Flat cel-shaded cartoon illustration, soft 2 to 3 tone shading, clean uniform 3px dark brown outline (#3A2418), warm key light from the top-left, shaded side on the right and bottom. Transparent background, no floor, no ground shadow, no text, no labels, no watermark. CHARACTER: <name, age, chibi proportions (about 3 heads tall, big head), hair, outfit with hex colors, shoes, accessories>. Idle standing pose, arms relaxed at sides. LAYOUT: exactly five full-body views of the SAME character in one horizontal row, evenly spaced, same size, same feet baseline, left to right: (1) facing the camera, (2) turned three-quarter toward the viewer's right (front-right), (3) facing right in side profile, (4) three-quarter back view turned away to the right (back-right, ...), (5) directly facing away from the camera (back view, ...).
```
Views map to S, SE, E, NE, N. Mirror them for SW, W, NW.

Pip: `Pip, a small kid, chibi proportions (about 3 heads tall, big head), messy brown hair, sunny yellow (#FFC933) hoodie with the hood down, blue jeans, red sneakers, a small dark teal backpack.`
Gus: `Grandma Gus, a kindly elderly woman, chibi proportions (about 3 heads tall, big head), grey hair in a round bun on top of the head, round glasses, purple (#6C4AB6) cardigan over a cream blouse, long brown skirt, pink slippers.`

Edit prompt (technique B): `Redraw this exact same character (same face, same messy brown hair, ... same flat cel-shaded style, same 3px dark brown outline, same proportions, same camera angle and size) but now <direction>. Full body, idle standing pose, centered, same scale. Transparent background, no ground shadow, no text.` For nano-banana replace the last sentence with `Plain flat pure white background ...`.

Floor and wall (opaque): a seamless plank texture prompt and a flat front-view wall segment prompt are in `art/p0-test/NOTES.md`.

## 5. What mattered in the prompt ("negative" phrases)
`gpt-image-2.6` has no negative-prompt field. Negatives go in the text. I did not run an ablation (no A/B with and without each phrase), so treat this as observation, not proof.
- "transparent background, no floor, no ground shadow" removed floor patches and cast shadows (none of the 12 props or 3 sheets had them).
- "One single object, centered, fully visible with margin" avoided cropped items and extra props. Note the bookshelf and nightstand added their own decor (plant, lantern, books), which is fine but unpredictable.
- "no text, no labels" kept the sheets clean (no labels on the 3 sheets and 2 strips).
- "front face toward the viewer" gave the same facing on all furniture.
- Dimensions in words ("twice as tall as it is wide", "wider than a single bed") changed proportions. The first bed ("double bed") came out as a single-width bed; "wide DOUBLE bed, ... two pillows side by side" fixed it.
- "seen from the same high angle so it appears as a slightly squashed rectangle" is needed for flat items (rug), otherwise they come out flat-on.
- "hanging on a wall, seen straight from the front" gave the painting a rope and a thick box frame. Remove "hanging" if you do not want the rope.

## 6. Do and don't
Do:
- Always start with the same PREFIX. Change only the OBJECT line.
- Generate characters as ONE sheet with all 5 directions, then crop. Do not generate directions separately.
- Generate at 1024 and downscale with Lanczos. Never ask for small sizes.
- Keep a manifest with anchor (bottom center), footprint in tiles, and height.
- Use `quality: medium` for props (it was enough). Use the same quality for every sprite in a batch.
- Name the hex colors of outfits in the character prompt.
Don't:
- Do not ask for "pixel art" or "isometric" (different looks, not tested here).
- Do not mix single-image character references with the sheet look: the single-image Pip (`raw/pip_ref_S.png`) had bigger eyes and different hair than the sheet Pip. Pick one master.
- Do not ask for walk cycles with feet on a fixed baseline: the model moves the whole body (see REPORT).
- Do not use the edit models to rotate a character if you need identical scale: sizes drifted between outputs.
- Do not ship raw model outputs: trim, resize, palette-quantize (props went from about 1 MB to 10 to 57 KB with no visible loss).

## 7. Known drift (found in this test)
1. Pitch is lower than 60 degrees on characters and on tall furniture (wardrobe, door). The composite still reads as one scene, but compare mockup 04, where tops of beds and chests are clearly visible.
2. Outline weight is thicker on props than on characters.
3. Saturation differs: chest and rug are richer than the sofa and armchair.
4. Door and wardrobe tops are drawn as a flat slanted slab. The door should be integrated into the wall frame in the engine or redrawn.
5. Paintings come with a hanging rope.

