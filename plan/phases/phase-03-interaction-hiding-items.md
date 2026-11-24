# Phase 3: Interaction, Hiding, Items, and Floors

**Target:** Nov 27-29 | **Contest critical:** yes | **Gate:** G2 (feature complete, Tier 1) | **Milestone:** `P3 Interaction`
**Depends on:** P2.

**Goal:** everything the player can *do* besides walking: search, hide, unlock, use items, climb stairs, read clues, and finish with stars.

**Read first:** `plan/02-hiding-system-spec.md`, `docs/03`, `docs/04`, `docs/02` sections 5-10.

---

## P3.1 Interactables and searching
Acceptance: a held button fills a ring, reveals contents, makes noise, and marks the object as checked.
- [ ] P3.1.1 Interactable framework: type, footprint, entry points, state (unchecked, open, checked).
- [ ] P3.1.2 Context button logic: nearest target within 0.9 tiles, icon by action (search, hide, unlock, use).
- [ ] P3.1.3 Search progress ring (world UI), cancel on move, start and end noise.
- [ ] P3.1.4 Payload reveal: empty, key, key part, clue, booster, stopwatch, coin, trophy, prank (data-driven).
- [ ] P3.1.5 Hand-icon hints within 3 tiles and highlight outline (mockup 04).
- [ ] P3.1.6 Object library Tier 1: drawer, dresser, nightstand, wardrobe, closet, chest, box, laundry basket, fridge, bookshelf, plant pot, mat/rug, painting, loose floorboard, toy chest.
- [ ] P3.1.7 Animations per object (open drawer, lift rug, lid creak).

## P3.2 Hiding system
Acceptance: all behaviors in `plan/02` for Tier 1 spots (bed, wardrobe, closet, curtain, tablecloth table, sofa, chair, plant, chest, box) work and are covered by scenario tests.
- [ ] P3.2.1 Cover levels (Full, Partial, Shadow) integrated into detection.
- [ ] P3.2.2 Enter/exit logic with entry points, vulnerable window, "Too close!" refusal.
- [ ] P3.2.3 Hidden state: Pip invisible/masked, camera slightly closer, peek cone.
- [ ] P3.2.4 Seeker check behavior: choose spot, magnifier telegraph, bend/open animation, Boo! beat, found.
- [ ] P3.2.5 Back exits and escape hatch (grace press during Boo!).
- [ ] P3.2.6 Partial cover (sofa, chairs, plants, tables without cloth) with facing rules.
- [ ] P3.2.7 Box-walk (cardboard box moves slowly) as a fun extra.
- [ ] P3.2.8 Dog sniff rule and Slippers counter.
- [ ] P3.2.9 Hide validation rules in the level validator (size, entry reachable, cloth flag).
- [ ] P3.2.10 View: Pip masking per spot, draw-order swap, spot open/closed sprites.
- [ ] P3.2.11 Scenario tests from the list in `plan/02`.

## P3.3 Doors, keys, locks
Acceptance: colored keys open matching doors; key parts and codes work; the validator proves solvability.
- [ ] P3.3.1 Door states: open, closed, locked, jammed, one-way. Creak noise unless sneaking.
- [ ] P3.3.2 Key ring HUD data model (bronze, silver, gold, skeleton).
- [ ] P3.3.3 Locked chests and drawers (matching color).
- [ ] P3.3.4 Multi-part keys (halves, gears) and machinery doors.
- [ ] P3.3.5 Code locks (3 to 4 digits) with a keypad UI.
- [ ] P3.3.6 Switch pairs with timing window.
- [ ] P3.3.7 Validator: reachability with key states, no circular dependencies, complete part sets.

## P3.4 Inventory and boosters
Acceptance: 3 slots (4 later), use by key or tap, Tier 1 boosters work as in doc 04.
- [ ] P3.4.1 Inventory model, pickup, swap prompt, drop (noise).
- [ ] P3.4.2 Invisibility Potion (12 s, shimmer, ring, audible).
- [ ] P3.4.3 Radio (placed, plays, noise events).
- [ ] P3.4.4 Sneaky Slippers (20 s silent).
- [ ] P3.4.5 Stopwatch pickups (+10/+15 s).
- [ ] P3.4.6 Squeaky Toy (throw, big noise) and Decoy Teddy (can slip to P8).
- [ ] P3.4.7 Speed Boots (can slip to P8).
- [ ] P3.4.8 Booster HUD rings and cooldown visuals.

## P3.5 Clues, notebook, safes
Acceptance: clue cards save to a notebook; safe codes can be assembled from 3 clues.
- [ ] P3.5.1 Clue card UI (picture-first, short text).
- [ ] P3.5.2 Notebook panel (HUD button, N key).
- [ ] P3.5.3 "Points to" highlight: after reading a clue, the target object gets a faint sparkle.
- [ ] P3.5.4 Hint button after 60 s on a clue (highlight 3 s, costs coins when the economy exists).
- [ ] P3.5.5 Safe object with code entry; code digits from clue objects.
- [ ] P3.5.6 Book-pull choice (3 highlighted books) mini interaction.

## P3.6 Floors, stairs, shortcuts, minimap
Acceptance: multi-floor levels work; seekers can use stairs; minimap shows the current floor.
- [ ] P3.6.1 Multi-floor world state and floor switching with a 0.6 s transition.
- [ ] P3.6.2 Stairs, trapdoors, laundry chute (one way), dumbwaiter.
- [ ] P3.6.3 Seekers using stairs in patrols; per-floor hearing.
- [ ] P3.6.4 Crawl space / vent shortcuts (slow, silent, seekers can't enter).
- [ ] P3.6.5 Fog and room memory per floor.
- [ ] P3.6.6 Minimap per floor with seen-seeker blips.
- [ ] P3.6.7 Floor indicator HUD.

## P3.7 Timer, win, fail, stars
Acceptance: the full level loop works from start to results, with exact star rules.
- [ ] P3.7.1 Timer starts on first move; stopwatch pickups; low-time warnings.
- [ ] P3.7.2 Fail: found or timeout; instant retry with seeded repeatability.
- [ ] P3.7.3 Win at Home Base; stars: 1 reach, 2 time left >= 35%, 3 trophy.
- [ ] P3.7.4 Stats and results data (time, spotted, trophy, coins).
- [ ] P3.7.5 "Never Spotted" cosmetic condition tracking.
- [ ] P3.7.6 Retry assist: after 3 fails offer "show patrol paths 5 s".

## P3.8 Pranks, traps, extras
Acceptance: harmless traps create noise events and are telegraphed by art.
- [ ] P3.8.1 Squeaky floor toy, whoopee cushion chair, spring snake drawer, creaky lid.
- [ ] P3.8.2 Fuse box and light switch (darkness toggles).
- [ ] P3.8.3 Clock chimes as noise events.
- [ ] P3.8.4 Dark-room lighting overlay and flashlight (can slip to P8).
- [ ] P3.8.5 Window/vent outside route (can slip to P8).

---

## G2 exit checklist: feature complete (Tier 1)
- [ ] Every mechanic used by levels 1-10 in `docs/levels` is implemented (list from `docs/levels/*.md` checked).
- [ ] Hiding scenarios pass in CI.
- [ ] Greybox versions of L1-L5 playable end to end.
- [ ] Phone performance still within budget.

## Risks
Hiding feels punishing or exploitable: lean on telegraphing and escape hatches; playtest early. Scope: items marked "can slip to P8" are not required for L1-L10.
