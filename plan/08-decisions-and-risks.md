# 08 Decisions and Risks Log

Update this file when a decision is made or a risk changes. Decision ids are permanent.

## Decisions
| Id | Decision | Status | Date | Notes |
|----|----------|--------|------|-------|
| D-000 | Game name: **Sneakaboo**. Hero: Pip. | Decided | Nov 24 | Owner likes it. Trademark and store-name check still to do (P10). |
| D-001 | View: **oblique** preferred, flat top-down fallback | Provisional (Nov 24) | Nov 24 | Spike (spike/RESULTS.md) found no failed check. Final lock needs a real-phone test. Note: AI sprites came out at a lower pitch (about 45 deg, "Stardew-like 3/4") than mockup 04 (about 60 deg). Owner to confirm that look is acceptable. |
| D-002 | Camera: scrolling follow camera with **player zoom** (0.6-1.8) | Decided | Nov 24 | Owner request. Per-level min zoom and fog to prevent exploits. |
| D-003 | Sim and view separated, sim headless | Decided | Nov 24 | Enables tests, AI tuning, future native. |
| D-004 | Renderer: **Canvas 2D** behind a `Renderer` interface, Pixi adapter kept as an option | Provisional (Nov 24) | Nov 24 | Headless 4x-CPU-throttle: Canvas 46-57 FPS vs Pixi 16-29 FPS (naive Pixi adapter). Canvas bundle about 15 KB gz vs about 180 KB. Switch to Pixi if Canvas is under 40 FPS on a phone at DPR 2 or dark-level lighting needs filters. |
| D-005 | Language: TypeScript strict, Vite + React shell | Proposed | | Confirm with the Base44 template in P0.3. |
| D-006 | No login anywhere in the contest build; guest id in localStorage | Decided | Nov 24 | Contest rule. |
| D-007 | Backend optional; game works offline | Decided | Nov 24 | Backend only through functions. |
| D-008 | Hiding system: cover levels Full / Partial / Shadow, telegraphed seeker checks | Decided | Nov 24 | See `plan/02`. |
| D-009 | Stairs and floors are Tier 1 | Decided | Nov 24 | Levels 7, 9 need them. |
| D-010 | Art: AI-generated **static** sprites (props, 5-direction character poses) + **code-driven character animation** (bob, lean, squash, shadow). Do not use AI walk-cycle frames. | Provisional (Nov 24) | Nov 24 | art/REPORT.md: props 12/12 usable, characters consistent in 5 views, walk strip marginal. Needs owner sign-off on the look. |
| D-013 | Repo license: **All rights reserved** (proprietary LICENSE), public repo for visibility only | Decided | Nov 24 | Avoids clones on the stores. Can be relaxed later. |
| D-011 | Repo: public GitHub `Abraham12611/sneakaboo`, trunk-based with short branches | Decided | Nov 24 | No secrets in repo. |
| D-012 | Is a Base44 CLI/code workflow acceptable as "built with Base44"? | Open | | Owner must ask Base44 support or the contest Discord (task P0.5.1). Docs say nothing either way. |

## Open questions for the owner (updated Nov 24)
0. **P0.5.1:** ask Base44 about CLI-built apps (D-012). **G0 phone test:** open the spike on a real phone (see spike/RESULTS.md) and report FPS feel and touch controls. **Art look:** confirm the lower-pitch look in `art/p0-test/compare_mockup04_vs_composite.jpg` is acceptable, or ask for a steeper pitch.
1. Code license for the public repo (MIT vs all rights reserved until the contest ends)?
2. Does the owner want the game to be playable from the Base44 editor too, or is CLI-only fine (see D-012)?
3. Voice or no voice? (Recommendation: no voice, short grunts and a few kid exclamations from a free pack.)
4. Final choice of hero gender or look (Pip is neutral, yellow hoodie).
5. Should "fast-forward" (like Robbery Bob's button) exist? Recommendation: no, because the timer is the pressure. Instead add "Skip waiting" only in the editor test mode.

## Risks
| Id | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|-----------|--------|------------|-------|
| R-1 | The CLI workflow isn't accepted as "built with Base44" | Low-Med | Very high | Ask early (P0.5). Keep a Base44 project as source of truth, deployable from the editor. | |
| R-2 | Oblique art inconsistent, too slow | Med | High | G0 spike with strict pass criteria. Fallback top-down or code-drawn art. | |
| R-3 | Mobile performance (fog, cones, lights) | Med | High | Budget in plan/04. Phone test in P1 and P3. Quality toggle. | |
| R-4 | 9-day schedule too tight | High | High | Scope rule in plan/00. Greybox first. Levels 1-8 minimum. | |
| R-5 | AI feels unfair or buggy | Med | High | Fairness rules, telegraphing, tuning harness (P2.8), playtest. | |
| R-6 | Touch controls feel bad | Med | Med | Early phone test, adjustable layout. | |
| R-7 | Base44 plan limits (build, storage, requests) | Low-Med | Med | Check in P0.2. Avoid heavy backend use in contest build. | |
| R-8 | Security scan flags issues | Low | Med | Run scan in P5 (not on the last day). | |
| R-9 | iOS Safari audio/orientation quirks | Med | Med | First-tap audio unlock, rotate overlay, test on a real iPhone. | |
| R-10 | Public repo leaks something | Low | High | `.gitignore`, pre-commit secret scan (gitleaks) in P0.1. | |
| R-11 | Copyright concerns with look-alike of Robbery Bob | Low | High | Original characters and names, different theme (hide and seek), no copied UI art. Screenshots used only for camera reference. | |
| R-12 | Level content volume (10 levels with art) | Med | High | Reuse furniture across levels. Greybox levels first, art second. | |

## Change log
- Nov 24, 2026: initial plan created.
- Nov 24, 2026: P0.1 repo and tracking done; Base44 app created and deployed (https://sneakaboo-3e44fc26.base44.app); spike and art test completed; D-001/D-004/D-010 set provisionally; D-013 license decided.
