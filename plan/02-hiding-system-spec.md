# 02 Hiding System Spec

Extends `docs/02-core-mechanics.md` section 4 and `docs/03-searchable-objects.md`. Hiding is a core fantasy of a hide-and-seek game, so it gets its own spec.

## Principles
1. Every hiding spot has a **clear rule**: how well it hides, how long it takes, how it makes noise, and what the seekers do about it.
2. **Telegraphed risk:** a seeker that will check a spot shows a magnifier icon and walks toward it first. The player can bail out in time.
3. **Hiding stops danger, not the clock.**
4. **Pip is a kid:** he fits under things adults can't. Seekers cannot follow into crawl spaces.
5. Sizes matter: "big enough" rules prevent hiding under a stool.

## Cover levels
| Level | Name | Effect | Examples |
|-------|------|--------|----------|
| **Full** | Fully hidden | Invisible to cones. Cannot be heard (no noise). Found only if the seeker **checks** the spot. | Wardrobe, closet, under bed, big chest, under a table with a tablecloth, inside a large box, bathtub with shower curtain, behind a heavy curtain, dumbwaiter |
| **Partial** | Half cover | Detection rate x0.45 and seekers must be within 3 tiles and facing Pip. Pip must be crouched and still. | Behind a sofa, behind an armchair, behind a plant, behind a half-open door, behind a stack of boxes, under a table without cloth (legs visible), behind kitchen island |
| **Shadow** | In darkness | Detection x0.5 in a dark patch. Not exclusive: stacks with partial cover (x0.45 x 0.5 = x0.225). | Dark corners, unlit rooms |

## Hiding spot catalog
Capacity is 1 (Pip). Size is the minimum footprint in tiles for the spot to be allowed (editor validation).

| Spot | Cover | Min size | Enter time | Noise | Seeker checks it? | Notes |
|------|-------|----------|-----------|-------|-------------------|-------|
| **Under the bed** | Full | 2x1 (bed) | 0.5 s, slide-in animation | small 1.0 | Snoopy types (bend down, 1.0 s warning) | Bed skirts hide Pip. Sprite shows the feet sticking out if Pip moves. |
| **Wardrobe** | Full | 1x1 (tall) | 0.6 s door open | 1.5 (door creak unless sneaking) | Yes, often | Door animation. The most checked spot. |
| **Closet (small)** | Full | 1x1 | 0.5 s | 1.0 | Yes | Coats swing. |
| **Behind curtain** | Full | 1x1 on a window | 0.3 s | 0 | Rarely | Feet show at the bottom: seekers within 1.5 tiles can spot the feet (detection x0.5, not full). |
| **Under table with tablecloth** | Full | 2x1 table | 0.4 s | 0.5 | Sometimes (bend down) | Cloth must reach the floor. The editor flag `cloth: true`. |
| **Under table, no cloth** | Partial | 2x1 table | 0.4 s | 0.5 | No | Legs visible. Good only for brief cover. |
| **Behind the sofa** | Partial | sofa 2x1, with a gap of 1 tile behind it | 0.3 s | 0.5 | No | Pip needs the sofa between him and the seeker. Depends on facing. |
| **Behind an armchair / dining chair** | Partial | any chair | 0.2 s | 0 | No | Weak. Works for a moment in a dark room. |
| **Behind a plant** | Partial | large plant 1x1 | 0.2 s | 0.2 (leaves rustle) | No | Rustle makes a noise event of 1.0 on entering. |
| **In a big chest / trunk** | Full | 2x1 | 0.8 s | 2.0 | Yes | Slow and noisy. |
| **In a cardboard box** | Full | 1x1 box | 0.5 s | 0.5 | Rarely | Pip moves slowly (x0.6) while carrying the box (Metal-Gear style "box walk"). Fun trick. |
| **In a laundry basket** | Full | basket | 0.4 s | 0.3 | Rarely | Pile of clothes covers. |
| **Bathtub with shower curtain** | Full | tub | 0.6 s | 1.0 | Yes | Curtain pulled. |
| **Behind a door (open)** | Partial | door open 90 degrees | 0.3 s | 0 | Seeker closes door: finds Pip | Pip squeezes into the gap. Risky if a seeker closes it. |
| **Under a desk** | Partial or Full (if modesty panel) | 2x1 | 0.4 s | 0.3 | Sometimes | Desks with front panels are Full. |
| **Behind a bookshelf gap** | Full | secret bookcase | 1.0 s | 1.0 | No | Only in secret-passage levels. |
| **Inside the fridge (big)** | Not allowed | | | | | Silly, and unsafe visual. Excluded. |
| **Dumbwaiter** | Full + travel | shaft | 1.0 s | motor noise 3.0 | No | Moves Pip one floor. |
| **Crawl space / vent** | Full + travel | vent | 1.5 s | 1.0 | No | Slow tunnel (x0.7). Seekers can't enter. |
| **Haystack, laundry pile, snow drift (themed)** | Full | 1x1 | 0.5 s | 0.5 | Rarely | Outdoor and theme zones. |

## Entering and leaving
- Enter with the context button when within 0.9 tiles of the spot's **entry point** (front of bed, front of wardrobe).
- You cannot enter if a seeker has line of sight to **the entry** within 3 tiles and is Curious or worse. The button shows a red cross with "Too close!".
- Entering plays a short animation. During the animation Pip is still visible (the "vulnerable window"), 0.3 to 0.8 s depending on spot.
- Exit with the same button or by pushing the joystick away. Exiting plays the reverse animation and makes the listed noise.
- Cannot use items inside a hiding spot except peeking.

## Peeking
- While hidden, hold the context button: shows a small peek cone and reveals seekers inside it with a "safe" green outline.
- Peeking is allowed in Full spots only, and slightly **delays** detection checks (no change to risk).

## Seeker behavior toward hiding spots
Data on each seeker type: `checksHiding: { probability, spots[], duration }`.

| Seeker | Checks | How |
|--------|--------|-----|
| Grandma Gus | Rarely: 10% of passes | Looks only at chairs and curtains. |
| Uncle Marlo | Often: 60% of passes | Bends down to check under beds and opens wardrobes. |
| Twins | Always check the spot nearest to the last noise. | Split up in Search. |
| Biscuit (dog) | Sniffs every hiding spot within 3 tiles for 2 s. | Finds Pip in any spot unless Pip drank a Slippers booster (silent and scentless) or the dog is distracted by a treat or squeaky toy. |
| Head Seeker (boss) | **Remembers** the last 2 spots Pip used and checks them first. | Forces Pip to switch spots. |

Check sequence: 
1. Seeker chooses a target spot (planned in Search state or on route).
2. Shows **magnifier** over the spot and walks to it. The path is visible to the player when the spot is in view.
3. Arrives, plays the check animation (bend or open) for 0.6 to 1.0 s. The spot is "open" visually.
4. If Pip is inside: **Boo!** beat (0.6 s window where Pip may use a potion or a dash from the spot's back exit if it has one), then FOUND.
5. Otherwise the spot is marked "checked" (seekers usually don't recheck for 20 s).

## Escape hatches (so hiding doesn't feel like a trap)
- Some spots have a **back exit**: wardrobe with a secret back panel, bed with both sides open, table with an open side. If the seeker is at the front, Pip can slide out the other side (flag `exits: ["front","back"]`).
- **Potion-in-hiding:** drinking a potion inside a spot makes Pip invisible even if checked (the seeker sees an empty spot) for the potion duration.
- A one-time 0.6 s grace during the Boo! beat allows bailing out by pressing the exit button (costs the tag cartoon "almost!").

## Editor and validation rules (also used for built-in levels)
- A hiding spot must have a reachable entry point.
- A Full hiding spot cannot be inside a seeker's mandatory patrol route within 1.5 tiles of a waypoint with `wait > 2 s` unless flagged "dangerous" (intended).
- Every level has at least one Full hiding spot in the first 40% of the route (except L1, which teaches cones).
- `cloth: true` required for Full under-table hiding.
- Furniture too small for hiding is rejected: stool, side table (1x1) cannot be marked as a hiding spot.

## Level JSON fields
```json
{
  "id": "bed1", "type": "bed", "x": 8, "y": 4, "w": 2, "h": 1,
  "hide": {
    "cover": "full",
    "enter": {"time": 0.5, "noise": 1.0, "from": "south"},
    "exits": ["south", "north"],
    "peek": true,
    "dangerous": false
  }
}
```

## Art and animation needs (see `plan/06`)
- Per spot: closed state, open state, "Pip inside" overlay (eyes peeking or feet), enter and exit animations (4 to 6 frames).
- Under bed: bed drawn with a darker gap along the bottom, a sliding Pip silhouette.
- Chair and sofa cover: Pip sprite crouched behind with only the top of the head visible, with occlusion fade turned off for the furniture.
- Table cloth: cloth sprite with a subtle sway when Pip enters.

## Tests (P3.2)
- Pip in a wardrobe with Marlo's route past it: found 100% when Marlo checks it, 0% otherwise.
- Telegraph: the magnifier appears at least 1.5 s before the check starts.
- Partial cover: detection time doubles (measure in a headless sim test).
- Cannot enter with a Curious seeker within 3 tiles in LOS.
- Dog finds Pip hiding without Slippers; not with Slippers (ignoring the sniff duration).
