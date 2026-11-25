# Phase 1: Engine Core, View, and Camera

**Target:** Nov 25-26 | **Contest critical:** yes | **Milestone:** `P1 Engine`
**Depends on:** G0.

**Goal:** a headless sim plus a view that loads a level JSON, shows part of the map with a follow camera, lets the player zoom, and lets Pip move on both keyboard and touch with correct gaits and noise.

**Read first:** `plan/01`, `plan/04`, `docs/02` sections 1, 7, `docs/07`, `docs/09`.

---

## P1.1 Sim skeleton and game loop
Acceptance: the loop runs at fixed 60 Hz in browser and Node; state is serializable; retry restores the initial state.
- [ ] P1.1.1 `WorldState` types, `step(state, input, dt)` entry point, event bus.
- [ ] P1.1.2 Fixed-timestep accumulator with interpolation alpha for the view.
- [ ] P1.1.3 Seeded RNG utility with tests.
- [ ] P1.1.4 `GameHost` mounts the canvas, runs the loop, pauses on blur and on portrait orientation.
- [ ] P1.1.5 Headless runner script for Node scenarios.

## P1.2 Level loader, tilemap, collision
Acceptance: Level 1 JSON loads, validates, and Pip cannot walk through walls or furniture.
- [ ] P1.2.1 JSON schema (zod) from `docs/07`, extended with `camera`, `rooms`, `hide` fields.
- [ ] P1.2.2 RLE tile decoding, surfaces layer, rooms layer (named regions).
- [ ] P1.2.3 Static collision grid: `blocksMove`, `blocksSight`. Objects contribute footprints.
- [ ] P1.2.4 Circle-vs-grid collision with sliding along walls.
- [ ] P1.2.5 Level validator v1 (start/home walkable, bounds, schema). CLI `tools/validate-levels`.
- [ ] P1.2.7 Level JSON ooms (multi-rect), rchetype, and yard fields (see docs/17).
- [ ] P1.2.6 Greybox Level 1 JSON (from `docs/levels/levels-01-05.md`).

## P1.3 Projection and render pipeline
Acceptance: Level 1 renders in the chosen projection with y-sorting, wall faces, shadows. One config switch toggles projection.
- [ ] P1.3.1 `Projection` interface and both implementations (from the spike).
- [ ] P1.3.2 Render layers: floor, decals, cones, world (y-sorted), lighting, fx, worldUI.
- [ ] P1.3.3 Static floor and wall baking into chunk textures.
- [ ] P1.3.4 Y-sorting with baseline anchors; tall objects use footprint baseline.
- [ ] P1.3.5 Occlusion fade (alpha tween) and player silhouette outline.
- [ ] P1.3.6 Greybox sprite set (colored boxes with heights) so levels are playable before final art.
- [ ] P1.3.7 Resize and DPR handling, letterboxing with safe-area insets.
- [ ] P1.3.8 Interior partition walls drawn low (about 0.5 tile face) or as cutaways, tall walls only on the far side; windows (blue glass, optional seeThrough) and doorway gaps per docs/17.

## P1.4 Camera and zoom
Acceptance: all camera behaviors in `plan/01` work on desktop and phone; zoom persists.
- [ ] P1.4.1 Follow camera: damped, look-ahead, deadzone, bounds clamp.
- [ ] P1.4.2 Small-level centering.
- [ ] P1.4.3 Zoom: wheel, `+`/`-`, on-screen buttons, pinch, slider (settings stub). Range and per-level overrides.
- [ ] P1.4.4 Zoom smoothing and anchor on Pip.
- [ ] P1.4.5 World-space UI counter-scaling with min/max size.
- [ ] P1.4.6 Persist zoom per device class.
- [ ] P1.4.7 Peek (hold Tab / two-finger hold) with cooldown and slowdown.
- [ ] P1.4.8 Level intro pan (skippable).

## P1.5 Rooms and fog of war
Acceptance: unknown rooms are dark, remembered rooms are dimmed, seekers hide in unseen rooms.
- [ ] P1.5.1 Room graph from level `rooms` regions, with doors as edges.
- [ ] P1.5.2 Visibility rules (inside, line of sight through open doors, `seeThrough` windows).
- [ ] P1.5.3 Fog overlay with alpha tweens; room name hints for unknown rooms.
- [ ] P1.5.4 Entity visibility filter in the view (seekers/items by room state).
- [ ] P1.5.5 Threat arrows at screen edge (setting).
- [ ] P1.5.6 Minimap v1 (explored rooms, Pip, Home Base).

## P1.6 Input
Acceptance: keyboard and touch both produce correct `InputState`; gait changes by stick tilt.
- [ ] P1.6.1 Keyboard adapter (WASD/arrows, Shift, Space, E/F, 1-4, N, Tab, Esc).
- [ ] P1.6.2 Floating joystick on the left 40% of the screen with a 12% dead zone.
- [ ] P1.6.3 Touch buttons: INSPECT (context icon), RUN, pause, zoom +/-.
- [ ] P1.6.4 Pinch gesture handling that does not conflict with the joystick.
- [ ] P1.6.5 Gamepad adapter (optional, can slip to P5).
- [ ] P1.6.6 Left-handed layout swap (data-only).

## P1.7 Player controller and noise
Acceptance: speeds match `docs/02` and noise events appear with correct radii and surface multipliers.
- [ ] P1.7.1 Gaits (sneak 1.8, walk 3.0, run 4.6) and acceleration feel (instant but eased).
- [ ] P1.7.2 Surface multipliers (carpet 0.5, tile 1.3, creaky 1.8).
- [ ] P1.7.3 Noise events and ring visuals (ellipse in oblique).
- [ ] P1.7.4 Footstep timing and surface sound hooks (events only; audio in P5).
- [ ] P1.7.5 Home Base tile and win event (placeholder results).

## P1.8 Debug tools
Acceptance: all overlays toggle; time scale works; level reload without page refresh.
- [ ] P1.8.1 Overlay: grid, collision, rooms, rays, noise, FPS, seed.
- [ ] P1.8.2 Time scale 0.25x-4x, step-one-tick, pause.
- [ ] P1.8.3 God mode, teleport, spawn items.
- [ ] P1.8.4 Hot reload level JSON.
- [ ] P1.8.5 Query-string flags: `?level=L03&debug=1&proj=topdown`.

---

## Exit criteria
- [ ] Level 1 greybox: walk the whole map, zoom works, camera feels good on phone.
- [ ] Sim tests pass in CI.
- [ ] Both projections render the same level.
- [ ] FPS meets the budget in `plan/04` on the reference phone.

## Risks
Camera feel (tune on a real phone), zoom exploit (fog + minZoom), Pixi bundling issues.
