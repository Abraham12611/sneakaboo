# 03 Searchable Objects and Interactables

Each entry: **search time** (seconds, holding Interact), **noise** (extra radius when searched), **can hide** (yes/no), **possible contents**, **notes**. "Content" is set per instance in the level JSON, so a drawer can be empty in one level and hold the key in another.

## Furniture with storage
| Object | Time | Noise | Hide | Contents | Notes |
|--------|------|-------|------|----------|-------|
| Table drawer | 1.2 | 1.5 | no | key, coin, clue note, empty | Sliding sound. Drawers on one table are searched separately. |
| Dresser (3 drawers) | 1.0 each | 1.5 | no | 3 independent contents | Good place for decoys. |
| Nightstand drawer | 1.0 | 1.0 | no | clue, potion, flashlight | |
| Desk (locked drawer) | 1.5 | 1.0 | no | needs Bronze key | Holds important items. |
| Wardrobe | 2.0 | 2.0 | **yes** | any | Hide or search, not both at once. Seekers check these. |
| Closet (small) | 1.5 | 1.5 | yes | coats, shoes, item | |
| Kitchen cabinet | 1.4 | 2.5 | no | item, trap (rattling pots) | Loud on tile. |
| Fridge | 1.2 | 2.0 | no | snack = stopwatch, clue | Light flicker lights Pip up (seeker sees x1.3 easier for 2 seconds). |
| Bookshelf | 2.0 | 0.5 | no | key hidden behind a specific book | A "pull the right book" mini choice: 3 highlighted books, one right. |
| Medicine cabinet | 1.0 | 1.0 | no | potion, clue | Bathroom. |

## Containers on floor
| Object | Time | Noise | Hide | Contents |
|--------|------|-------|------|----------|
| Box (cardboard) | 0.8 | 0.5 | small only | item, empty, decoy |
| Crate / trunk | 1.8 | 2.0 | **yes** | key, trophy, speed boots |
| Chest (wooden) | 2.2 | 2.5 | yes | treasure, key halves; creaky lid chance 30% |
| Locked chest | 1.5 | 1.0 | no | needs matching key color |
| Toy chest | 1.5 | 3.0 | yes | squeaky toy (auto-trap, noise burst), item |
| Laundry basket | 0.8 | 0.5 | yes | sock = clue, item |
| Barrel | 1.2 | 1.0 | no | item |
| Suitcase | 1.8 | 1.5 | no | key, map scroll |
| Piano bench | 1.0 | 1.0 | no | sheet music clue |

## Floor, wall, and hidden things
| Object | Time | Noise | Hide | Contents |
|--------|------|-------|------|----------|
| Under a mat / welcome mat | 0.7 | 0.0 | no | key (classic), coin |
| Loose floorboard | 1.5 | 1.5 | no | key part, clue; marked with a faint highlight |
| Rug corner (lift) | 0.8 | 0.3 | no | trapdoor reveal, key |
| Painting (hinged) | 1.5 | 0.5 | no | safe behind it, key, clue code |
| Painting (clue) | 0.8 | 0 | no | shows a clue (e.g. "the third book is red") |
| Mirror | 1.0 | 0 | no | reveals hidden passage or shows a code in reflection |
| Hole in wall | 1.2 | 0.5 | no | key part, coin, or a **shortcut** crawl (see below) |
| Vent cover | 1.5 | 1.0 | no | opens a crawl-space shortcut, needs Screwdriver or slow sneak open |
| Fireplace | 1.5 | 1.0 | no | key in ashes, soot leaves footprints for 6 seconds |
| Plant pot | 0.8 | 0.2 | no | key in the soil, coin |
| Umbrella stand | 0.6 | 0.5 | no | clue, coin |
| Clock (grandfather) | 1.5 | 0.5 | no | key behind pendulum; chimes every 30 seconds (noise for seekers) |
| Piano | 2.0 | 4.0 | no | secret panel; playing a wrong key is a loud noise |
| Aquarium | 1.2 | 0.3 | no | key at the bottom |
| Telescope / globe | 1.0 | 0 | no | clue, spins to reveal a compartment |
| Trophy shelf | 1.0 | 0.3 | no | **Trophy** (star 3), glass cases can be locked |
| Safe | 3.0 | 0.5 | no | needs a 3-digit code found from clues |
| Light switch | 0.4 | 0.2 | no | toggles room lights (dark rooms halve detection) |
| Fuse box | 1.0 | 0.5 | no | kills lights on a floor for 20 seconds |

## Hiding spots without search
- **Curtain:** step behind; no search. Seekers glance at them rarely.
- **Under the bed:** slide in, 0.5 second animation, hidden.
- **Behind the sofa:** half-hidden bonus only (x0.6 detection), not full invisibility.
- **Under a tablecloth table:** full hide, small noise.
- **Dumbwaiter:** moves Pip between floors (one-way trip), noisy motor.

## Shortcuts and secret routes
- **Crawl space:** vent or wall hole connects two rooms. Pip is slow (1.4) but silent and is not seen by cones with height under 0.5 (most cones).
- **Trapdoor:** under a rug, goes down a floor.
- **Laundry chute:** one-way drop to the floor below.
- **Secret bookcase door:** opens after pulling the right book.
- **Window ledge (later):** outside route with wind noise and no hiding.

## Content types
| Content | Effect |
|---------|--------|
| Key (Bronze / Silver / Gold) | Opens matching locked door or chest. |
| Key part (Gear A/B/C, Key half) | Needs all parts for a jammed door. |
| Clue note | Reveals an object's location or a code. Shown as a card. Saved to a "clue notebook" for the level. |
| Potion | Invisibility. |
| Gadget | Radio, squeaky toy, decoy teddy, boots, slippers, flashlight. |
| Stopwatch | +10 or +15 seconds. |
| Coin | Currency, 1 to 5. |
| Trophy | Star 3. |
| Prank | A harmless trap: squeaky toy, creaky lid, spring snake. Creates a noise event. |
| Empty | "Nothing here." |

## Search UX rules
- A progress ring fills above the object. Moving cancels with no penalty besides the noise already made.
- A tiny "sparkle" hints at objects that have contents **only after the clue was found** (reward for reading clues). Otherwise all searchables look alike.
- Max one search at a time. Searching blocks sprint.
- Repeated search shows "Already checked" (no time wasted).

## Additional hiding spots (expanded)
The full hiding spec lives in `plan/02-hiding-system-spec.md`. Pip can hide under beds, in wardrobes and closets, behind curtains, under tables that have a tablecloth, in big chests, boxes and laundry baskets, in a bathtub with a curtain, and under desks with a front panel. Partial cover comes from standing behind sofas, armchairs, dining chairs, plants, and half-open doors, or under tables with no cloth. Each spot has a size rule so a stool or small side table cannot be used.
