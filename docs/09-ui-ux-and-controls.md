# 09 UI, UX, and Controls

## Platform rules
- **Landscape only.** If the viewport is portrait, show the rotate screen (mockup 10) and pause the game.
- Layout targets: 1920x1080 desktop, 844x390 phone landscape (iPhone), 915x412 (Android). Use a fixed logical 16:9 canvas scaled to fit, with safe-area insets for notches.
- Request fullscreen on the first tap on mobile (Android Chrome allows orientation lock after fullscreen. iOS Safari does not, so keep the rotate prompt).

## Screens
1. **Title** (mockup 01): Play, Levels, Level Builder (locked badge "Coming soon" in contest build), Settings.
2. **Level Select** (mockup 06): 20 nodes on a winding path, stars, locks, zone banners.
3. **Pre-level card:** level name, objectives (reach Home Base, optional Trophy), seekers preview, timer, boosters allowed. "Go!" button.
4. **Gameplay HUD** (mockups 02, 03, 04).
5. **Pause:** Resume, Restart, Clue Notebook, Settings, Quit.
6. **Found You!** (mockup 14): instant retry.
7. **Results** (mockup 11): stars, time, coins.
8. **Settings:** sound, music, vibration, control layout (left-handed), colorblind cone colors, text size.
9. **Level Builder** (mockup 08), **Share** (mockup 15): phase 2.

## HUD layout (landscape)
| Position | Element |
|----------|---------|
| Top left | Noise meter (bars), key ring (small icons) |
| Top center | Timer (turns red under 25%) |
| Top right | Objective chip, minimap (L7+), pause button |
| Bottom left | Virtual joystick (mobile only) |
| Bottom center | Inventory slots (3, then 4) |
| Bottom right | INSPECT / HIDE context button, RUN button (mobile) |
| Floating | Seeker detection rings and "?" "!" icons |

## Controls
| Action | Desktop | Mobile |
|--------|---------|--------|
| Move | WASD or arrows | Left joystick (distance = speed) |
| Sneak | Hold Shift | Light push on the joystick |
| Run | Hold Space | Full push or RUN button |
| Interact / Search / Hide | E or F | INSPECT button |
| Use item | 1 to 4 | Tap slot |
| Notebook | N | Tap notebook icon |
| Pause | Esc | Pause button |
| Zoom (peek) | Hold Tab | Two-finger pinch (limited) |

Details:
- **Joystick:** floating, appears under the left thumb within the left 40% of the screen, dead zone 12%.
- **Sneak/walk/run by tilt:** push below 40% = sneak, 40 to 85% = walk, above 85% = run. A small label under the joystick shows the current gait icon (feet, shoe, rocket).
- **INSPECT button** shows the icon of what it will do (magnifier, hand for hide, key for unlock) and fills as a progress ring while holding.
- **Tap targets** at least 56 px logical.
- **Haptics** (mobile): short tick on detect rise, long buzz on found, soft tick on pickup.
- Gamepad support (later): left stick, A to interact, B to run.

## Camera
> **Superseded by `plan/01-view-camera-and-rendering-spec.md`.** The game uses a scrolling oblique view (mockup 04 look) with player zoom and fog of war, with a flat top-down fallback. The notes below are kept for history.

- Follows Pip smoothly, with a look-ahead of 1.5 tiles in the movement direction.
- Small levels (1 to 2) fit fully on screen. Bigger levels scroll.
- Hold Tab / pinch to peek farther ahead (limited to 6 tiles for 1 s, costs a short slowdown).
- Minimap on floors greater than 1 or larger than 40x20.

## Onboarding
- 3 prompts max in L1, 1 to 2 per new mechanic. Prompts are icon-based with 4 words max.
- Tutorial ghost hand shows the joystick the first time.
- The first Found You! shows "Tip" text. Tips cycle by cause (noise, vision cone, time).

## Accessibility
- Cone colors have shape differences too (stripes for chase, dots for suspicious).
- Colorblind mode: swap yellow/red for blue/orange.
- Reduce motion: disables screenshake and confetti.
- Text min 16 px on mobile.
- Toggle for "assist": longer seeker pauses (-25% difficulty), no stars penalty.
- Subtitles for sound cues ("footsteps nearby", "dog barks").

## Copy tone
Friendly and teasing. "Shhh!", "Almost there!", "Found you!", "Too slow!", "Sneaky!".
