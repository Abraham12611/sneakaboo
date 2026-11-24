# Phase 6: Backend on Base44 (lite for contest)

**Target:** Nov 30-Dec 1 (parallel lane) | **Contest critical:** optional | **Milestone:** `P6 Backend`
**Depends on:** P0.5 results, P3.7 (run results data).

**Goal:** per-level leaderboards and the backend scaffolding that later phases (sharing, daily challenge) use. The game must keep working if the backend is missing.

**Read first:** `plan/05-backend-base44-spec.md`.

> If the schedule is tight, do only P6.4 (deploy pipeline) and skip the rest until after the contest.

---

## P6.1 Entities and permissions
Acceptance: entities are pushed; permissions match the table in `plan/05`; anonymous clients cannot write entities directly.
- [ ] P6.1.1 Create `LevelRun` entity definition.
- [ ] P6.1.2 Create stubs for `SharedLevel`, `Report` (empty, for P9).
- [ ] P6.1.3 `base44 entities push` and verify in the dashboard (`base44 dashboard`).
- [ ] P6.1.4 Set access rules; test with anonymous calls.
- [ ] P6.1.5 `base44 types generate` and commit types.

## P6.2 Functions
Acceptance: functions deployed and callable by guests; invalid input is rejected with clear errors.
- [ ] P6.2.1 `submitRun`: validation (level exists, time bounds, star consistency, rate limit), best-per-guest storage.
- [ ] P6.2.2 `getLeaderboard`: top N + caller rank, small cache.
- [ ] P6.2.3 `ping` health function.
- [ ] P6.2.4 `base44 functions deploy` and `base44 functions list`.
- [ ] P6.2.5 Min-time table generated from the level validator (`levels/minTimes.json`) and read by `submitRun`.
- [ ] P6.2.6 Unit tests for the validation logic (run locally).

## P6.3 Guest identity and names
Acceptance: each device has a stable guest id and a friendly generated name with no personal data.
- [ ] P6.3.1 UUID guest id in localStorage.
- [ ] P6.3.2 Name generator ("Sneaky Fox 42"), rename with profanity filter.
- [ ] P6.3.3 Privacy copy: what is stored, no personal data.

## P6.4 Deploy pipeline
Acceptance: one documented command sequence deploys everything and a smoke test verifies it.
- [ ] P6.4.1 `tools/deploy.ps1`: tests, validate levels, build, `base44 entities push`, `functions deploy`, `deploy --yes`.
- [ ] P6.4.2 Environment handling for local vs production API.
- [ ] P6.4.3 Smoke test script (curl `ping`, fetch the home page).
- [ ] P6.4.4 Rollback note (redeploy previous git tag with `--git-hash`).
- [ ] P6.4.5 Documented in `plan/03`.

## P6.5 Security and privacy
- [ ] P6.5.1 Threat review: spam, fake times, oversized payloads, name abuse.
- [ ] P6.5.2 Rate limits and size limits enforced in functions.
- [ ] P6.5.3 No secrets in repo; `base44 secrets list` reviewed.
- [ ] P6.5.4 Privacy notes and kid-safe naming rules.
- [ ] P6.5.5 Check backend logs (`base44 logs`) for errors after a test burst.

## P6.6 Client integration and offline behavior
Acceptance: leaderboards show if available, are invisible if not; no gameplay blocking.
- [ ] P6.6.1 `ApiService` with timeout, retry, silent failure, `FEATURE_ONLINE` flag.
- [ ] P6.6.2 Results screen: "Your rank" and a small top-5 list for the level.
- [ ] P6.6.3 Level select shows personal best times locally and global best when online.
- [ ] P6.6.4 Test in airplane mode: no errors, no spinners.
- [ ] P6.6.5 Load test: 200 submits in a minute from a script; check limits.

---

## Exit criteria
- [ ] Game works with the backend disabled.
- [ ] Leaderboard works for at least L1-L3 live (optional for contest).
- [ ] Deploy script documented and reproducible.
