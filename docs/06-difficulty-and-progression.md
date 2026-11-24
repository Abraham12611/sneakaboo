# 06 Difficulty and Progression

Difficulty grows in **variety first, size second, pressure third**.

## The ramp (20 levels, 5 zones)
| Zone | Levels | Theme | New ideas introduced |
|------|--------|-------|----------------------|
| 1 Cozy Cottage | 1-4 | Small home | Sneak, cones, hiding, radio, keys, closets, surfaces, slippers |
| 2 Suburban House | 5-8 | Family home | Safe codes, potion, twins, 2 floors, darkness, dog |
| 3 Mansion | 9-12 | Big estate | Sprinter, 3 key colors, gears, alerts, 4th slot, switch timing |
| 4 Haunted Manor | 13-16 | Dark house | Flashlight beam, door guard, mirror twins, clock sweeps |
| 5 Grand Estate | 17-20 | Museum, tower, finale | Alarm seeker, vertical towers, secret passages, boss |

## Difficulty table
| Level | Map (tiles) | Floors | Seekers | Locks | Time (s) | Par (s) | New mechanic |
|-------|------------|--------|---------|-------|----------|---------|---------------|
| 1 | 24x14 | 1 | 2 | 0 | 90 | 45 | Move, sneak, cones |
| 2 | 26x14 | 1 | 3 | 0 | 100 | 55 | Hide, radio |
| 3 | 28x16 | 1 | 2 | 1 | 110 | 60 | Keys, Snoopy |
| 4 | 30x16 | 1 | 2 + sensor | 1 | 120 | 70 | Noise surfaces |
| 5 | 34x18 | 1 | 2 + dog | 1 + safe | 130 | 75 | Safe, potion |
| 6 | 36x18 | 1 + crawl | 3 | 1 | 140 | 80 | Twins, vent |
| 7 | 30x16 x2 | 2 | 2 | 1 + pad | 150 | 85 | Stairs |
| 8 | 34x18 | 1 | 2 | split key | 140 | 80 | Dark, dog |
| 9 | 40x22 + 36x20 | 2 | 3 | 3 colors | 170 | 100 | Sprinter |
| 10 | 46x14 | 1 | 4 | 3 gears | 160 | 100 | Shared alerts |
| 11 | 38x20 x2 | 2 | 3 | safe + Gold | 180 | 110 | Code puzzle |
| 12 | 40x24 | 1 | 4 | 2 switches | 170 | 105 | Switch timing |
| 13 | 38x22 + basement | 3 | 3 | 2 | 180 | 115 | Flashlight seeker |
| 14 | 36x20 | 1 | 3 | 2 + guard | 160 | 100 | Door guard |
| 15 | 32x20 x2 | 2 | 2 mirrored | key halves | 170 | 110 | Mirror twins |
| 16 | 36x20 | 1 | 4 | gears | 160 | 100 | Clock sweeps |
| 17 | 44x24 + 40x22 | 2 | 5 | 3 + case | 200 | 125 | Alarm |
| 18 | 24x16 x4 | 4 | 4 | 3 | 210 | 130 | Tower |
| 19 | 36x22 | 2 | 4 | secrets + safe | 220 | 140 | Secret doors |
| 20 | 56x30 + 2 floors | 3 | 8 + boss | 8 | 300 | 190 | Everything |

## Design rules
1. **One new idea per level.** Teach it in a safe spot, test it in the middle, combine it in the last 20%.
2. **Every level has 3 layers:** a route (what is the path), a puzzle (what unlocks it), a risk (what the seekers do).
3. **Always a fair first 10 seconds.** The start room is safe.
4. **Optional depth:** trophy is always optional and off the main path.
5. **No dead ends without feedback.** If a locked door has no obtainable key, the level is invalid. The editor validates this (see doc 08).
6. **Par time is a "kind" 2-star line.** Target 35% of time left. Playtest: 50% of testers should earn 2 stars on attempt 3.
7. **Fail pacing:** at most 1 fail per 90 seconds of play for the median player in early levels, 1 per 60 seconds in late levels.

## Tuning knobs
- Seeker speed, cone angle, cone range, pause duration.
- Timer length.
- Number of boosters and where they are.
- Search times.
- Safe window length at chokepoints.

## Modes after the campaign
- **Hard Mode:** same levels, +20% seeker speed, -15% time, fewer boosters.
- **Speedrun:** no clues shown, global ghost of best run (local only in v1).
- **Daily Challenge:** one seeded level per day assembled from level pieces with random item placement.
- **Endless Estate:** procedurally generated houses with increasing seeker counts (post-contest).
