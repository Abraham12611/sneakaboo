# Phase 4: Art and Levels 1-10

**Target:** Nov 27-Dec 1 (parallel lane with P2/P3) | **Contest critical:** yes | **Milestone:** `P4 Content`
**Depends on:** G0 (style decision). Levels can be authored in greybox before art arrives.

**Goal:** ten fair, fun, good-looking levels with final-quality art, authored as JSON and verified by tools.

**Read first:** `docs/levels/levels-01-05.md`, `docs/levels/levels-06-10.md`, `docs/06`, `docs/07`, `plan/06`, `plan/07`.

---

## P4.1 Art production batch 1 (Zone 1 and 2 set)
Acceptance: atlas for Zones 1-2 imported; a test room matches mockup 04's look.
- [ ] P4.1.1 Floors and walls (8 floors, 6 wall types) per the asset list in `plan/06`.
- [ ] P4.1.2 Doors (all states, colored locks, exit glow).
- [ ] P4.1.3 Furniture set A: living room, bedroom, kitchen, bathroom, hall (about 35 sprites).
- [ ] P4.1.4 Hiding spot art with open and Pip-inside variants (bed, wardrobe, closet, curtain, cloth table, sofa, chair, plant, chest, box).
- [ ] P4.1.5 Characters: Pip, Grandma Gus, Uncle Marlo, Tilly, Tobi, Biscuit (walk, idle, search, chase, special).
- [ ] P4.1.6 Item icons (potion, keys, radio, slippers, stopwatch, trophy, coin, clue notes).
- [ ] P4.1.7 FX sprites (dust, rings, sparkle, confetti, bubbles).
- [ ] P4.1.8 Atlas packing, manifest, credits log.
- [ ] P4.1.9 Zone 3 set (mansion furniture, library, gallery paintings) as batch 2 once L1-8 are done.

## P4.2 Level authoring pipeline
Acceptance: a new level goes from description to validated JSON to playable in under 30 minutes.
- [ ] P4.2.1 JSON authoring guide (`levels/README.md`) with a worked example (L03).
- [ ] P4.2.2 ASCII to JSON converter (`tools/ascii2level`): draw tiles and objects in text, output JSON.
- [ ] P4.2.3 Validator v2: key reachability, hiding rules, seeker path checks, safe window check at chokepoints, time estimate.
- [ ] P4.2.4 Solver/bot or recorded input scripts per level; compute `par`.
- [ ] P4.2.5 Level preview image generator (headless render) for the level-select thumbnails.
- [ ] P4.2.6 Levels index and pack file.
- [ ] P4.2.7 CI step: validate every level on each push.

## P4.3 Levels 1-4 (Zone 1: Cozy Cottage)
Acceptance: each level passes the validator, the bot, and one human playtest. See level docs for goals.
- [ ] P4.3.1 L1 "First Peek" (teach move, sneak, cones, exit).
- [ ] P4.3.2 L2 "Behind the Couch" (hiding, noise rings, radio).
- [ ] P4.3.3 L3 "The Pantry Key" (keys, Snoopy).
- [ ] P4.3.4 L4 "Quiet Feet" (surfaces, slippers, baby monitor).
- [ ] P4.3.5 Tutorial prompts for L1-L4 (max 3 in L1).
- [ ] P4.3.6 Each level has at least one Full hiding spot (except L1) and a trophy.

## P4.4 Levels 5-8 (Zone 2: Suburban House)
- [ ] P4.4.1 L5 "Garage Night" (safe code, potion, sleeping dog).
- [ ] P4.4.2 L6 "Double Trouble" (twins, vent shortcut).
- [ ] P4.4.3 L7 "Upstairs, Downstairs" (2 floors, stairs, keypad).
- [ ] P4.4.4 L8 "Midnight Snack" (dark, dog, split key).
- [ ] P4.4.5 Art additions for garage, attic, laundry, basement.

## P4.5 Levels 9-10 (Zone 3: Mansion)
- [ ] P4.5.1 L9 "Welcome to the Manor" (sprinter, three key colors, 2 floors) .
- [ ] P4.5.2 L10 "The Long Gallery" (shared alerts, 3 gears, drawbridge).
- [ ] P4.5.3 Sprinter Sibling AI finalized if not done in P2.6.
- [ ] P4.5.4 Mansion art set.
- [ ] P4.5.5 If time is short: ship L1-L8 and mark L9-10 as stretch.

## P4.6 Balance pass
Acceptance: fail rate targets in `plan/07` are met by 3+ playtesters.
- [ ] P4.6.1 Playtest session (Nov 30) with notes.
- [ ] P4.6.2 Adjust timers, par, seeker timings, hint placement.
- [ ] P4.6.3 Check the first 10 seconds of each level for fairness.
- [ ] P4.6.4 Verify star thresholds feel earnable.
- [ ] P4.6.5 Confirm every level is solvable by the bot after the final tuning.
- [ ] P4.6.6 Level thumbnails and names finalized.

---

## Exit criteria (with P5, forms G3)
- [ ] L1-L10 (or L1-L8 minimum) complete, validated, playtested.
- [ ] Final art loaded (no greybox boxes remain in shipped levels).
- [ ] CREDITS.md complete for all assets.

## Risks
Art volume (reuse furniture, share atlases), level design time (ASCII converter), unfair difficulty (playtest early).
