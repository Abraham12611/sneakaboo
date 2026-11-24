# 11 Tech Plan (Base44 Web Build)

Base44 generates apps from natural-language prompts and hosts them on a Base44 URL. The contest requires that, so the plan is to **drive the build through Base44 prompts** (doc 15) and keep the game logic engine-agnostic and data-driven.

> Verify in the Base44 editor: how much custom code you can edit directly, and whether it allows importing libraries (Phaser). The plan below works with plain Canvas 2D with no dependencies, which is the safest option.

## Architecture
```
index (React shell)
 |- Screens: Title, LevelSelect, Game, Results, Settings (React)
 |- GameCanvas component
 |   |- engine/loop.js        fixed-step 60 Hz update + render
 |   |- engine/input.js       keyboard + touch joystick + buttons
 |   |- engine/world.js       loads level JSON, tilemaps, collision
 |   |- engine/vision.js      cone + raycast
 |   |- engine/noise.js       noise events
 |   |- engine/ai.js          seeker state machine
 |   |- engine/items.js       inventory, boosters, keys
 |   |- engine/render.js      sprites, cones, lights, HUD overlay
 |   |- engine/audio.js       WebAudio sfx + music
 |- data/levels/L01..L20.json
 |- data/objects.json         object definitions (doc 03)
 |- data/seekers.json         seeker types (doc 05)
 |- save.js                   localStorage progress
```

## Key decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Rendering | Canvas 2D, fixed logical resolution 1280x720, scaled to fit | Simple, fast on phones, no dependency. |
| Engine | Custom lightweight, or Phaser 3 if allowed | Phaser speeds up input, animation, and audio but adds ~1 MB. Decide on day 1. |
| State | Plain JS objects, immutable level JSON | Easy retry and share. |
| Save | `localStorage` (stars, coins, unlocked, settings) | No login allowed (contest rule). |
| Backend | None for the contest build | Share via URL-encoded level. Phase 2 uses Base44 entities for the gallery. |
| Audio | WebAudio, small mp3/ogg | Autoplay only after tap. |
| Orientation | CSS check + rotate overlay | iOS can't lock orientation. |
| Resize | `devicePixelRatio` aware canvas, `ResizeObserver` | Sharp on phones. |

## Game loop
```
fixed dt = 1/60
update(dt):
  input -> player intent
  move player (collision vs tiles and tall objects)
  emit noise events (gait x surface)
  for each seeker: perceive (vision, hearing), update state, move
  update detection meters
  check win (home) / fail (meter full, time out)
  update timers, boosters
render(alpha)
```

## Performance targets
- Max 24 seekers, 5 floors loaded one at a time.
- Raycasts: limit to seekers within 12 tiles of the player and on the same floor. Cache per frame.
- Pre-render static tilemap layers to offscreen canvases.
- Object pooling for particles.
- Frame budget 6 ms update, 8 ms render on a mid phone.
- Assets: sprite atlas (one PNG per zone), WebP where possible. First load under 3 MB.

## Testing
- Unit tests for: cone test, A*, detection meter, level validator.
- Automated level solvability test: run the validator on every JSON.
- Playtest checklist per level: win by intended route, fail by each seeker, timer fail, hint works.
- Device matrix: Chrome desktop, Safari macOS, Chrome Android (mid-range), Safari iOS.

## Telemetry (optional, privacy friendly)
Local counters only in the contest build: fails per level, time per level (shown in a debug overlay). Aggregate analytics are phase 2.

## Security and compliance
- No third-party scripts that need login. No external trackers.
- No user-generated content in the contest build.
- Content is original; keep a `CREDITS.md`.
- Base44 runs a security scan before Launchpad submission. Fix flagged items early (run a scan on day 5, not on the last day).

## Risks
| Risk | Mitigation |
|------|-----------|
| Base44's AI struggles with a large canvas engine in one prompt | Build it in stages using the prompt series in doc 15. Commit/version each stage. |
| Mobile performance | Test on a real phone on day 3. Reduce cone resolution (rays) to 48. |
| Scope creep | Contest build locked at "Must" tier (doc 00). |
| Touch controls feel bad | Playtest with 3 real people on day 4. |
