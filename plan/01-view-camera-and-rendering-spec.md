# 01 View, Camera, and Rendering Spec

## What the owner wants
- The look of **mockup 04** (`mockups/04-inspect-painting-key.png`): a high-angle **oblique ("orthographic 3/4") view**. You see floors from above and the front faces of furniture and walls, so rooms feel like cozy dollhouse rooms.
- The player sees **part of the house** at a time. The camera follows Pip. **The player can zoom in and out.**
- **Fallback:** if the oblique view is too hard or too slow, use a flat **top-down view like Robbery Bob** (references reviewed: dimmed adjacent rooms, dotted patrol paths, bubbles over heads, big joystick, pause button top-left, sleeping dogs with "zzz").

## Terms (so everyone means the same thing)
| Term | Meaning here |
|------|--------------|
| **Oblique view** | Camera pitched about 55 to 65 degrees. Floor looks slightly squashed vertically. Walls and furniture have visible height. This is what mockup 04 shows. Often called "2.5D" or "3/4 view". |
| **Top-down view** | Camera straight above. Everything is a flat plan view. Robbery Bob style. |
| **Sim** | Pure game logic on a flat 2D grid. Never knows about the camera. |
| **View** | Everything that draws: projection, sprites, lights, HUD. |

## The key design decision: logic is always flat
Game logic (movement, collision, cones, hearing, pathfinding, hiding) runs on a **flat 2D grid in world units (tiles)**. The view converts world coordinates to screen coordinates through one `Projection` object. That means:
- Oblique vs top-down is a **rendering choice**, not a gameplay rewrite.
- Cones are computed in flat space, then drawn through the projection, so they always match gameplay.
- Levels (JSON) do not change between views.
- Only art assets and the projection implementation differ.

```ts
interface Projection {
  worldToScreen(x: number, y: number, z?: number): { sx: number; sy: number };
  screenToWorld(sx: number, sy: number): { x: number; y: number };
  readonly tileScreenW: number;   // tile width on screen at zoom 1
  readonly tileScreenH: number;   // tile height on screen at zoom 1 (oblique squash)
  wallHeightPx: number;           // 0 for top-down
}
```
- `ObliqueProjection`: `sx = x*T`, `sy = y*T*K - z*H` with `K` about 0.80 to 0.90 (floor squash) and `z` height in tiles. Walls and furniture are drawn extruded upward by their height.
- `TopDownProjection`: `K = 1`, `z` ignored.

## Oblique rendering rules
1. **Draw order (back to front):** floor tiles, floor decals (rugs, shadows), cones and noise rings (on the floor plane), then all "standing" things sorted by **baseline y** (walls, furniture, characters, items), then lights and overlays, then HUD.
2. **Interior walls are low.** Real floor plans have many rooms (docs/17). Tall partition walls would hide whole rooms in the oblique view, so interior partitions are drawn about 0.5 tile tall (or cut away), and only exterior walls on the far side of the house are full height. Doorways are gaps, windows are blue-glass segments.
2b. **Walls (detail):** the north face (inner side) of a wall is drawn as a vertical strip of height `H` (about 1.6 tiles). South-facing walls show their top cap only. West and east walls show a thin side.
3. **Occlusion fade:** objects that are in front of Pip (drawn after him and overlapping him) fade to about 35% alpha inside a radius of about 2.2 tiles. Pip also gets a thin silhouette outline when covered. Same for seekers.
4. **Hiding:** when Pip hides "under" or "behind" something, his sprite is hidden or masked; the furniture sprite stays opaque.
5. **Characters:** 8-direction sprites drawn from the same pitched angle (see `plan/06`). A small round shadow ellipse on the floor under every character and item.
6. **Cones:** drawn as a triangle fan polygon in flat space, projected, filled with a radial gradient, clipped by walls (raycast already done in flat space). Cones are **under characters, over floor decals**.
7. **Noise rings:** ellipse (circle squashed by `K`) on the floor.
8. **Lighting (dark levels):** screen-space darkness overlay with soft "light holes" (lamps, Pip's flashlight). Drawn after sprites.
9. **Doors:** thin sprites with open/closed states, y-sorted at their baseline.

## Camera spec
| Setting | Value |
|---------|-------|
| Logical viewport | 1280 x 720 (16:9), letterboxed if the real aspect differs, with safe-area insets |
| Base scale | 1 tile = 64 screen px at zoom 1.0 (so about 20 x 11 tiles visible; oblique shows slightly more vertically) |
| Follow | Smooth damp toward Pip, time constant 0.15 s |
| Look-ahead | 1.5 tiles in move direction |
| Deadzone | Camera starts moving when Pip is further than 1.5 tiles from center |
| Bounds | Clamped to the level rectangle plus 1 tile margin |
| Small levels | If the level fits, center it with no scrolling |
| Zoom range | min 0.6, max 1.8 (default 1.0 desktop, 1.15 phone landscape). Per-level overrides in JSON |
| Zoom input | Mouse wheel, `+` and `-` keys, on-screen zoom buttons (+/-), two-finger pinch, settings slider |
| Zoom smoothing | Ease over 0.2 s, anchored on Pip (not the cursor) |
| Persist | Zoom preference saved in localStorage per device class |
| Peek | Hold Tab or two-finger hold: temporary zoom-out to 0.75 for up to 1 s, then a 4 s cooldown. Pip moves 20% slower while peeking |
| Camera shake | On found, big noise events (reduce-motion setting disables) |
| Cinematic | Level intro pan from Home Base back to start (1.5 s, skippable) |

### Fair zoom-out (anti-exploit)
Zooming out must not reveal seekers the player should not see.
- **Per-level `minZoom`** limits the visible area. Default `minZoom` shows at most 28 x 16 tiles.
- **Fog of war** (below) hides rooms the player cannot see regardless of zoom.
- Seekers inside hidden rooms are not drawn. Sounds still play (footsteps, humming) so players get audio cues.

## Fog of war and room visibility
Inspired by the Robbery Bob screenshots where neighboring rooms are dimmed.
Each room (named region in the level JSON) has a state:
| State | Look | Rule |
|-------|------|------|
| **Visible** | Full color | Pip is inside, or Pip has line of sight into it through an open door or window for rooms flagged `seeThrough`. |
| **Remembered** | Dimmed 45%, desaturated, no characters | Pip has visited it. Items and open doors remembered. |
| **Unknown** | Dark silhouette or solid dark with a room-name hint | Never visited. |
- Seekers are drawn only in Visible rooms, plus **threat markers**: when a seeker is within 10 tiles but off-screen or in a hidden room, show a small arrow at the screen edge (setting "Threat arrows", on by default in zone 1 and 2, off by default later, always available as an assist).
- Optional assist: **dotted patrol paths** for the seekers (like Robbery Bob). Shown only while a Map Scroll is active or if the Assist setting is on. Assists never remove stars, but the "Never Spotted" cosmetic requires assists off.

## HUD in a scrolling view
- HUD is screen-space and does not scroll or scale with zoom.
- World-space UI (detection rings, "?" "!" bubbles, interaction hand icons, progress rings) scales with zoom but is clamped to a min and max size so it stays readable.
- Interact hints (hand icons from mockup 04) appear on objects within 3 tiles and highlight in a yellow outline when in range.
- Minimap (top right) shows the explored area, Pip, Home Base marker (always known), and seeker blips only when seen within the last 3 s.

## Feasibility spike (P0.4) and fallback criteria
The spike builds one room with: oblique render, Pip movement, one wardrobe, one bed, one table, one cone with wall raycast, zoom, camera follow, occlusion fade, fog dimming.

Measure:
| Check | Pass |
|-------|------|
| Frame rate, mid-range phone (about 2021 Android), 1 room + 3 seekers | 50+ FPS (30 minimum) |
| Occlusion fade looks right with 10 overlapping props | No flicker or pop |
| Cones look correct against walls in the oblique view | Visually aligned with gameplay |
| Art: 12 props + Pip in 8 directions generated with consistent angle and style, usable | At least 80% usable without hand fixes |
| Dev effort estimate to finish oblique pipeline | Fits in P1 (1.5 days) |

**If two or more checks fail, switch to top-down** (Robbery Bob style). The sim and levels are unchanged. Record the decision in `plan/08-decisions-and-risks.md` (D-001).

## Renderer choice (decide in P0.4)
| Option | Pros | Cons |
|--------|------|------|
| **PixiJS v8** (WebGL, with Canvas fallback) | Fast sprites, masks, blend modes, filters for fog and lights, easy zoom and camera container | Extra dependency (about 400 KB gz), learning curve |
| **Canvas 2D** (custom) | Zero deps, full control | Lighting and masks are slower and manual; zoomed scenes may drop FPS on phones |
| **Phaser 3** | Batteries included (input, audio, tweens) | Heavier, opinionated, harder to keep sim separate |

**Update (Nov 24, spike result, D-004):** the spike found Canvas 2D much faster than a naive Pixi adapter on throttled CPU, with a far smaller bundle. P1 uses **Canvas 2D behind the `Renderer` interface**; the Pixi adapter stays in `spike/` as an option. Details: `spike/RESULTS.md`.

## Asset implications
- Oblique needs **consistent camera angle across every sprite**. See `plan/06-art-pipeline.md`.
- Top-down fallback needs a different sprite set (flat plan view). Do not mass-produce final art before G0.
- Greybox (flat colored shapes) is allowed until G0 passes.

## Acceptance for the view system (end of P1)
- [ ] Switching `projection` between oblique and top-down is a one-line config change and both render the same level correctly (even if top-down art is placeholder).
- [ ] Zoom 0.6 to 1.8 works on wheel, keys, pinch, buttons and persists.
- [ ] Camera never shows outside the level bounds.
- [ ] Occlusion fade works for walls and furniture.
- [ ] Fog of war dims remembered rooms and hides seekers in unseen rooms.
