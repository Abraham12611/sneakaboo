# 08 Decisions and Risks Log

Update this file when a decision is made or a risk changes. Decision ids are permanent.

## Decisions
| Id | Decision | Status | Date | Notes |
|----|----------|--------|------|-------|
| D-000 | Game name: **Sneakaboo**. Hero: Pip. | Decided | Nov 24 | Owner likes it. Trademark and store-name check still to do (P10). |
| D-001 | View: **oblique (mockup 04 look)** preferred, flat top-down fallback | Pending G0 | | Spike P0.4 decides. Sim is flat in both. |
| D-002 | Camera: scrolling follow camera with **player zoom** (0.6-1.8) | Decided | Nov 24 | Owner request. Per-level min zoom and fog to prevent exploits. |
| D-003 | Sim and view separated, sim headless | Decided | Nov 24 | Enables tests, AI tuning, future native. |
| D-004 | Renderer: PixiJS v8 (default) vs Canvas 2D | Pending G0 | | Decide in P0.4 after a phone test. |
| D-005 | Language: TypeScript strict, Vite + React shell | Proposed | | Confirm with the Base44 template in P0.3. |
| D-006 | No login anywhere in the contest build; guest id in localStorage | Decided | Nov 24 | Contest rule. |
| D-007 | Backend optional; game works offline | Decided | Nov 24 | Backend only through functions. |
| D-008 | Hiding system: cover levels Full / Partial / Shadow, telegraphed seeker checks | Decided | Nov 24 | See `plan/02`. |
| D-009 | Stairs and floors are Tier 1 | Decided | Nov 24 | Levels 7, 9 need them. |
| D-010 | Art: AI-generated sprites with a style bible, fall back to code-drawn shapes | Proposed | | Decide after P0.4 art test. |
| D-011 | Repo: public GitHub `Abraham12611/sneakaboo`, trunk-based with short branches | Decided | Nov 24 | No secrets in repo. |
| D-012 | Is a Base44 CLI/code workflow acceptable as "built with Base44"? | Open | | Ask Base44 support or Discord (P0.5). |

## Open questions for the owner
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
