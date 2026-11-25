# 17 Floor Plans and Layout Principles

Owner direction (Nov 25): buildings must **not** be big empty spaces. They should be **well-spaced, real-feeling floor plans** with several rooms, and **every level should have a different plan**, like the Robbery Bob houses. Big areas only appear in genuinely big buildings (manor, museum), and even those are broken into rooms, halls, and wings.

This doc is the layout bible. Level designers, the level validator, the editor templates, and the art team all use it. It overrides the sizes in `docs/06` and `docs/levels/*.md` wherever a big open room is implied.

## What the reference screenshots teach
Studied from four Robbery Bob screenshots (camera and layout reference only; no art, names or UI are copied).

| Observation | Rule for Sneakaboo |
|-------------|--------------------|
| Outline is **not a rectangle**: L shapes, T shapes, rooms sticking out, a kitchen strip along one side | Every archetype below has an irregular footprint (L, T, U, offset boxes) |
| 4 to 7 compact rooms per house, each with a clear purpose (kitchen, bath, living, bedroom, study) | Rooms are 12 to 48 tiles in area. Nothing wider than 8 tiles unless flagged `hall` |
| A **corridor or a central room** connects the rooms (an L-shaped corridor, a dining room hub, a hall with a long rug) | Always one circulation spine: corridor, hall, or hub room |
| **Doorways are simple gaps** in thick cream walls (1 to 2 tiles wide), some with a door, many without | Mix open doorways and real doors. Doors matter for sight blocking and noise |
| Light-blue **windows** in the outer walls | Windows are decoration and, flagged `seeThrough`, a sight line between room and yard |
| Each **room has its own floor color** (red hall, blue kitchen, green living, orange bedroom) | One floor tint per room type. This makes rooms readable at a glance and is the base of fog of war |
| The **garden surrounds the house**: hedges, flowers, trees, a bench, a path, a gate | Levels start **outside** in the yard in most houses. Yard is part of the playable map |
| Entry from the garden path to a front door; the goal on the far side | Start and Home Base are on opposite sides of the plan, forcing a route through several rooms |
| Rooms you are not in are **dimmed**; unvisited rooms are dark | This is fog of war in `plan/01` |
| Dotted **patrol paths** shown in the corridor | Optional assist overlay, see `plan/01` |
| Furniture sits **against walls**, leaving open floor in the middle and clear paths | Furniture clusters at walls with 2-tile clear paths, plus a few middle obstacles for cover |

## Layout rules (hard rules checked by the validator)
| Rule | Value |
|------|-------|
| Footprint including yard | 24x14 up to 40x24 tiles for houses. Manor and museum up to 56x30 |
| Room area | min 12 tiles, typical 16 to 36, max 48 (hall rooms up to 80 if flagged) |
| Room side length | max 8 tiles for ordinary rooms. Longer rooms need a divider, furniture row, or alcove |
| Rooms per floor | 4 to 8 for houses, 6 to 12 for manors |
| Corridor width | 2 to 3 tiles (4 for a grand hall) |
| Doorway width | 1 or 2 tiles |
| Wall thickness | outer 1 tile (drawn thick), inner partitions 0.5 to 1 tile |
| Loops | at least one loop (two ways between two rooms) from level 3 on, so seekers and Pip have routes |
| Dead ends | allowed, but at least one has a hiding spot or a clue (so they are never pure punishment) |
| Hiding spots | at least 1 Full spot per 3 rooms (see `plan/02`) |
| Open floor | at least 30% of each room walkable with a 2-tile clear lane |
| Start and Home Base | farther than 60% of the footprint diagonal apart |
| Plan variety | no two levels in a row share an archetype. All 20 official levels use different plans |

## Archetype library (floor plans)
Twelve base plans, each with variants (mirror, rotate, swap room types). The level editor ships these as templates (phase P9). Footprints are approximate and include a thin yard strip.

Legend for ASCII sketches: `#` wall, `.` room floor, `=` corridor, `D` doorway, `S` start, `H` Home Base, `~` yard. One character is about 2 tiles.

### A. Starter flat (1 floor, 4 rooms)
Small, learning plan. Tiny living room, kitchen, bathroom, and a bedroom off a short hall.
```
~~~~~~~~~~~~~~~
~#######DD####~
~#kit..##bath#~
~#....D=======H
~##D####..bed.#
S~D living ..D#
~#######..####~
~~~~~~~~~~~~~~~
```
Used by: **L1**.

### B. Terrace house (narrow and deep, 2 floors optional)
Rooms in a row front to back, a long side passage. Teaches corridors and door timing.
```
~##########~
~#front ..D=~
~#room  ..#=~
~##D#######=~
~#dining..D=H
~##D#######=~
~#kitchen.D=~
~##########~
```
Used by: **L3**. Variant with a stair makes the 2-floor terrace for later levels.

### C. L-corridor bungalow (from the reference with a red L-shaped hall)
A hall wraps the house: lounge and two bedrooms on the north side, living room and kitchen on the south side.
```
##########################
#lounge#=====study#bed2###
#......D=====#.....#.....#
##D#####=====#######D#####
 #========================
 #living room# kitchen D==H
S~D...........D..........#
##########################
```
Used by: **L4**. Also the base of **L8** (dark variant).

### D. Suburban house with garage (2 sections)
Main house plus an attached garage connected by a door and an outside route.
Used by: **L5**. The garage has a car, shelves, and a workbench.

### E. T-house with kitchen strip (from the reference with the long blue kitchen across the top)
A long kitchen runs across the top; a big green room and an orange hall with a red rug hang below it.
Used by: **L6**. A patio at the back makes the Home Base.

### F. Semi-detached, 2 floors
Two floors, stair in the hall, bedrooms upstairs, living and kitchen downstairs, an attic hatch for Home Base.
Used by: **L7**, mirrored for **L15** (Mirror Twins).

### G. Courtyard U-house
Three wings around a small yard; the yard can be crossed in the open (dangerous) or avoided via the indoor loop.
Used by: **L9** variant for the zone 3 intro (smaller than the full manor), and **L14** (door guard).

### H. Manor with central hall
Grand hall in the centre, a staircase, a library wing, a dining wing, a kitchen wing, a study wing, a garden gazebo.
Used by: **L9** (ground floor and a small upper floor), **L11**, **L17** (as museum with exhibits).

### I. Gallery wing (not one long hall)
A chain of **exhibit rooms** connected by doorways (enfilade), with a parallel service corridor behind them. The "long gallery" feeling comes from the sight line through the doorways, not from one huge room.
Used by: **L10**. Alternative **L16** (clock hall).

### J. Cross-shaped hub house
A central room with four wings, each its own small plan. Switches and keys sit in different wings.
Used by: **L12**.

### K. Haunted manor wing
An irregular dark house with crooked corridors, a cellar, and an attic.
Used by: **L13**.

### L. Tower and estate set
- **Tower** (4 small floors, one room per floor plus a landing): **L18**.
- **Library house** (secret passages): **L19**.
- **Full estate** (manor + garden + gatehouse): **L20**.

## Level to plan mapping
| Level | Plan | Footprint (tiles, with yard) | Rooms | Floors |
|-------|------|------------------------------|-------|--------|
| 1 | A Starter flat | 24x14 | 4 | 1 |
| 2 | A2 Two-bed flat (variant of A) | 26x14 | 5 | 1 |
| 3 | B Terrace house | 26x16 | 5 | 1 |
| 4 | C L-corridor bungalow | 30x16 | 6 | 1 |
| 5 | D Suburban house + garage | 34x18 | 7 | 1 |
| 6 | E T-house | 34x18 | 6 | 1 + vent |
| 7 | F Semi-detached | 28x16 per floor | 6 + 4 | 2 |
| 8 | C-dark Bungalow (night) | 32x16 | 6 | 1 |
| 9 | H Manor (smaller first manor) | 40x22 + 30x16 | 8 + 5 | 2 |
| 10 | I Gallery wing | 44x16 | 9 | 1 |
| 11 | H2 Manor study wing | 36x20 per floor | 6 + 5 | 2 |
| 12 | J Cross hub | 36x24 | 8 | 1 |
| 13 | K Haunted wing | 36x22 | 7 + cellar | 3 |
| 14 | G U-house with guard | 34x20 | 7 | 1 |
| 15 | F mirrored | 28x16 per floor | 6 + 6 | 2 |
| 16 | I2 Clock hall rooms | 36x20 | 8 | 1 |
| 17 | H3 Museum | 44x24 + 38x20 | 12 + 8 | 2 |
| 18 | L Tower | 22x14 per floor | 1-2 per floor | 4 |
| 19 | L Library house | 34x20 | 9 | 2 |
| 20 | L Estate | 52x28 + 2 floors | 14+ | 3 |

The old sizes in `docs/levels/*.md` (for example "46x14 long gallery", "56x30 whole estate") are footprints with yard, not single huge rooms.

## Room types and floor colors
Each room type has a base floor, wall color, and a standard furniture list. Color-coding supports fog of war and readability.

| Room | Floor tint | Typical furniture | Typical hiding spots |
|------|-----------|-------------------|----------------------|
| Hall / corridor | Red carpet or runner | Console, plant, coat stand, umbrella stand | Behind coat stand (partial), curtain |
| Living room | Green or warm wood | Sofa, armchair, TV unit, coffee table, bookshelf | Behind sofa (partial), under table with cloth |
| Kitchen | Blue checker tile | Counter, stove, sink, fridge, table and chairs | Behind island (partial), cabinet |
| Dining room | Dark red or wood | Long table, chairs, sideboard | Under table (cloth), behind chairs |
| Bedroom | Orange or warm yellow | Bed, nightstand, wardrobe, dresser, rug | Under bed, wardrobe |
| Bathroom | White or light blue tile | Tub, toilet, sink, hamper | Tub with curtain |
| Study | Brown wood | Desk, chair, bookshelf, safe, globe | Under desk (panel) |
| Nursery / kids | Pastel | Crib, toy chest, play mat | Toy chest, tent |
| Garage | Grey concrete | Car, shelves, workbench, boxes | Behind car, boxes |
| Yard | Grass green | Hedges, flowers, trees, bench, path, fence, shed | Hedge gap, behind shed, bush |
| Attic / cellar | Dark wood / stone | Crates, trunks, old furniture | Trunk, crates |

## Rendering notes for the oblique view
- **Interior partition walls are drawn low** (about 0.5 tile tall face) or as cutaways, so the camera can see into rooms behind them. Only outer walls on the camera's far side are tall. This is why mockup 04 shows full rooms. See `plan/01`.
- **Windows** are blue-glass wall segments (decor). `seeThrough` windows let cones pass between yard and room.
- **Doorways** are gaps with a threshold strip. Real doors are separate objects.
- **Yard objects** (hedges, trees) block sight (hedge walls) or not (flowers). Start and Home Base can be in the yard.
- **Room tint and fog:** unvisited rooms render dark, visited rooms render dim, the current room renders full color.

## How rooms are described in level JSON
Add a `rooms` array (used by fog, AI hints, and the validator):
```json
"rooms": [
  {"id":"hall","type":"hall","rect":[10,6,20,3],"floorTint":"red","seeThrough":false},
  {"id":"kitchen","type":"kitchen","rect":[24,10,8,6],"floorTint":"blue"}
],
"archetype": "C-lbungalow",
"yard": {"rect":[0,0,40,24],"props":["hedge","flowers","tree","path"]}
```
Rooms may be non-rectangular via several rects: `"rect":[[10,6,6,6],[16,6,4,3]]`.

## Layout checklist for every new level
1. Pick an archetype not used by the previous level.
2. Sketch rooms and the circulation spine first, then add doors.
3. Place start in the yard or a side room, Home Base on the far side.
4. Add at least one loop and one dead end with a payoff.
5. Place 2 to 4 Full hiding spots and 3 to 6 searchables with a payoff each.
6. Check the first 10 seconds are safe.
7. Run the validator. Fix room-size and loop warnings.
8. Play it zoomed in and zoomed out. Zooming out must not reveal seekers (fog).

## Impact on other docs
- `docs/06-difficulty-and-progression.md`: map sizes are footprints (see mapping table above).
- `docs/levels/*.md`: unchanged in intent. Where they say "big room", read "partitioned rooms per archetype".
- `plan/01`: interior wall height rule and room-based fog.
- `plan/06`: yard tileset, windows, doorways added to the asset list.
- `plan/phases/phase-04`: archetype library and layout validator tasks.
