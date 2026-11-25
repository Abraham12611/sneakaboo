# Level authoring guide

Levels are JSON files in this folder, parsed by `parseLevel` in `src/game/sim/levelSchema.ts` (schema v1).
Files starting with `_` (for example `_test_room.json`) are test levels: the app skips them and the validator
applies relaxed house rules.

## Conventions
- Units are tiles. Origin is the top-left, +x goes right (east), +y goes down (south).
- Angles (`facing`, `look`) are degrees: 0 = +x (east), 90 = +y (south), 180 = west, 270 = north.
- A tile `(x, y)` covers `[x, x+1) x [y, y+1)`. Centre of tile `(5, 3)` is `(5.5, 3.5)`.
- `tiles` has exactly `size.h` rows of exactly `size.w` characters.

## Tile legend
| Char | Meaning | Blocks move | Blocks sight |
|------|---------|-------------|--------------|
| `' '` | void, outside the map | yes | n/a |
| `.` | indoor floor (also doorway gaps) | no | no |
| `,` | grass (yard) | no | no |
| `#` | exterior wall | yes | yes |
| `=` | interior partition | yes | yes |
| `w` | window | yes | no |
| `h` | hedge | yes | yes |

## Rooms
`rooms[]` gives each room an `id`, `type`, one or more `rects` `[x, y, w, h]`, a `floorTint` hex and a `surface`.
Rects cover floor tiles only, not the walls. A doorway is a 1 or 2 tile gap of `.` in a wall or partition that
belongs to no room rect. The validator finds doorways as those gaps and checks which two rooms they join.
One `yard` room covering the whole map is fine; indoor rooms win where rects overlap.

Floor tints: hall `#b03a2e` (red), kitchen `#2e6da4` (blue), living `#4f8a3c` (green), bedroom `#e0a030`
(orange), bathroom `#7fb7be` (light teal). Surfaces: carpet in hall and bedroom, tile in kitchen and bathroom, wood in living rooms.

## Objects
`objects[]`: `{ id, type, x, y, w, h, height?, color?, ... }`, a footprint on the floor in tiles.
Place furniture against walls and keep a 2 tile clear lane. `rug`, `painting`, `lamp` do not block movement
by default. `door` objects have `state` `open` or `closed`: put them in doorway gaps. Open doors never block;
closed doors block movement and sight. Hiding-capable pieces (wardrobe, bed, closet, sofa) are counted by the validator.

## Seekers
`seekers[]`: `{ id, type, x, y, facing, loop, path: [{x, y, wait, look?}] }`. `loop` is `loop`, `pingpong` or `once`.
A "stands and turns" seeker is two waypoints at the same spot with different `look` angles. Seekers and all their
waypoints must be walkable and at least 4 tiles from `start`.

## Start and home
`start` is `{x, y, facing}`, `home` is a rect `[x, y, w, h]`. Put home on the far side of the plan from the start,
more than 60% of the footprint diagonal away, so the route crosses several rooms. The yard must not give a shortcut:
use hedge tiles to close the yard strips.

## Worked mini example
```json
{
  "v": 1, "id": "_mini", "name": "Mini", "timeLimit": 60, "par": 30,
  "size": { "w": 8, "h": 5 },
  "tiles": ["########", "#..#...#", "#......#", "#..#...#", "########"],
  "rooms": [
    { "id": "a", "type": "living", "rects": [[1, 1, 2, 3]], "floorTint": "#4f8a3c", "surface": "wood" },
    { "id": "b", "type": "kitchen", "rects": [[4, 1, 3, 3]], "floorTint": "#2e6da4", "surface": "tile" }
  ],
  "objects": [{ "id": "door", "type": "door", "x": 3, "y": 2, "w": 1, "h": 1, "state": "open" }],
  "seekers": [],
  "start": { "x": 1.5, "y": 2.5, "facing": 0 },
  "home": [5, 1, 2, 2]
}
```
Column 3 is the partition; row 2 leaves a one tile doorway with an open door in it.

## Validator
```
npm run validate-levels                  # all levels/*.json, table + exit code 1 on errors
npm run validate-levels -- --level L01   # one level
npm run validate-levels -- --json        # machine-readable
npm run validate-levels -- --preview     # ASCII plans (tiles, objects, S/H, seekers, rooms)
```
It checks: schema, start/home walkable, route start to home (closed doors block, open ones do not), timeLimit at
least 1.15 x walk time at 3.0 tiles/s, par 40-70% of timeLimit (warn), room area (error under 8, warn under 12 or over 48),
sides over 8 (warn), at least 4 rooms, every room reachable, hall width >= 2, doorway width 1-2, start/home distance
over 60% of the diagonal (warn), a loop from level 3 on, 30% free floor per room (warn), no repeated archetype in
consecutive levels, seeker positions, objects inside the map and off walls, and hiding spot counts.
Logic lives in `tools/validate-levels/validate.ts` (`validateLevel(level, { relaxed })`).

## Checklist (docs/17)
1. Pick an archetype not used by the previous level.
2. Sketch rooms and the circulation spine first, then add doors.
3. Start in the yard or a side room, home on the far side.
4. At least one loop and one dead end with a payoff.
5. 2 to 4 full hiding spots and 3 to 6 searchables with a payoff each.
6. The first 10 seconds are safe.
7. Run the validator and fix room-size and loop warnings.
8. Play zoomed in and zoomed out; zooming out must not reveal seekers.
