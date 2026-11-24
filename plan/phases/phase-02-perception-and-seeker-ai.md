# Phase 2: Perception and Seeker AI

**Target:** Nov 26-27 | **Contest critical:** yes | **Gate:** G1 (greybox playable) | **Milestone:** `P2 AI`
**Depends on:** P1.

**Goal:** seekers that are readable, fair, and fun. By the end, Level 1 is genuinely playable with greybox art: win, get found, time out, retry.

**Read first:** `docs/05-seeker-ai.md`, `docs/02-core-mechanics.md` (sections 2, 3, 8, 9), `plan/02` (seeker side of hiding).

---

## P2.1 Vision cones
Acceptance: cones are blocked by walls and tall furniture; rendering matches logic in the chosen projection.
- [ ] P2.1.1 Cone test (range, half-angle, facing) and DDA raycast on `blocksSight`.
- [ ] P2.1.2 Cone polygon generation (max 48 rays, adaptive) for rendering.
- [ ] P2.1.3 Cone rendering through the projection, gradient fill, under characters.
- [ ] P2.1.4 Colors by state (calm yellow, suspicious orange, chase red) plus pattern cues for colorblind mode.
- [ ] P2.1.5 Doors: closed doors block sight; open doors don't.
- [ ] P2.1.6 Perf: skip seekers far from the camera and on other floors.

## P2.2 Detection and "found"
Acceptance: meter rates and modifiers match `docs/02` section 2; found ends the attempt.
- [ ] P2.2.1 Per-seeker meter with distance falloff, gait modifier, shadow modifier, cover modifier (hook for P3.2).
- [ ] P2.2.2 Meter ring UI above the seeker; "?" at 0.4; "!" at 1.0.
- [ ] P2.2.3 Minimum 0.6 s from first sight to found at point blank (fairness).
- [ ] P2.2.4 "Found You!" flow: freeze frame with the seeker's cone, shake, instant retry.
- [ ] P2.2.5 Stats: `spotted` counter and found cause logging.

## P2.3 Hearing and noise response
Acceptance: seekers investigate noise within hearing range with a path-length check.
- [ ] P2.3.1 Noise event lifetime and radius.
- [ ] P2.3.2 Hearing test with wall dampening (path length under 2x radius).
- [ ] P2.3.3 Investigate target selection and "look around" behavior.
- [ ] P2.3.4 Non-player noises (radio, toys, falling objects) use the same events.
- [ ] P2.3.5 Subtitles/visuals for off-screen noise (small arrow + sound icon).

## P2.4 State machine and patrols
Acceptance: Patrol, Curious, Investigate, Search, Chase, Return states behave per the table in doc 05.
- [ ] P2.4.1 FSM with transitions and timers, deterministic.
- [ ] P2.4.2 Waypoint patrol: waits, look angles, loops (loop, pingpong, once).
- [ ] P2.4.3 Sleep state (zzz), wake rules (noise within N tiles), like Robbery Bob's sleeping dogs.
- [ ] P2.4.4 Search state: check nearby hiding spots (hook for P3.2).
- [ ] P2.4.5 Chase and optional Tag Chase grace.
- [ ] P2.4.6 Alert sharing between seekers (`alertShare` flag).
- [ ] P2.4.7 Animation hooks: walk, look, search, chase, sleep.

## P2.5 Pathfinding and doors
Acceptance: seekers navigate around furniture and through doors without clipping; no jitter.
- [ ] P2.5.1 A* on grid with binary heap and cost near furniture.
- [ ] P2.5.2 Path smoothing and corner cutting rules.
- [ ] P2.5.3 Door handling: open, creak noise, auto-close; locked doors are walls unless the seeker has a key.
- [ ] P2.5.4 Stairs nodes (hook for P3.6).
- [ ] P2.5.5 Path cache and invalidation on door toggles.
- [ ] P2.5.6 Stuck detection and recovery.

## P2.6 Seeker types (set 1)
Acceptance: each type behaves as described and is tuned in the data file, not in code.
- [ ] P2.6.1 Data file `seekers.ts` with all params.
- [ ] P2.6.2 Grandma Gus (slow, wide, naps).
- [ ] P2.6.3 Uncle Marlo (Snoopy: checks hiding spots, closets).
- [ ] P2.6.4 Tilly and Tobi (twins, paired movement, split in search).
- [ ] P2.6.5 Biscuit the dog (short wide cone, long hearing, sniff, bark alert, asleep variant).
- [ ] P2.6.6 Sprinter Sibling (can slip to P8 if behind).

## P2.7 Fairness systems
Acceptance: each fairness rule in doc 05 has a test.
- [ ] P2.7.1 Safe start zone and 3 s grace.
- [ ] P2.7.2 No spawn facing Pip in the start room.
- [ ] P2.7.3 Telegraphing: footsteps/hum audio hooks, magnifier before checks, "?" before chase.
- [ ] P2.7.4 Anti-frustration: extra pause after repeated fails at the same waypoint (invisible assist).
- [ ] P2.7.5 Assist: dotted patrol path overlay (Robbery Bob style) toggle.
- [ ] P2.7.6 Level `difficulty` knobs: speedMult, coneRangeMult, coneAngleMult, hearingMult, pauseMult.

## P2.8 Tuning harness
Acceptance: a script can run N seeded attempts of a recorded input and report outcomes.
- [ ] P2.8.1 Scenario runner with input scripts.
- [ ] P2.8.2 Metrics: time to found, cause, closest seeker distance.
- [ ] P2.8.3 Simple bot that walks the intended route (waypoints) to verify winnability.
- [ ] P2.8.4 Regression scenarios for L1.
- [ ] P2.8.5 Tuning table committed to `levels/tuning.md`.

---

## G1 exit checklist: greybox playable
- [ ] Level 1 fully playable on desktop and a real phone.
- [ ] Zoom and fog work during play.
- [ ] Cones, detection, noise, found, retry, timer, win work.
- [ ] Two playtesters beat L1 with no explanation except the 3 prompts.
- [ ] Sim test suite green in CI.

## Risks
AI feels cheap or unreadable. Mitigate with telegraphing and early playtests. Cone rendering cost on phones: cap rays and bake static shapes for stationary seekers.
