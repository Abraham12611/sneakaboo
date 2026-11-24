# 03 Repo, Tooling, and Workflow

## Accounts and tools (verified Nov 24, 2026)
| Tool | State |
|------|-------|
| GitHub CLI `gh` | Logged in as `Abraham12611`, token scopes include `repo`, `project`, `workflow`. |
| Repo | https://github.com/Abraham12611/sneakaboo, **public, empty**. |
| Base44 CLI `base44` | Installed. Commands seen: `create`, `link`, `login`, `whoami`, `entities push`, `functions deploy`, `deploy`, `dev`, `site deploy`, `build`, `auth`, `secrets`, `visibility`, `types generate`, `logs`, `dashboard`, `sandbox`, `branches`. Login state **not yet checked** (task P0.2.1). |
| Local folder | `c:\Users\DELL\workspace\Slinka` contains `README.md`, `docs/`, `mockups/`, `plan/`. Not yet a git repo. |

> The repo is **public**. Never commit secrets, tokens, `.env` files, or private keys. Use `base44 secrets set` for backend secrets.

## Repo layout (target)
Exact Base44 folders come from the CLI template. P0.3 confirms them. Target layout:
```
sneakaboo/
  README.md
  docs/                    design docs (what the game is)
  plan/                    this plan (how to build it)
  mockups/                 concept art
  base44/                  Base44 project config, entities, functions (per CLI template)
  src/                     frontend (Vite + React + TypeScript)
    app/                   screens, routing, React UI
    game/
      sim/                 pure logic, no DOM (see plan/04)
      view/                renderer, camera, projection, fx
      data/                object, seeker, booster definitions
      audio/
    ui/                    HUD components, buttons
  public/
    assets/                sprites, atlases, audio
  levels/                  L01.json ... L20.json, index.json
  tools/                   validate-levels, atlas packer, gh bootstrap script
  tests/                   sim unit tests, level validation tests
  .github/workflows/       CI (lint, test, validate levels)
```

## Branching
- `main` is always deployable to the Base44 preview.
- Work on short branches named `p<phase>/<topic>`, e.g. `p1/camera-zoom`.
- Merge by pull request (`gh pr create`, `gh pr merge --squash`) once checks pass. For solo speed during the contest, direct pushes to `main` are allowed for docs-only and tracker changes.
- Tag at the end of each phase: `git tag phase-1-done && git push --tags`.

## Commit and issue conventions
- Commit message: `P<phase>.<sub>.<task>: summary` (e.g. `P2.4.3: seeker returns to patrol`).
- GitHub **milestones** = phases (P0 to P11). GitHub **issues** = sub-phases (e.g. `P3.2 Hiding system`), each with its task checklist copied from the phase file.
- Labels: `phase:P0`..`phase:P11`, `type:engine`, `type:art`, `type:level`, `type:backend`, `type:ui`, `type:qa`, `contest-critical`, `blocked`.
- A GitHub Project board ("Sneakaboo") with columns Backlog, In progress, Review, Done. Requires `project` scope (already granted).

### Bootstrap commands (run in P0.1)
```powershell
cd c:\Users\DELL\workspace\Slinka
git init -b main
git remote add origin https://github.com/Abraham12611/sneakaboo.git
# .gitignore, LICENSE decision, then:
git add README.md docs plan mockups
git commit -m "P0.1.1: design docs, plan, mockups"
git push -u origin main

# milestones (one per phase)
gh api repos/Abraham12611/sneakaboo/milestones -f title="P0 Foundations" -f description="See plan/phases/phase-00-foundations.md"
# ...repeat per phase, or loop in tools/gh-bootstrap.ps1

# issues per sub-phase
gh issue create --title "P0.1 Repo and workflow" --body-file plan/phases/phase-00-foundations.md --milestone "P0 Foundations" --label "phase:P0"
```
The script `tools/gh-bootstrap.ps1` (task P0.1.4) parses `plan/phases/*.md` and creates all milestones and issues. It must be **idempotent** (skip existing).

## Base44 CLI workflow
Confirm each command's flags with `base44 <cmd> --help` before first use.

| Goal | Command |
|------|---------|
| Check login | `base44 whoami` |
| Log in | `base44 login` |
| New project from template | `base44 create sneakaboo --template backend-and-client` (template ids seen in help: `backend-only`, `backend-and-client`) |
| Link existing folder to a Base44 app | `base44 link --create --name sneakaboo` or `base44 link` to pick an existing one |
| Local dev server | `base44 dev` (add `--remote` to use the production backend) |
| Site-only dev server | `base44 site dev` |
| Install site deps | `base44 site install` |
| Build the site | `base44 build` |
| Push entities | `base44 entities push` |
| Deploy functions | `base44 functions deploy [names...]` |
| Deploy everything | `base44 deploy --yes` (add `--build` to build first) |
| Deploy only the site | `base44 site deploy` |
| Open the live site | `base44 site open` |
| Set app public | `base44 visibility public` |
| Secrets | `base44 secrets set KEY=VALUE`, `base44 secrets list` |
| Function logs | `base44 logs` |
| Generate TS types from entities | `base44 types generate` |
| Auth settings (post-contest) | `base44 auth ...` (**keep disabled in the contest build**) |
| Machine-readable output | add `--json` to any command |
| Target a specific app | `--app-id <id>` or env `BASE44_APP_ID` |
| Branch-specific work | `--branch <name>` (sandbox commands) |

### Environments
| Env | Purpose |
|-----|---------|
| Local | `base44 dev` for coding. |
| Preview or branch | `base44 sandbox` or a branch app (explore with `base44 branches`) for testing risky changes. |
| Production | The public app used for Launchpad. Deploy only from `main` after tests pass. |

### CI (GitHub Actions)
- On every push and PR: install, typecheck, lint, unit tests, **validate all level JSON files**, build.
- Deploy to Base44 is **manual** (`base44 deploy --yes`) during the contest. Do not put the Base44 token in the public repo. If CI deploy is added later, store the token in GitHub secrets.

## Open workflow question (resolve in P0.5)
The contest says the game must be **built with Base44** and hosted on a **Base44 URL**. Building locally with the Base44 CLI and deploying to Base44 hosting should satisfy hosting. Confirm with Base44 support or the contest Discord that a CLI/code workflow counts as "built with Base44". Fallback: keep the Base44 project as the source of truth and apply the final code through the Base44 editor.

## Code quality
- TypeScript strict. ESLint + Prettier. Vitest for the sim and validator.
- The sim must run in Node (headless) so AI and levels can be tested with no browser.
- No `any` in the sim. No DOM imports in `game/sim`.

## Licenses and assets
- Code license: decide in P0.1 (MIT is fine for a public repo, or keep "all rights reserved" until after the contest).
- All art and audio must be original or licensed for commercial use. Keep `CREDITS.md` current from the first asset. Include the generating model name and date for AI art.
- Do not copy any Robbery Bob art, names, or UI. The screenshots are used only as mechanical and camera reference.
