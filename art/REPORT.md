# P0.6 Art Test Report (2026-11-24)

## Verdict
**Recommendation: A for furniture and for static character poses (AI-generated frames). For character walk/run animation, do not rely on AI frames. Use the AI 5-direction idle poses and animate them in code (bob, squash and stretch, optional 2-frame foot swap), i.e. a light version of B. Do not use C (code-drawn vector furniture) unless the owner rejects the AI look.**

Reasons in one line each:
- Furniture: 12 of 12 props usable and visibly the same style, light and outline. No hand fixes needed to use them in a room.
- Character direction views: very consistent when generated as one sheet (A). Edit-model rotation (B) kept identity but not scale.
- Walk cycle: the front-view strip kept the head and clothes identical in 6 frames but the legs read as a run, the feet baseline jumps and two frames have odd soles. It is "usable with picks and hand fixes", not "usable as is". A full animation set would be about 700 frames, and it would be hard to keep all of them consistent.

## Pass criteria
| Criterion | Target | Result | Status |
|-----------|--------|--------|--------|
| Sprites usable without hand fixes | at least 80% | 12 of 12 props usable as generated (9 clean, 3 with a minor flaw). 10 of 10 character views usable. Walk strip: 4 of 6 frames usable, 2 need a hand fix (see table). Counting props + characters only: 22 of 22 (100%). Counting the walk frames too: 26 of 28 (93%) usable, but walk frames carry the notes below. | **Pass** |
| Consistent angle / outline / light | consistent | Light and outline consistent in all items. Angle is consistent among props (about 45 to 55 degrees) but characters are lower (about 30 to 40 degrees) and none reach a clear 60 degrees. Looks like one game in the composite, but mockup 04 shows more of the top surface. | **Pass with note** |
| Characters consistent across directions | consistent | Sheet technique: same face, hair, colors, backpack and proportions in all 5 views for both characters. Slight difference: outline is thinner than on props. | **Pass** |
| Walk cycle frame-to-frame | usable | Identity stable, motion crude. Needs hand fixes or procedural animation. | **Marginal** |

## Per-sprite table
Pass = usable as generated. "Pass*" = usable, with the note in the last column.

| Sprite | Result | Note |
|--------|--------|------|
| bed_double | Pass | First try read as a single bed (kept only as a note in NOTES.md). Second try, "wide DOUBLE bed ... two pillows", is a clear double. |
| wardrobe | Pass* | Top is drawn as a flat slanted slab, a bit odd. Fine at game size. |
| table_cloth | Pass | Cloth reaches the floor on all sides, as requested. Good hiding spot read. |
| sofa | Pass | |
| armchair | Pass | |
| nightstand | Pass | Book stack overhangs the top. Fine. |
| bookshelf | Pass | Model added a plant, lantern and globe by itself. |
| rug_red | Pass | Flat-on, squash about right. Fringe only on the short ends. |
| plant_large | Pass | |
| chest_wood | Pass | More saturated and heavier than the other props. Needs a tone pass if kept. |
| door_closed | Pass* | Lintel drawn as a free-standing slab, needs wall integration (done in engine with the frame). |
| painting_framed | Pass* | Comes with a hanging rope and a thick box frame. Remove "hanging" from the prompt. |
| pip_S, pip_SE, pip_E, pip_NE, pip_N | Pass (5/5) | Same character in all views. Back views show the backpack well. |
| gus_S, gus_SE, gus_E, gus_NE, gus_N | Pass (5/5) | Same character in all views. Bun reads in every view. |
| walk_01 | Pass* | Contact frame, good. |
| walk_02 | Pass* | Passing frame, good. |
| walk_03 | Fail | Lifted foot shows a smudged red sole. Hand fix needed. |
| walk_04 | Pass* | Contact frame, good. |
| walk_05 | Pass* | Passing frame, good. |
| walk_06 | Fail | Same smudged sole. Hand fix needed. |
Walk frames overall: figure moves toward the camera, so the body height changes from 1 frame to the next (feet baseline goes up and down by about 6% of the strip height, measured by eye). This reads as a bounce, not as a clean walk.

## Technique comparison for characters
| | A: one turnaround sheet, crop | B: reference + edit model, one call per direction |
|---|-------------------------------|--------------------------------------------------|
| Calls for 5 directions | 1 | 4 (plus 1 to make the reference) |
| Identity across views | Excellent (same call, same design) | Good. Kept hair, colors and backpack. Both edit models changed the face a little from the reference. |
| Scale across views | Same scale (set by the sheet) | Drifted. Profile views came out smaller (gpt edit) or larger (nano-banana). Needs a rescale step. |
| Background | Transparent | gpt-image-2.6 edit: transparent but the profile view had a faint halo. nano-banana-2.1 edit: white background, needs a removal step. |
| Reference mismatch | none | The reference single-image Pip had bigger eyes than the sheet Pip, so mixing "reference" with "sheet" gives two different Pips. |
| Best use | Define the character and the 5 base directions | Add new poses of an approved character (hands up, crouch). Not tested in this run: pose edits and run or walk edits. |
**Winner for direction views: A.** B stays useful for later poses. Check scale and halo on every output.

## Cost and time
| Item | Jobs | Time per job (observed) | Cost |
|------|------|--------------------------|------|
| gpt-image-2.6 text-to-image (quality medium) | 20 | 3 to 8 s when 4 to 8 run in parallel | Not returned by the pricing tool (shows "1 unit"). Check fal billing. |
| gpt-image-2.6 edit | 4 | about 5 s | same |
| nano-banana-2.1 edit | 5 | about 5 s | same |
| ElevenLabs SFX v3 | 6 (about 9 s of audio) | under 2 s | list price 0.002 USD per second, about 0.02 USD |
| ElevenLabs Music v2.5 | 1 (30 s) | under 3 s | list price 0.6 USD per minute, about 0.30 USD |
Total 29 image jobs and 7 audio jobs, under the 60 job budget. Human time for this whole test was the dominant cost (prompting, looking at results, slicing, building the composite).

Per-sprite effort:
- Prop: 1 prompt line + about 1.2 generations on average (12 props needed 13 generations) + about 1 minute of review and naming.
- Character (5 directions): 1 sheet generation + crop script (about 5 minutes including review).
- Walk strip (1 direction): 1 generation, 2 of 6 frames bad, so 1 more try or a hand fix per direction.

## Tier 1 estimate (about 150 sprites from `plan/06`)
Assume 25% reroll rate and 1 minute of review/slice/name per accepted sprite.
| Group | Count | Generations | Time |
|-------|-------|-------------|------|
| Furniture 50 + items 20 + doors 8 | 78 | about 100 | about 2 h (generation runs in parallel batches of 8, review dominates) |
| Floors 8 + walls 6 | 14 | about 25 (tiling needs retries) | about 1 h plus seam fixes |
| Characters 7 (5 directions idle, 1 sheet each) | 35 poses | about 10 | about 1 h |
| FX 12 | 12 | about 15 | about 0.5 h |
| UI 40 | mostly SVG/CSS | few | not AI |
| **Static art total** | about 140 | about 150 | **about 4.5 to 6 h** |
| Character animation with AI frames (7 chars x 5 directions x (walk 6 + run 6 + idle 4) = 560 frames, plus seeker special poses) | 600+ | 120+ strips | **12 to 20 h** with picks and hand fixes, and the consistency risk |
| Character animation with procedural bob over AI idle poses | 0 new frames | 0 | about 0.5 day of engine work, no extra art |
Conclusion: static Tier 1 art is a one-day job. Character animation is the part that decides the schedule.

## Recommendation detail
1. **Furniture and props: A.** Keep the PREFIX/OBJECT prompt from `STYLE-BIBLE.md`. Add a tone pass step (saturation match, optional outline thickening at 2x) when the full set is made.
2. **Characters: A for the 5 base directions.** Use the sheet technique for all 7 characters.
3. **Character animation: B-lite.** Use the idle poses and move them in code: vertical bob (2 px at zoom 1), squash and stretch, tilt, small left-right sway, blink swap, and a 2-frame foot-swap if wanted. The tests show the AI cannot keep the feet baseline or foot detail stable. If the owner wants real leg motion, then build characters from layers (full B). That means cutting each AI character into head, torso, arms, legs by hand or with a segmentation model, which was not tested here.
4. **C (vector furniture):** not needed. The AI props already match the cozy outlined look of mockup 04. Keep C only as the fallback if the owner rejects the look.
5. **View decision (feeds G0):** the art check in `plan/01` ("12 props + Pip in 8 directions, at least 80% usable") passes for the oblique view. Caveat: the generated angle is closer to 45 degrees than 60, so the projection K should be tuned to the art (K about 0.85 was used in the composite and looked right).

## Risks and open items
- Pitch drift (props about 45 to 55 degrees, characters lower). A "pitch lock" would need either a reference image in every prompt (edit model with a prop as style reference) or acceptance of the current look.
- Pip scale rule: 0.8 tile is only 51 px, too small for a big-head chibi. Decide before production. The composite uses 76 px and looks fine but small next to the mockup, where the kid looks larger relative to the furniture.
- The raw model outputs carry no license data. `CREDITS.md` rows were added (model, date, use). Licensing terms of the generated images were not checked here, ask the owner to confirm fal/OpenAI/Google terms allow commercial use and contest entry.
- Audio not listened to (see `p0-test/NOTES.md`).
- The test room does not include occlusion fade, hiding states, cones or fog (P0.4).

