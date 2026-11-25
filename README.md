# SNEAKABOO (working title)

A top-down stealth hide-and-seek game. You are **Pip**, a kid in a yellow hoodie. Sneak from one end of the house to **Home Base** before the timer runs out, and without the seekers finding you.

First release: web game (desktop + mobile landscape) built in **Base44** for the Base44 x Nitro $65K Web Game Contest. **Submissions close Dec 3, 2026 23:59 UTC.**
Later: iOS and Android store releases, then a level builder with shareable levels.

## Design docs

| # | File | What it covers |
|---|------|----------------|
| 00 | [docs/00-vision-and-contest.md](docs/00-vision-and-contest.md) | Pitch, pillars, contest rules and what they mean for design |
| 01 | [docs/01-name-brainstorm.md](docs/01-name-brainstorm.md) | Name ideas and shortlist |
| 02 | [docs/02-core-mechanics.md](docs/02-core-mechanics.md) | Movement, noise, vision, hiding, timer, stars, win/lose |
| 03 | [docs/03-searchable-objects.md](docs/03-searchable-objects.md) | Everything Pip can search or interact with |
| 04 | [docs/04-items-keys-boosters.md](docs/04-items-keys-boosters.md) | Keys, clues, potions, gadgets, collectibles |
| 05 | [docs/05-seeker-ai.md](docs/05-seeker-ai.md) | Seeker types, state machine, numbers |
| 06 | [docs/06-difficulty-and-progression.md](docs/06-difficulty-and-progression.md) | Difficulty ramp, zones, tuning knobs |
| 07 | [docs/levels/levels-01-05.md](docs/levels/levels-01-05.md) | Levels 1-5 |
| 08 | [docs/levels/levels-06-10.md](docs/levels/levels-06-10.md) | Levels 6-10 |
| 09 | [docs/levels/levels-11-15.md](docs/levels/levels-11-15.md) | Levels 11-15 |
| 10 | [docs/levels/levels-16-20.md](docs/levels/levels-16-20.md) | Levels 16-20 |
| 11 | [docs/07-level-data-format.md](docs/07-level-data-format.md) | JSON level format (shared by game and editor) |
| 12 | [docs/08-level-builder-and-sharing.md](docs/08-level-builder-and-sharing.md) | Level editor, share codes, community features |
| 13 | [docs/09-ui-ux-and-controls.md](docs/09-ui-ux-and-controls.md) | Screens, HUD, desktop and mobile landscape controls |
| 14 | [docs/10-art-audio-direction.md](docs/10-art-audio-direction.md) | Visual style, palette, sound, juice |
| 15 | [docs/11-tech-plan-base44.md](docs/11-tech-plan-base44.md) | Architecture for Base44 web build |
| 16 | [docs/12-economy-and-meta.md](docs/12-economy-and-meta.md) | Coins, cosmetics, daily challenge, achievements |
| 17 | [docs/13-mobile-store-roadmap.md](docs/13-mobile-store-roadmap.md) | App Store / Play Store plan |
| 18 | [docs/14-nine-day-contest-plan.md](docs/14-nine-day-contest-plan.md) | Day-by-day plan to Dec 3 |
| 19 | [docs/15-base44-build-prompts.md](docs/15-base44-build-prompts.md) | Ready-to-paste prompts for Base44 |
| 20 | [docs/16-mockups.md](docs/16-mockups.md) | Generated mockups with prompts |
| 21 | [docs/17-floor-plan-and-layout-principles.md](docs/17-floor-plan-and-layout-principles.md) | Real floor plans, 12 archetypes, layout rules (read before designing any level) |

Mockup images are in `mockups/`.

## Build plan (phases and tracking)
Planning only so far. Start at [plan/00-index-and-progress-tracker.md](plan/00-index-and-progress-tracker.md).

| File | Purpose |
|------|---------|
| [plan/00-index-and-progress-tracker.md](plan/00-index-and-progress-tracker.md) | Phase map, gates, progress table, conventions |
| [plan/01-view-camera-and-rendering-spec.md](plan/01-view-camera-and-rendering-spec.md) | Oblique view, scrolling zoomable camera, fog, fallback to top-down |
| [plan/02-hiding-system-spec.md](plan/02-hiding-system-spec.md) | Hiding under beds, in wardrobes, behind chairs, under tables, and more |
| [plan/03-repo-tooling-and-workflow.md](plan/03-repo-tooling-and-workflow.md) | GitHub repo, `gh`, Base44 CLI, branching, CI |
| [plan/04-architecture-and-code-structure.md](plan/04-architecture-and-code-structure.md) | Sim/view split, systems, save data, performance budget |
| [plan/05-backend-base44-spec.md](plan/05-backend-base44-spec.md) | Entities, functions, rules for the no-login contest build |
| [plan/06-art-pipeline.md](plan/06-art-pipeline.md) | Style lock, sprite production, asset list |
| [plan/07-testing-and-qa.md](plan/07-testing-and-qa.md) | Tests, solver bot, playtests, smoke test |
| [plan/08-decisions-and-risks.md](plan/08-decisions-and-risks.md) | Decision log, open questions, risk register |
| [plan/phases/](plan/phases/) | `phase-00` to `phase-11`, each with sub-phases and checkbox tasks |
