# 04 Architecture and Code Structure

## Goals
1. **Sim and view are separate.** The sim is pure TypeScript with no DOM. It runs headless for tests and AI tuning.
2. **Data-driven.** Levels, objects, seekers, boosters are JSON. New content needs no engine change.
3. **Swappable view.** `Projection` (oblique vs top-down) and renderer can change without touching the sim.
4. **Backend-optional.** The game fully works offline. The backend adds leaderboards and sharing.

## Layers
```
React shell (screens, menus, HUD widgets)
   |
GameHost (mounts canvas, owns loop, bridges input and UI events)
   |-- Sim (pure)  <------ LevelData (JSON)
   |      ^  events out (found, pickup, door, noise...)
   |-- View (Pixi or Canvas) reads sim state each frame (read-only)
   |-- Audio reacts to sim events
   |-- Input produces an InputState each tick
Services: SaveService (localStorage), ApiService (Base44 SDK, optional), Telemetry (optional)
```

## Sim
- **Fixed timestep** 60 Hz (accumulator), AI at 10 Hz.
- **State:** one plain-object `WorldState` (serializable) so retry is `structuredClone(initial)` and shared levels replay deterministically.
- **RNG:** seeded (mulberry32). Never `Math.random()` in the sim.
- **Systems (run in this order each tick):**
  1. `InputSystem` -> player intent
  2. `PlayerSystem` (movement, gait, collision, noise emit)
  3. `InteractionSystem` (search progress, doors, hiding enter/exit, item use)
  4. `NoiseSystem` (events with lifetime)
  5. `SeekerSystem` (perception, state machine, movement, path following)
  6. `DetectionSystem` (meters, found condition)
  7. `ItemSystem` (potion timers, radio, decoys, stopwatch)
  8. `TimerSystem` (countdown, fail)
  9. `ObjectiveSystem` (home base, stars, trophy)
  10. `EventBus` flush (view and audio listen)
- **Spatial:** tile grid for walls and static blockers, plus a coarse **room graph** for fog and AI hints. Flat world units = tiles.
- **Raycast:** DDA on the tile grid. Cones sampled at 48 rays per seeker max. Precompute per-tile `blocksSight` and `blocksMove`, with tall objects marked `blocksSight`.
- **Pathfinding:** A* with a binary heap; cached per goal; invalidated when doors toggle.

### Core types (sketch)
```ts
type Vec = { x: number; y: number };
interface WorldState {
  t: number; seed: number; floor: number;
  player: PlayerState;
  seekers: SeekerState[];
  objects: ObjectState[];     // searchables, hiding spots, doors
  items: ItemState[];         // on floor
  inventory: (ItemId | null)[]; keys: KeyId[];
  noise: NoiseEvent[];
  rooms: Record<RoomId, 'unknown'|'remembered'|'visible'>;
  timeLeft: number; status: 'ready'|'playing'|'won'|'found'|'timeout';
  stats: { spotted: number; searched: number; usedBoosters: number };
}
```

## View
- `GameView` owns the Pixi `Application` (or Canvas), a `Camera`, and a `Projection`.
- Layers (containers): `floor`, `decals`, `cones`, `world` (y-sorted), `lighting`, `fx`, `worldUI`.
- **Sprite pool** keyed by entity id. Sim state -> sprite transform each frame (interpolated with `alpha`).
- **Static layers** (floor tiles, static walls) are baked into render textures per room or chunk for speed.
- **Occlusion fade** computed per frame for sprites overlapping the player's screen bounds.
- **Room fog** uses per-room overlay sprites with tweened alpha.
- **Zoom** scales the root world container, not individual sprites. World-space UI uses counter-scaling.
- **Resize:** logical 1280x720 virtual size, `devicePixelRatio` capped at 2.

## Input
- `InputState = { move: Vec(-1..1), gait: 'sneak'|'walk'|'run', interact: bool(pressed/held), useSlot: 0-3|null, zoomDelta: number, pause: bool, notebook: bool }`.
- Keyboard, touch (floating joystick + buttons + pinch), gamepad adapters each produce `InputState`.
- **Gait from stick magnitude:** below 0.4 sneak, 0.4-0.85 walk, above 0.85 run.

## Data modules
- `data/objects.ts`: type -> default size, sprite, search time, noise, hide config.
- `data/seekers.ts`: type -> speed, cone, hearing, behaviors.
- `data/boosters.ts`: type -> duration, effect.
- All validated by schema (zod) at load.

## Events (for audio, FX, UI)
`noise`, `seekerState`, `suspicion`, `found`, `searchStart`, `searchDone`, `pickup`, `doorOpen`, `doorLocked`, `hideEnter`, `hideExit`, `hideChecked`, `boosterUsed`, `stairs`, `timerLow`, `win`, `timeout`.

## Save data (localStorage, versioned)
```json
{
  "v": 1,
  "guestId": "uuid",
  "playerName": "Sneaky Fox 42",
  "progress": { "L01": {"stars": 3, "bestTime": 41.2, "trophy": true}, "...": {} },
  "coins": 120,
  "unlocked": ["L01","L02"],
  "settings": {"zoom": 1.0, "music": 0.6, "sfx": 0.9, "haptics": true, "leftHand": false, "threatArrows": true, "colorblind": false, "reduceMotion": false},
  "cosmetics": {"owned": [], "equipped": {}}
}
```
Migrations by version number. Corrupt save falls back to defaults without crashing.

## Performance budget (mid-range phone)
| Item | Budget |
|------|--------|
| Frame | 16.6 ms (60 FPS target, 33 ms floor) |
| Sim | 3 ms |
| Render | 8 ms |
| Draw calls | under 200 |
| Texture memory | under 96 MB |
| Initial download | under 3 MB (critical path), lazy-load zones |
| JS bundle | under 700 KB gz excluding Pixi |

## Testing seams
- Sim exposes `step(state, input, dt)` as a pure function. Unit-test any system by building a tiny `WorldState`.
- Scenario tests: JSON "script" of inputs plus expectations ("walk right 3 s, expect found"). See `plan/07`.

## Debug tooling (P1.8)
Toggle with backtick or a 5-tap on the logo: grid overlay, collision boxes, cone rays, path lines, noise events, seeker states, FPS, seed, time scale (0.25x-4x), god mode, teleport, reload level, force zoom.
