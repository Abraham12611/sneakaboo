# 02 Core Mechanics

Units: **1 tile = 1 unit = 48 px** at base zoom. Speeds in tiles per second. All numbers are starting values for playtesting.

## 1. Movement and noise
Pip moves in 8 directions (analog on touch). Three gaits:

| Gait | Speed | Noise radius | Notes |
|------|-------|--------------|-------|
| Sneak | 1.8 | 0 (silent) | Hold Shift / light joystick push. Cannot be heard. |
| Walk | 3.0 | 2.5 tiles | Default. |
| Run | 4.6 | 6 tiles | Hold Space / full joystick push. Leaves a visible "dust puff" so the player learns it is loud. |

- **Floor surfaces change noise:** carpet and rugs x0.5, wood x1, tile x1.3, creaky boards x1.8 (marked with a subtle crack pattern).
- **Noise is drawn** as a soft ring when it happens, so players learn the rule visually.
- Noise only matters to seekers within the radius **and** with a walkable path shorter than 2x the radius (walls dampen it).

## 2. Vision
- A seeker has a **cone**: range (tiles) and angle (degrees). Walls and closed doors block it. Furniture below waist height does not block it, tall furniture (wardrobes, shelves) does.
- Cone is a translucent shape on the floor. Color: yellow (calm), orange (suspicious), red (chasing).
- **Detection meter** per seeker (0 to 1). While Pip is in the cone it fills:
  - base rate 1.2 per second at point blank, falling to 0.4 at max range
  - sneaking: x0.7, in a dark patch: x0.5, behind low cover (half-hidden): x0.6
  - running: x1.4
- The meter shows above the seeker as a ring. It drains at 0.5 per second when Pip leaves the cone.
- At 0.4 the seeker turns **suspicious** (turns toward Pip, "?" bubble). At 1.0 Pip is **found**.

## 3. Hearing
- Noise inside a seeker's hearing range creates a **noise event** at Pip's position.
- The seeker goes to **Investigate** that point. Hearing range per seeker type, see doc 05.
- Thrown or triggered distractions (radio, squeaky toy) create noise events at their location.

## 4. Hiding
- Hiding spots: wardrobe, under bed, behind curtain, inside big chest, behind sofa, in a cardboard box, under a table with a tablecloth.
- Enter with Interact. While hidden Pip is **invisible** to cones. Pip can peek: hold Interact to see a tiny cone preview.
- Hiding has a **capacity of 1**. A seeker that "checks" a hiding spot (Snoopy types, search state) opens it. If Pip is inside he is found after a 0.6 second "Boo!" beat.
- Pip cannot hide in a spot that is within 1 tile of a seeker's view. It would pop him out.
- A hidden Pip regains nothing, but the timer keeps running. Hiding is a pause button for danger, not for the clock.

## 5. Interacting and searching
- Context button (E / tap button) acts on the nearest interactable within 0.9 tiles.
- **Search** objects take time: a ring fills (search time per object, see doc 03). Moving cancels it. Each search makes a small noise at the start and end.
- An object can be **empty**, hold a **clue**, hold an **item**, or be a **trap/prank** (squeaky toy, creaky lid). The level JSON decides.
- Searched objects show a faded "checked" mark so the player knows not to repeat.

## 6. Doors, keys, and sections
- Doors: open (default), closed (opens with a short creak noise unless Pip sneaks), locked (needs key), jammed (needs tool or two key parts), one-way (spring door, exit-only).
- Keys are color coded: Bronze, Silver, Gold, plus special **Skeleton Key** (opens any one door, consumed).
- **Multi-part keys:** a door may need 2 or 3 fragments (Gear A, B, C, or "Key Halves"). They are found in different rooms.
- **Sections:** locked doors split a house into sections. The route to Home Base crosses sections in order.
- A closed door blocks vision. Opening one cone-blocks again when closed behind Pip (auto-close while sneaking is silent).

## 7. Floors and stairs
- Stairs and trapdoors connect floors. Taking stairs plays a 0.6 second transition.
- Seekers can use stairs too if their patrol route includes them.
- Each floor has its own tilemap. A tiny **minimap** shows the current floor and seeker blips only when they were seen in the last 3 seconds.

## 8. Timer
- Every level has a countdown from `timeLimit` seconds. Reaching zero = fail (**"Time's up! Back to start"**), instant restart.
- **Stopwatch pickups** add 10 or 15 seconds.
- Last 10 seconds: timer pulses, soft heartbeat sound, vignette.
- The timer starts when Pip first moves (not on load).

## 9. Win, fail, retry
- **Win:** Pip enters the Home Base tile. 0.8 second celebration, then results screen.
- **Fail conditions:** found by a seeker (meter full), or time runs out.
- **Retry:** instant, restarts the whole level with fresh item positions (same layout). No lives.
- **Soft assist:** after 3 fails in a row, offer "Show seeker paths for 5 seconds" once per attempt. Never auto-enabled.

## 10. Stars (per level)
| Star | Condition |
|------|-----------|
| 1 | Reach Home Base |
| 2 | Reach Home Base with at least 35% of time left |
| 3 | Pick up the level's **Trophy** (hidden somewhere optional) and reach Home Base |

Some levels have a "ghost" 4th challenge shown only after 3 stars: **Never Spotted** (no seeker ever above 0.4). Reward is a cosmetic.

## 11. Boosters (summary)
Carried in 3 inventory slots (4 after level 10). Full list in doc 04.
- Invisibility Potion: 12 seconds invisible to cones, still audible.
- Distraction items: radio, squeaky toy.
- Speed boots: 8 seconds of x1.35 speed with the same noise as walking.
- Slippers: 20 seconds of silent walking.
- Decoy teddy: seekers walk to it for 6 seconds.

## 12. Feedback ("juice")
- Seeker notices: "?" pops, short sting sound.
- Found: screen shakes, "FOUND YOU!" text, confetti, instant retry button.
- Pickup: sparkle and sound, item flies to the inventory.
- Timer: color shifts yellow to red under 25%.
