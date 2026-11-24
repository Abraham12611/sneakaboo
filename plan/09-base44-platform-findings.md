# 09 Base44 Platform Findings (P0.5 / P6 groundwork)

Verified 2026-11-24 against app `6b05cf93a9f18a7b3e44fc26` (live `https://sneakaboo-3e44fc26.base44.app`, visibility public) with the `base44` CLI. All HTTP tests were made from PowerShell with **no auth header or token**.

## Summary
| Q | Answer |
|---|--------|
| Q1 Anonymous function call | **Yes.** |
| Q2 Anonymous entity access | **Yes when RLS is open** (create/read/update/delete all worked). Locked with an admin-only RLS it is denied. |
| Q3 Validated, rate-limited submit pattern | **Works** (400 / 429 / rank all verified). |
| Q4 Plans and limits | Partly known, see below. |
| Q5 Guests calling functions via SDK | **Yes** (same endpoint, no token needed). Not tested from a browser SDK build. |
| Q6 `base44 dev`, `types generate` | **Both work.** |

## Q1 Anonymous function calls
Function: `base44/functions/ping/entry.ts` (kept as health check):
```js
export default async function(req) {
  return Response.json({ ok: true, service: 'sneakaboo', time: new Date().toISOString() });
}
```
Deploy: `npx base44 functions deploy ping` (output `ping deployed`).

URL patterns, each returned HTTP 200 with GET and POST and no auth:
| URL | Result |
|-----|--------|
| `https://sneakaboo-3e44fc26.base44.app/functions/ping` | 200 (documented form) |
| `https://sneakaboo-3e44fc26.base44.app/api/functions/ping` | 200 |
| `https://base44.app/api/apps/6b05cf93a9f18a7b3e44fc26/functions/ping` | 200 (this is what the SDK uses) |
| `https://app.base44.com/api/apps/<id>/functions/ping` | **403** (do not use) |

CORS: `OPTIONS` preflight and `POST` return `Access-Control-Allow-Origin: *` for any Origin (tested `localhost:5173`, the app domain, and a foreign origin). So the game can call functions from another host (for example an itch.io iframe) as long as it builds the URL itself.

Recommendation: the client calls `base44.functions.invoke('name', payload)` when hosted on Base44 and falls back to `fetch('https://base44.app/api/apps/<id>/functions/<name>')` when not.

## Q2 Entity access for anonymous visitors
Entity REST path (works on both hosts): `https://base44.app/api/apps/<id>/entities/<Entity>` (`GET` list, `POST` create, `GET/PUT/DELETE /<recordId>`).

Entity file shape that was accepted (`base44/entities/ProbeRun.jsonc`; top-level `name`, `type`, `properties`, `rls`):
```jsonc
{
  "name": "ProbeRun",
  "type": "object",
  "properties": {
    "levelId": { "type": "string" },
    "guestId": { "type": "string" },
    "timeMs": { "type": "number" }
  },
  "rls": { "read": {}, "create": {}, "update": {}, "delete": {} }
}
```
### Open RLS (`{}` on every operation)
Anonymous results: create 200 (record gets `created_by_id: "anonymous"`), list 200, update 200 (anyone can change anyone's record), delete 200. **Never ship this.**

### Locked RLS (working)
```jsonc
"rls": {
  "read":   { "user_condition": { "role": "admin" } },
  "create": { "user_condition": { "role": "admin" } },
  "update": { "user_condition": { "role": "admin" } },
  "delete": { "user_condition": { "role": "admin" } }
}
```
Anonymous results after `npx base44 entities push --yes`:
| Operation | Result |
|-----------|--------|
| `POST` create | **403** |
| `GET` list | 200 with `[]` (rows exist but are filtered out, not an error) |
| `GET /<id>` on an existing row | 404 |
| `PUT /<id>` on an existing row | **403** |
| `DELETE /<id>` on an existing row | 404 (row is invisible to the caller) |
| `POST /bulk` | 403 |
A backend function using `base44.asServiceRole.entities.X` still reads, writes and deletes (service role skips RLS). Verified with create, filter and delete.

Notes:
- `false` is **not** reliable for `create`/`update` (the RLS guide says they are treated as open). Use the admin `user_condition`; no anonymous visitor satisfies it.
- Do not use an impossible filter such as `{ "id": { "$exists": false } }`; that works as "nobody" but also locks out admins.
- A leaderboard read could be left public with a filter on the fields only (`"read": {}`), but it exposes `guestId`. Prefer a `getLeaderboard` function that returns only safe fields.

## Q3 `submitRun` pattern (probe code, now deleted from remote)
Tested with a function named `probeSubmit` on entity `ProbeRun`. Results (anonymous):
| Call | Result |
|------|--------|
| valid (`levelId` "L01", `guestId` "guest-aaaa-1111", `timeMs` 8900) | 200 `{"ok":true,"rank":1,"players":1,"best":8900}` |
| `timeMs` 500 | 400 |
| `levelId` longer than 16 chars | 400 |
| `timeMs` as string | 400 |
| body not JSON | 400 |
| 6th valid call in one minute for the same guest | **429** (`Retry-After: 60`) |
| second guest, same level | 200, `players: 2` |
| direct anonymous `POST` to the entity | 403 |

Source (works as is; rename entity and fields for `LevelRun`):
```js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { levelId, guestId, timeMs } = body || {};
    if (typeof levelId !== 'string' || levelId.length < 1 || levelId.length > 16) {
      return Response.json({ error: 'bad levelId' }, { status: 400 });
    }
    if (typeof guestId !== 'string' || guestId.length < 8 || guestId.length > 64) {
      return Response.json({ error: 'bad guestId' }, { status: 400 });
    }
    if (typeof timeMs !== 'number' || !Number.isFinite(timeMs) || timeMs < 1000 || timeMs > 600000) {
      return Response.json({ error: 'bad timeMs' }, { status: 400 });
    }
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities.ProbeRun;

    const since = new Date(Date.now() - 60000).toISOString();
    const recent = await db.filter({ guestId, created_date: { $gte: since } }, '-created_date', 10);
    if (recent.length >= 5) {
      return Response.json({ error: 'rate limited' }, { status: 429, headers: { 'Retry-After': '60' } });
    }

    await db.create({ levelId, guestId, timeMs: Math.round(timeMs) });

    const all = await db.filter({ levelId }, 'timeMs', 1000);
    const best = new Map();
    for (const r of all) {
      const cur = best.get(r.guestId);
      if (cur === undefined || r.timeMs < cur) best.set(r.guestId, r.timeMs);
    }
    const mine = best.get(guestId);
    let rank = 1;
    for (const t of best.values()) if (t < mine) rank++;
    return Response.json({ ok: true, rank, players: best.size, best: mine });
  } catch (error) {
    return Response.json({ error: 'server error' }, { status: 500 });
  }
}
```
Gotchas and limits of this probe:
- `filter(query, sort, limit)` positional form worked; the skill doc also shows an options object, and `filter` returned arrays here.
- Rank loads up to 1000 rows per level. For a real leaderboard store one best row per `(levelId, guestId)` (update instead of create) so the table stays small.
- The rate limit is per **client-supplied** `guestId`, so a cheater can rotate ids. Add an IP-based limit if the platform exposes the caller IP (not verified), or accept it for a fun leaderboard.
- Caller errors return 4xx before any work, as the skill requires.

## Q4 Limits and plans (only what was verified)
- Docs ([pricing](https://docs.base44.com/developers/backend/overview/pricing)): the backend service is in beta, free, no separate backend subscription. Backend operations use the workspace's integration credits, which every plan includes.
- [Backend functions overview](https://docs.base44.com/developers/backend/resources/backend-functions/overview), per call: 5 min run time (504 `Timeout`), 5 min CPU (429 `cpu-exceeded`), 10,000 outgoing requests (429 `subrequests-exceeded`), 128 MB memory. A chain of functions calling each other is limited to 7.
- Plan page ([base44.com/pricing](https://base44.com/pricing)): Free = 25 message credits per month, 100 integration credits, up to 5 apps. Starter $16, Builder $40, Pro $80, Elite $160 per month billed annually; Builder has 250 message and 10,000 integration credits.
- The bundled agent skill says functions "require the Builder plan or above". Deploying and calling `ping` worked on this workspace, so either the workspace plan allows it or the beta is free as the docs say. **Unknown:** this workspace's plan, and whether the entitlement could be revoked.
- **Unknown (not found in docs):** invocations per month, entity record caps, storage caps, per-IP or per-app request rate limits, and whether a function call or entity write consumes integration credits. Ask the owner to check the dashboard usage page after a load test.
- **Unknown:** whether a CLI-deployed custom-code app counts as "built with Base44". Nothing in the docs mentions it. This stays P0.5.1 for the owner.

## Q5 Guests and the SDK
- `base44.functions.invoke(name, payload)` posts to `/api/apps/<id>/functions/<name>` (the `base44.app` form that returned 200 above). With no logged-in user the SDK sends no user token, and the endpoint accepted the anonymous call. In the function, `createClientFromRequest(req)` gives a client without a user; use `asServiceRole` for data access.
- The call is documented as "no authenticated user context" for plain HTTP.
- Not tested: a real browser run of the SDK. Do this in P6 on the live URL.
- `base44 auth pull` (read-only, writes a local file that I deleted again) shows the app **already has** `enableUsernamePassword: true` and `enableGoogleLogin: true` (platform defaults, not changed by us). This does **not** force login: anonymous calls and the public page worked. Do not run `auth push`. The owner may want to turn the login methods off in the dashboard only if the contest rules prefer it; not required.

## Q6 Dev server and types
- `npx base44 dev` started in about 5 s: backend at `http://localhost:4400` (loaded functions and entities), Vite frontend at `http://localhost:5173`, with `/api/apps` and `/api/app-logs` proxied to 4400. Stopped afterwards; ports 4400 and 5173 are free.
- `GET /functions/ping` on port 4400 returned 404; the local function route probably uses the `/api/apps/<id>/functions/<name>` form (not checked).
- `npx base44 types generate` writes `base44/.types/types.d.ts` (git-ignored).
- `base44 exec` needs Deno installed; not available here.

## Other gotchas
- **`base44 entities push` deletes remote entities that are not in `base44/entities/`.** The first push reported `Deleted: User` (a custom User config was absent locally). Always keep every entity file in the repo before pushing.
- With zero local entity files, push says `No entities found in project` and does nothing, so there is no way to delete the last entity with `entities push`.
- `base44 functions delete <names...>` exists and works. `functions deploy --force` removes remote functions not found locally.
- The `deploy` of functions is idempotent: unchanged code reports `unchanged`.
- Functions use `entry.ts` naming but plain JavaScript syntax (no type annotations). Function names are camelCase.
- Relative imports may reach `base44/shared/` but **cannot** leave `base44/` (no `src/` imports). The shared level validator must be copied or built into `base44/shared/`. Each function deploys its own copy, so redeploy all functions (`base44 functions deploy` with no names) after changing shared code.
- The docs' HTTP form `https://<app-domain>/functions/<name>` has no token requirement for guests.
- PowerShell: `npx` writes progress to stderr, so `2>&1` shows a `NativeCommandError` banner even on success. Check the exit code.

## Recommended pattern for `LevelRun` / `submitRun`
Entity `base44/entities/LevelRun.jsonc` with the same locked `rls` as above (all four operations admin only). Fields: `levelId`, `guestId`, `displayName`, `timeMs`, `stars`, `spotted`, `buildVersion`. One row per `(levelId, guestId)` holding the best time.

Functions (all anonymous callable, all data access through `asServiceRole`):
- `submitRun`: validate types and ranges (400), check the level id exists and `timeMs` is within `[minPossible, timeLimit]` from a shared copy of the validator in `base44/shared/`, enforce the per-guest rate limit (429), upsert the best row, return `{ rank, players, best }`.
- `getLeaderboard`: return the top N rows with only `displayName`, `timeMs`, `stars`, plus the caller's rank. Never return `guestId`.
- Client: 4 s timeout, one retry, silent failure; game works offline.

## Cleanup status
- Deleted from remote: `probeSubmit`, `probeAdmin` (temporary helper that listed and purged test rows). All test rows were purged (6 created, 0 left).
- Kept: `ping`.
- Entity `ProbeRun` still exists remotely, locked with the admin-only RLS above (no CLI delete). It is removed automatically the next time `entities push` runs with at least one other entity file in `base44/entities/`, because push deletes entities not present locally.
