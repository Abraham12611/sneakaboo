# 07 Testing and QA Strategy

## Test layers
| Layer | Tooling | What it covers | When |
|-------|---------|----------------|------|
| Unit (sim) | Vitest, Node | Cone test, raycast, detection meter, A*, noise propagation, hiding rules, key/door logic, timer, stars | Every commit (CI) |
| Level validation | `tools/validate-levels` | Schema, reachability with keys, code completeness, hiding rules, seeker paths walkable, time estimates | Every commit (CI) |
| Scenario ("bot") tests | Vitest + scripted inputs | "Walk route X, expect win", "enter wardrobe, Marlo checks, expect found" | Per level, CI |
| Solver / bot | A script that finds a route using the sim | Proves each level is winnable within the time limit and records par | When a level changes |
| Visual checks | Manual screenshots + optional Playwright screenshots | Camera, fog, occlusion, UI at 3 sizes | Per phase |
| Device testing | Real phones | Performance, touch controls, orientation | P1, P3, P5, P7 |
| Playtests | 3-5 humans | Fairness, clarity, difficulty | P4 (Nov 30), P7 |
| Security and compliance | Base44 scan + checklist | Before publish | P7 |

## Determinism
The sim uses a seeded RNG and a fixed timestep. Scenario tests assert exact states at given times. If a change alters a scenario result on purpose, update the expected value in the same commit with a note.

## Level solver (P4.2)
A headless script that explores `(position, inventory, opened doors, hidden state)` using the sim with a coarse action set (move 8 dirs, sneak/walk, interact, wait, use booster). Outputs: solvable yes/no, best time, a route. Used for:
- Validation that the intended solution exists.
- Setting `par`.
- Detecting levels that become unwinnable after AI changes.
Time-box it: if it takes too long to write, replace with hand-recorded input scripts per level (the "intended solution" in `docs/levels/*.md`).

## Playtest protocol
- 3 to 5 people, mix of phone and desktop. No coaching.
- Record: time to complete L1, deaths per level, where they got stuck, quotes.
- Questions: "Did you know why you got found?", "What did you try to do and couldn't?", "Was zoom helpful?"
- Fix top 10 issues by severity: **S1** crash or can't finish, **S2** unfair or confusing, **S3** polish.

## Fairness metrics (collect in debug builds)
- Fail rate per level in first 3 attempts (target L1: under 30%, L5: under 50%, L10: under 65%).
- "Found" causes: cone seen, noise heard, hiding spot checked, timer (log source).
- Time in each level vs par.

## Device matrix
| Device class | Browser | Must pass |
|--------------|---------|-----------|
| Desktop Windows/Mac | Chrome, Edge, Firefox, Safari (mac) | Yes |
| Android mid-range | Chrome | Yes |
| iPhone (recent) | Safari | Yes |
| iPad / tablet | Safari/Chrome | Nice to have |
| Low-end Android | Chrome | Playable at reduced quality |

## Smoke test after every deploy (5 minutes)
1. Open the public URL in a private window (no cache, not logged in).
2. No login prompt anywhere.
3. Title loads under 4 s on throttled "Fast 4G".
4. Start L1: move, zoom, get detected, retry, win.
5. Rotate phone to portrait: overlay appears; landscape: game resumes.
6. No console errors. Network tab: no failed required requests.
7. Mute toggle works. Pause works.

## Release checklist (G4)
See `plan/phases/phase-07-qa-and-contest-submission.md`.

## Bug tracking
GitHub issues with labels `bug`, `S1/S2/S3`, `phase:Pn`. Link the failing scenario or level id. Every S1 and S2 fix gets a regression scenario test.
