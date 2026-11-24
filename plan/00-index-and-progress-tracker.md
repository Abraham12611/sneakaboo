# Sneakaboo Build Plan: Index and Progress Tracker

Repo: https://github.com/Abraham12611/sneakaboo (public, currently empty)
Local working copy: `c:\Users\DELL\workspace\Slinka`
Design docs: `docs/` (what the game is). Mockups: `mockups/`. **This folder (`plan/`) says how and in what order to build it.**

**Status: planning only. No game code has been written. Do not start Phase 0 tasks until the owner says go.**

## Reading order for a new contributor or AI agent
1. `README.md` and `docs/00-vision-and-contest.md`
2. `plan/01-view-camera-and-rendering-spec.md` (the look and camera: most important decision)
3. `plan/02-hiding-system-spec.md`
4. `docs/02-core-mechanics.md`, `docs/05-seeker-ai.md`, `docs/03`, `docs/04`
5. `plan/04-architecture-and-code-structure.md`, `plan/03-repo-tooling-and-workflow.md`
6. The phase file you are working on in `plan/phases/`

## Tracking conventions
- Phases are `P0` to `P11`. Sub-phases are `P3.2`. Tasks are `P3.2.4`.
- Checkbox states: `[ ]` not started, `[~]` in progress, `[x]` done, `[!]` blocked (write why on the same line).
- When a task is done: tick it and append `(YYYY-MM-DD, <short commit hash>)`.
- A sub-phase is done only when **all its tasks are ticked and its acceptance line is verified**.
- A phase is done when all sub-phases are done and its **gate** passes. Tag the commit `phase-N-done`.
- Commit messages start with the id: `P3.2.4: seeker checks bed after noise`.
- GitHub: one **milestone per phase**, one **issue per sub-phase** (see `plan/03`, task P0.1.4 creates them with `gh`).
- Update the tracker table below at the end of every working session.

## Gates (hard checkpoints)
| Gate | After | Pass condition |
|------|-------|----------------|
| G0 View decision | P0 | Oblique vs top-down chosen from a working spike. Renderer chosen. Contest compliance of CLI workflow confirmed. |
| G1 Greybox playable | P2 | Level 1 playable with placeholder art: move, zoom, cones, detection, win, fail, timer. On desktop and one real phone. |
| G2 Feature complete (Tier 1) | P3 | Every mechanic needed by levels 1-10 works: search, hide, keys, doors, boosters, stairs, stars. |
| G3 Content complete | P4 + P5 | Levels 1-10 playable with final-quality art, full menus, audio, mobile controls. |
| G4 Submission | P7 | Published, public, no login, scan clean, Launchpad form submitted. |
| G5 Store build | P10 | Builds pass store review requirements. |

## Phase map
| Phase | Name | Dates (target) | Contest critical | File |
|-------|------|----------------|------------------|------|
| P0 | Foundations and decisions | Nov 24-25 | Yes | [phase-00](phases/phase-00-foundations.md) |
| P1 | Engine core, view, camera | Nov 25-26 | Yes | [phase-01](phases/phase-01-engine-core-view-camera.md) |
| P2 | Perception and seeker AI | Nov 26-27 | Yes | [phase-02](phases/phase-02-perception-and-seeker-ai.md) |
| P3 | Interaction, hiding, items, floors | Nov 27-29 | Yes | [phase-03](phases/phase-03-interaction-hiding-items.md) |
| P4 | Art and content: levels 1-10 | Nov 27-Dec 1 (parallel lane) | Yes | [phase-04](phases/phase-04-art-and-levels-1-10.md) |
| P5 | UX shell, controls, audio, juice | Nov 29-Dec 1 | Yes | [phase-05](phases/phase-05-ux-controls-audio.md) |
| P6 | Backend on Base44 (lite for contest) | Nov 30-Dec 1 (parallel lane) | Optional | [phase-06](phases/phase-06-backend-base44.md) |
| P7 | QA, performance, submission | Dec 1-3 | Yes | [phase-07](phases/phase-07-qa-and-contest-submission.md) |
| P8 | Content expansion: levels 11-20 | After submit, or stretch before | Stretch | [phase-08](phases/phase-08-content-expansion.md) |
| P9 | Level builder and community | Dec onward | No | [phase-09](phases/phase-09-level-builder-and-community.md) |
| P10 | Mobile store release | Jan onward | No | [phase-10](phases/phase-10-mobile-store-release.md) |
| P11 | Live ops and growth | After launch | No | [phase-11](phases/phase-11-live-ops-and-growth.md) |

Lanes: art/content (P4) and backend (P6) run in parallel with engine phases. Everyone shares one repo and one `main`.

## Progress tracker (update every session)
| Phase | Sub-phases | Tasks done / total | Status | Notes |
|-------|-----------|------|--------|-------|
| P0 | 6 | 28 / 40 | In progress | |
| P1 | 8 | 0 / 48 | Not started | |
| P2 | 8 | 0 / 46 | Not started | |
| P3 | 8 | 0 / 57 | Not started | |
| P4 | 6 | 0 / 38 | Not started | |
| P5 | 7 | 0 / 46 | Not started | |
| P6 | 6 | 0 / 29 | Not started | |
| P7 | 7 | 0 / 37 | Not started | |
| P8 | 6 | 0 / 32 | Not started | |
| P9 | 7 | 0 / 36 | Not started | |
| P10 | 7 | 0 / 37 | Not started | |
| P11 | 6 | 0 / 28 | Not started | |

Contest clock: today Nov 24. Deadline Dec 3, 23:59 UTC. Target submit: Dec 2.

## Scope rule for the contest
If the schedule slips, cut in this order (last cut first):
1. P8 content (levels 11-20)
2. P6 online features (the game must work without a backend)
3. Levels 9-10 (ship 1-8)
4. Audio music (keep sfx)
5. Never cut: stars, timer, hiding, keys, mobile controls, rotate prompt, no-login rule.

## Corrections to earlier docs
- `docs/14-nine-day-contest-plan.md` listed stairs as Tier 2. Levels 7, 9 and 10 need floors or long routes, so **stairs are Tier 1** (P3.6). Doc 14 is updated.
- The camera is now **a scrolling, zoomable view** (not the whole house on screen). See `plan/01`.
- Hiding is expanded (beds, wardrobes, chairs, tables, more). See `plan/02`.
