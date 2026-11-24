# 07 Level Data Format

Every level (built-in, editor-made, shared) is one JSON document. The game engine only reads this format. The editor only writes it. This is what makes the builder cheap to add later.

## Principles
- Versioned (`"v": 1`) so old shared levels keep working.
- Small. A typical level is under 8 KB, so it can be encoded into a URL share code.
- Deterministic. Randomness uses `seed`.
- Validated. A validator checks reachability before a level can be saved or shared.

## Example (Level 3 trimmed)
```json
{
  "v": 1,
  "id": "L03",
  "name": "The Pantry Key",
  "author": "official",
  "zone": "cottage",
  "seed": 3003,
  "timeLimit": 110,
  "par": 60,
  "tileSize": 48,
  "floors": [
    {
      "id": 0,
      "w": 28,
      "h": 16,
      "tiles": "##########...",
      "surfaces": [{"rect":[2,3,6,2],"type":"carpet"}],
      "lights": [{"x":5,"y":4,"r":4,"on":true}]
    }
  ],
  "start": {"floor": 0, "x": 2, "y": 12},
  "home":  {"floor": 0, "x": 26, "y": 3},
  "doors": [
    {"id":"d1","floor":0,"x":14,"y":8,"state":"closed"},
    {"id":"d2","floor":0,"x":20,"y":5,"state":"locked","lock":{"type":"key","color":"bronze"}}
  ],
  "stairs": [],
  "objects": [
    {"id":"o1","type":"plantPot","floor":0,"x":3,"y":13,"search":{"time":0.8,"noise":0.2},
      "contains":{"kind":"key","color":"bronze"}},
    {"id":"o2","type":"painting","floor":0,"x":10,"y":2,
      "contains":{"kind":"clue","card":"img:flowerpot","points":"o1"}},
    {"id":"o3","type":"closet","floor":0,"x":12,"y":9,"hide":true,
      "contains":{"kind":"trophy"}},
    {"id":"o4","type":"fridge","floor":0,"x":22,"y":4,
      "contains":{"kind":"stopwatch","seconds":10}}
  ],
  "seekers": [
    {"id":"s1","type":"grandma","floor":0,
      "path":[{"x":8,"y":6,"wait":4,"look":180},{"x":8,"y":12,"wait":4,"look":0}],
      "loop":"pingpong","mods":{"speedMult":1.0}},
    {"id":"s2","type":"uncle","floor":0,
      "path":[{"x":16,"y":10,"wait":2},{"x":20,"y":10,"wait":2}],
      "loop":"loop","checks":["o3"]}
  ],
  "rules": {
    "stars": {"time": 0.35},
    "allowedBoosters": ["radio"],
    "safeStartSeconds": 3
  },
  "hints": [{"after":60,"target":"o1","text":"Look near the porch."}]
}
```

## Schema (field summary)
| Field | Type | Notes |
|-------|------|-------|
| `v` | int | Format version. |
| `id`, `name`, `author` | string | `author` is "official" or a display name. |
| `seed` | int | Seeds all random choices. |
| `timeLimit`, `par` | int seconds | `par` drives the 2-star line along with `rules.stars.time`. |
| `floors[]` | object | `tiles` is a compressed string (one char per tile, run-length encoded). Chars: `#` wall, `.` floor, `~` carpet, `t` tile, `w` window, `g` grass. |
| `start`, `home` | position | Single tile each. |
| `doors[]` | object | `state`: open, closed, locked, jammed, oneway. `lock`: key color, gear, code, or switch. |
| `stairs[]` | object | `from` and `to` positions on two floors. |
| `objects[]` | object | `type` from doc 03 list. `contains` is a typed payload. |
| `seekers[]` | object | `type` from doc 05, `path` waypoints, `loop`, `mods`. |
| `rules` | object | Star thresholds, allowed boosters, flags (dark, alarm). |
| `hints[]` | object | Timed hints. |

## `contains` payloads
```
{"kind":"empty"}
{"kind":"key","color":"bronze|silver|gold|skeleton"}
{"kind":"keyPart","set":"gear","part":"A"}
{"kind":"clue","card":"text:The third book.","points":"o7"}
{"kind":"code","digit":3,"pos":1}
{"kind":"booster","type":"potion|boots|slippers|radio|toy|teddy|flashlight|map|mirror|gum|whistle"}
{"kind":"stopwatch","seconds":10}
{"kind":"coin","amount":3}
{"kind":"trophy"}
{"kind":"prank","type":"squeak"}
```

## Validation rules (run at load and on save)
1. `start` and `home` are on walkable tiles.
2. Path from start to home exists when all keys, key parts, and codes obtainable are counted (graph search with key states).
3. No key is behind its own lock (circular dependency).
4. Every `code` lock has all digits placed. Every `keyPart` set is complete.
5. Seeker paths use only walkable tiles. Waypoints have `wait >= 0`.
6. Start safe zone has no seeker cone overlapping the first 4 tiles.
7. `timeLimit >= 1.15 x estimatedSolveTime` (the validator estimates the time using the shortest path at walk speed plus search times). If not, warn the author.
8. Max sizes: 80x50 tiles per floor, 5 floors, 24 seekers, 200 objects.

## Share code
- Compress JSON with LZ-string (or deflate) then base64url: `https://<game-url>/#/play?c=<code>`.
- Short codes (e.g. `AB12-XY`) are keys into a database record (phase 2), the long URL works without a backend.
- No login needed to play shared levels. Creating levels with a stored short code can be anonymous (device-based id).

## Level pack file
Built-in levels live as `levels/L01.json` ... `L20.json`, plus `levels/index.json`:
```json
{"packs":[{"id":"official","name":"Story","levels":["L01","L02","L03"]}]}
```
