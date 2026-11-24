# 05 Backend Spec (Base44)

The backend is built and deployed with the **Base44 CLI**. The game must work with **no backend and no login** for the contest. The backend is additive.

## Hard rules
1. **No login, ever, in the contest build.** Do not enable `base44 auth` login methods. Players are anonymous guests with a device id.
2. **Offline first.** If an API call fails, the game continues and queues or drops the request. No blocking spinners.
3. **Public app, public repo:** no secrets in code. Use `base44 secrets set`.
4. **Server validates everything.** The client is untrusted (times, level JSON, names).
5. **Privacy:** no personal data. Display names are generated or filtered. Do not collect location, email, or contacts. Kids audience in mind.

## What needs a backend (and when)
| Feature | Phase | Needs backend? | Contest build? |
|---------|-------|----------------|----------------|
| Play levels, save progress | P1-P5 | No (localStorage) | Yes |
| Per-level leaderboard (best times) | P6 | Yes | Optional (nice for votes) |
| Share a built level by link (long URL) | P9 | No (URL encoded) | No |
| Short share codes, gallery | P9 | Yes | No |
| Daily challenge seed | P11 | Light (function by date) | No |
| Reports and moderation | P9 | Yes | No |
| Cloud save and accounts | P10-P11 | Yes + auth | No |
| Analytics (aggregate, anonymous) | P10-P11 | Yes | No |

## Entities (Base44 data models)
Defined as files in the project's entities folder (format per CLI template, confirm in P0.3), then `base44 entities push`.

### `LevelRun` (P6)
| Field | Type | Notes |
|-------|------|-------|
| levelId | string | "L01"... or shared code |
| guestId | string | UUID from localStorage |
| displayName | string | Generated e.g. "Sneaky Fox 42", filtered, max 20 |
| timeMs | number | Completion time |
| stars | number | 1-3 |
| spotted | number | Count |
| buildVersion | string | Game build id (for balancing) |
| replayHash | string | Optional, phase 3 |
| createdAt | datetime | Server time |
Indexes (if supported): levelId + timeMs.

### `SharedLevel` (P9)
`code` (unique, short like AB12-XY), `name`, `creatorName`, `guestId`, `json` (string, max 64 KB), `difficulty` (1-5), `plays`, `clears`, `likes`, `status` (active, hidden, removed), `createdAt`, `schemaVersion`.

### `LevelScore` / best-per-guest (P9)
`levelCode`, `guestId`, `bestTimeMs`, `stars`, `updatedAt`.

### `Report` (P9)
`levelCode`, `reason` (enum), `note` (max 140), `guestId`, `createdAt`, `handled` (bool).

### `DailyChallenge` (P11)
`date`, `seed`, `templateId`, `rewardCoins`. Can be computed by a function without an entity.

### `AnalyticsEvent` (P10, optional)
`name`, `levelId`, `value`, `buildVersion`, `day`. Aggregated only. Needs a privacy review.

## Access rules
Confirm in P6.1 how Base44 expresses per-entity permissions (read/create/update/delete for anonymous vs authenticated). Target:
| Entity | Anonymous read | Anonymous create | Update/Delete |
|--------|---------------|------------------|---------------|
| LevelRun | via function only (top N) | via function only | none |
| SharedLevel | via function | via function | none (only the function) |
| Report | none | via function | admin only |
Prefer **functions as the only door**: the client never writes entities directly, so server code can validate, rate limit, and filter.

## Backend functions (`base44 functions deploy`)
| Function | Input | Behavior |
|----------|-------|----------|
| `submitRun` | levelId, guestId, timeMs, stars, spotted, build | Validates: level exists, `timeMs` between `minPossible` and `timeLimit`, stars consistent, guest rate limit (e.g. 20 per hour). Stores only the best per guest per level. Returns rank. |
| `getLeaderboard` | levelId, limit | Top N plus the caller's rank. Cacheable. |
| `publishLevel` (P9) | json, name, guestId | Validates schema and size, runs the **same level validator as the client** (shared code), profanity filter, unique code generation, rate limit. |
| `getLevel` (P9) | code | Returns JSON, increments plays. |
| `reportLevel` (P9) | code, reason | Creates a Report. Auto-hide at N reports. |
| `getDaily` (P11) | date | Deterministic seed from date and secret salt. |
Shared validator: keep it in a package or folder that both the frontend and functions import (see `tools/` and `levels/schema`), so rules never drift.

### Anti-cheat (lightweight)
- Minimum plausible time per level computed by the validator (shortest path at run speed + required searches) times 0.8. Anything faster is rejected.
- Rate limits per guest id and IP (if provided by the platform).
- Replay hashes later. Leaderboards are for fun; do not gate prizes on them.

## Secrets (`base44 secrets set`)
`DAILY_SALT`, `MODERATION_API_KEY` (if used). Never in the repo.

## Auth (post-contest)
When accounts arrive (cloud save, creator profiles): enable one social login via `base44 auth social-login <provider> enable`, keep guests playable, migrate guest data on first sign-in. Not in the contest build.

## Deploy flow
1. `base44 entities push`
2. `base44 functions deploy`
3. `base44 types generate` (TS types for entities used by the frontend)
4. `base44 build` then `base44 site deploy` or `base44 deploy --yes`
5. `base44 visibility public`
6. Smoke test on the live URL (see `plan/07`).

## Client API wrapper
`ApiService` hides Base44 SDK calls. Methods: `submitRun`, `getLeaderboard`, `publishLevel`, `getLevel`. All have a 4 s timeout, 1 retry, silent failure for non-essential calls. A `FEATURE_ONLINE` flag disables everything cleanly.

## Verification tasks (P0 and P6)
- [ ] Anonymous (not logged in) visitors can call the app's functions on a public Base44 app.
- [ ] Entity permission model understood and set to the table above.
- [ ] The free/builder plan limits (requests, storage) known and sufficient for a public contest burst (assume thousands of runs).
- [ ] What happens if the backend rate-limits: the client degrades gracefully.
