# Phase 0: Foundations and Decisions

**Target:** Nov 24-25 | **Contest critical:** yes | **Gate:** G0 (view decision) | **Milestone:** `P0 Foundations`
**Status:** Not started (waiting for owner go-ahead)

**Goal:** a working repo, a linked Base44 project, a proven toolchain, and a **decision** on view and renderer made from a real spike, not from opinion.

**Read first:** `plan/01`, `plan/03`, `plan/06`, `docs/00`, `docs/11`.

---

## P0.1 Repo and GitHub workflow
Acceptance: `main` on GitHub has docs, plan, mockups. Milestones and issues exist. CI skeleton runs.
- [x] P0.1.1 `git init -b main` in `c:\Users\DELL\workspace\Slinka`, add remote `https://github.com/Abraham12611/sneakaboo.git`. (2026-11-24)
- [x] P0.1.2 Add `.gitignore` (node_modules, dist, .env*, .base44 local state if any, OS files), `LICENSE` decision, `CREDITS.md` stub. (2026-11-24)
- [x] P0.1.3 First commit and push: `README.md`, `docs/`, `plan/`, `mockups/` (check image sizes, total under 30 MB). (2026-11-24)
- [x] P0.1.4 Write `tools/gh-bootstrap.ps1` to create labels, milestones P0-P11, and one issue per sub-phase from `plan/phases/*.md` (idempotent). Run it. (2026-11-24)
- [x] P0.1.5 Create GitHub Project board "Sneakaboo" (`gh project create`), link issues. (2026-11-24)
- [x] P0.1.6 Add secret scanning: gitleaks pre-commit and GitHub secret scanning enabled. (2026-11-24)
- [x] P0.1.7 CI workflow stub: install, typecheck, lint, test, validate levels, build (jobs may be no-ops until code exists). (2026-11-24)

## P0.2 Base44 project and CLI auth
Acceptance: `base44 whoami` works. A Base44 app exists for Sneakaboo. A "hello" deploy opens at a Base44 URL.
- [x] P0.2.1 `base44 whoami`; if needed `base44 login`. (2026-11-24)
- [x] P0.2.2 Decide create path: `base44 create sneakaboo --template backend-and-client` into a temp folder then merge into the repo, **or** `base44 link --create --name sneakaboo` inside the repo. Record the choice in D-005. (2026-11-24)
- [x] P0.2.3 Record the **app id** (not secret) in `docs/` or `.env.example` as `BASE44_APP_ID`. (2026-11-24)
- [~] P0.2.4 Check plan limits (builds, storage, function calls, custom code) to see if they fit a public contest. Note in R-7.
- [x] P0.2.5 First deploy: `base44 deploy --yes` of a placeholder page, open with `base44 site open`. (2026-11-24)
- [x] P0.2.6 `base44 visibility public` to test anonymous access (revert if desired). (2026-11-24)
## P0.3 Scaffold inspection and toolchain
Acceptance: the team can run `base44 dev`, hot reload works, TypeScript and Vitest run.
- [ ] P0.3.1 Document what the template generated (folders, framework, build tool, where entities and functions live) in `plan/03` under a new section.
- [~] P0.3.2 Run `base44 site install` and `base44 dev`; verify hot reload on a phone on the same network (or via a tunnel).
- [ ] P0.3.3 Add TypeScript strict, ESLint, Prettier, Vitest.
- [ ] P0.3.4 Add the folder layout from `plan/03` (empty modules with README stubs).
- [x] P0.3.5 `base44 types generate` and confirm it works (even with no entities). (2026-11-24)
- [~] P0.3.6 Confirm the bundler handles PixiJS and asset imports (small test).

## P0.4 View and renderer spike (decides G0)
Acceptance: a throwaway prototype page meets the pass table in `plan/01`. Decision recorded in D-001 and D-004.
- [x] P0.4.1 Build `ObliqueProjection` and `TopDownProjection` behind one interface. (2026-11-24)
- [x] P0.4.2 Render one room: floor, walls with extruded faces, bed, wardrobe, table with cloth, sofa, plant, door (placeholder boxes with correct footprints and heights). (2026-11-24)
- [x] P0.4.3 Pip moves with keyboard and a touch joystick, collides with furniture footprints. (2026-11-24)
- [x] P0.4.4 Zoom 0.6-1.8 with wheel, pinch, buttons. Follow camera with deadzone and clamping. (2026-11-24)
- [x] P0.4.5 Occlusion fade for objects in front of Pip. Silhouette outline. (2026-11-24)
- [x] P0.4.6 One seeker with a wall-clipped cone drawn through both projections. (2026-11-24)
- [x] P0.4.7 Room fog dimming for a second room. (2026-11-24)
- [~] P0.4.8 Measure FPS on a real phone and a laptop in both renderers (Pixi and Canvas) with 3 seekers and cones.
- [x] P0.4.9 Run the art test (P0.6) inside the prototype: real sprites in the room. (2026-11-24)
- [~] P0.4.10 Fill in the decision table, update `plan/08` (D-001, D-004, D-010), tag `g0-view-decision`.

## P0.5 Contest compliance and platform checks
Acceptance: written answers for D-012 and the anonymous access check.
- [ ] P0.5.1 Ask Base44 support or the contest Discord whether a CLI/code workflow counts as "built with Base44". Save the answer in `plan/08`.
- [ ] P0.5.2 Verify the app can be published as **public, no login** and that anonymous users can load it.
- [ ] P0.5.3 Verify anonymous visitors can call a deployed function (smoke function `ping`) with no login.
- [ ] P0.5.4 Re-read the contest FAQ and Launchpad doc for changes; note deadline and submission mechanics.
- [ ] P0.5.5 Confirm age (18+) and entrant requirements with the owner.

## P0.6 Style lock and art test
Acceptance: Style Bible approved by the owner. 12 props + Pip + Grandma test sheet looks like mockup 04.
- [x] P0.6.1 Write the Style Bible (`plan/06` has the spec). (2026-11-24)
- [x] P0.6.2 Generate a prop sheet (12 items) with the fixed prompt prefix, transparent background. (2026-11-24)
- [x] P0.6.3 Generate Pip and Grandma turnarounds; try 5-direction walk strips. (2026-11-24)
- [x] P0.6.4 Slice and import into the P0.4 prototype. Compare side by side with mockup 04. (2026-11-24)
- [~] P0.6.5 Choose the character approach: generated frames vs layered/skeletal. Record in D-010.
- [ ] P0.6.6 Owner review and sign-off.

---

## Deliverables
Repo with tracking, Base44 app deployed, prototype branch `spike/view`, decisions D-001/D-004/D-010/D-012 resolved.

## Exit gate G0 checklist
- [ ] View decided (oblique or top-down)
- [ ] Renderer decided
- [ ] CLI workflow is acceptable for the contest
- [ ] Anonymous access works
- [ ] Style bible approved

## Out of scope
Any real gameplay beyond what the spike needs.
