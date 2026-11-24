# 05 Seeker AI

The AI makes or breaks the game. Seekers must be **fair, readable, and a bit funny**.

## State machine
```
PATROL -> CURIOUS -> INVESTIGATE -> SEARCH -> CHASE -> (FOUND)
   ^          |           |            |         |
   +----------+-----------+------------+---------+ (RETURN)
```

| State | Trigger in | Behavior | Visual | Leaves when |
|-------|-----------|----------|--------|-------------|
| **Patrol** | Default | Walks waypoints, pauses, looks left/right at "look points". | Yellow cone | Sees or hears something |
| **Curious** | Detection meter 0.4+, or faint noise | Stops, turns toward source, "?" bubble. 1.0 second. | Orange cone | Meter reaches 1.0 (Chase) or drops (Investigate / Return) |
| **Investigate** | Noise event heard | Walks to the noise point, looks around for 3 s. | Orange cone, "?" | Finds Pip (Chase) or nothing (Search or Return) |
| **Search** | Lost Pip, or Investigated and found a clue (searched object, open door) | Checks nearby hiding spots one by one (Snoopy types), 6 to 10 s. | Orange cone, magnifier icon | Timeout (Return) or finds Pip |
| **Chase** | Meter 1.0 and Pip in view | Runs at Pip. In v1, being touched or meter 1.0 = found. Optional **Tag Chase**: Pip can still escape through a door for 2 s grace. | Red cone, "!" | Pip is found |
| **Return** | Timeout | Walks back to the nearest patrol waypoint. | Yellow cone | Back on patrol |

### Fairness rules
1. **No instant catch.** The meter always gives at least 0.6 s from first sight to found at point blank.
2. **No cone through walls**, ever. If it looks blocked, it is.
3. A seeker never starts a patrol facing Pip inside the starting room.
4. A **start safe zone** of 4 tiles around Pip's spawn has no vision for 3 seconds.
5. A seeker never "knows" where Pip is without sight or sound. No cheating.
6. Seekers announce themselves: footsteps sound, humming, floorboard creaks, so a player can hear them coming.
7. Searched objects stay open. A seeker may notice that and become Curious (adds tension for greedy players).

## Seeker types
Numbers: speed (tiles/s), cone range (tiles) / angle, hearing radius (tiles), special.

| Type | Intro level | Speed | Cone | Hearing | Special behavior |
|------|-------------|-------|------|---------|------------------|
| **Grandma Gus** (Patrol) | 1 | 1.6 | 5 / 70 | 2 | Slow, wide cone, pauses at armchair. Falls asleep (cone off) for 6 s at set spots. |
| **Uncle Marlo** (Snoopy) | 3 | 2.0 | 6 / 60 | 3 | Checks wardrobes, closets, under beds on his route. Hides spots near his path are risky. |
| **Tilly and Tobi** (Twins) | 6 | 2.2 | 5 / 60 | 3 | Two seekers. Walk in a pair offset 2 tiles. Cones overlap. Split up in search state. |
| **Biscuit the Dog** (Sniffer) | 8 | 3.0 | 3 / 120 | 8 | Short wide cone, long hearing. Sneaky Slippers silence Pip completely, so they are the counter. Distracted by squeaky toy and treats. Barks to alert nearby seekers (alert radius 8). |
| **Sprinter Sibling** | 9 | 3.6 | 7 / 35 | 3 | Narrow far cone, runs between rooms on a loop. Rarely stops. Predictable timing. |
| **Night Watcher** (flashlight) | 13 | 1.9 | 7 / 25 (beam) | 3 | Only lights a narrow beam. Dark rooms. Panning beam. |
| **The Door Guard** | 14 | 0 | 6 / 90 | 4 | Stands at a door. Leaves only when distracted. |
| **Mirror Twin** | 15 | 2.4 | 5 / 60 | 3 | Patrols the mirrored route of another seeker. |
| **Cuckoo Clock Granddad** | 16 | 0 | 8 / 180 | 0 | Stationary. Cone sweeps back and forth on a timer. Pattern puzzle. |
| **Auntie Alarm** | 17 | 1.8 | 5 / 70 | 5 | Raises an alarm: all seekers go Investigate to her point for 8 s. |
| **Head Seeker** (Boss) | 20 | 2.8 | 6 / 70 | 5 | Learns: after Pip hides in an object, will check it next time. Uses all behaviors. |

## Waypoint patrols
- Patrol is a list of waypoints with `wait` seconds and an optional `look` angle.
- Loop types: `loop`, `pingpong`, `once-then-stand`.
- Timing offsets between seekers create **windows** for the player. Level design target: every level has at least one safe window of 3 seconds at each chokepoint.

## Pathfinding
- Grid A* on the tilemap (cost increased near furniture), recomputed when doors change.
- Seekers open unlocked doors (creak noise). Locked doors are walls for them unless they carry a key (some late levels).
- Stair use: patrol routes may include stair nodes. Cross-floor Investigate: they only investigate noise on their own floor.

## Perception implementation notes
- **Cone test:** for each seeker, check Pip distance <= range, angle to Pip within half-angle, then raycast on the tile grid for walls and tall furniture.
- **Detection:** `meter += rate * dt` per above. `meter -= 0.5 * dt` if not visible.
- **Noise event:** `{pos, radius, time}`. Each seeker checks `dist(pos) <= min(radius, hearing)` with a path-length check (<= 2 x radius).
- Update AI at 10 Hz, movement at frame rate to stay cheap on mobile.
- Use deterministic randomness (seeded) per level attempt so shared levels play the same way for everyone.

## Difficulty knobs (tunable per level in JSON)
`speedMult`, `coneRangeMult`, `coneAngleMult`, `hearingMult`, `searchDuration`, `pauseDuration`, `alertShare` (whether seekers share alerts).

## Anti-frustration
- After 2 fails at the same spot, seekers wait 0.5 s longer at that waypoint (invisible assist, off in 3-star attempts).
- "Found you!" screen shows a small replay arrow of how the seeker saw Pip (shows the seeker's cone on freeze frame).
