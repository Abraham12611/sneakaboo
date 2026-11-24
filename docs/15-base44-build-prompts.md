# 15 Base44 Build Prompts

> **Note (Nov 24):** the build now uses the **Base44 CLI plus a code repo** (see `plan/03`). These chat prompts are still useful if work moves into the Base44 editor. They describe a whole-level view with a fixed camera. The current spec is a **scrolling, zoomable oblique camera with fog of war** (`plan/01`) and an expanded hiding system (`plan/02`), so adapt Stage 1 and Stage 3 before using them.

Paste these into the Base44 chat **one stage at a time**. Test each stage before sending the next. Paste the referenced JSON or table from the docs when a prompt says so. Prompts are written so they do not require a login, a database, or any backend.

> Tip: Base44 can lose context on long prompts. If a stage fails, send a smaller fix prompt that names the exact file or screen.

---

## Stage 0: Project setup
```
Build a free web game called "Sneakaboo", a top-down stealth hide-and-seek game.
Rules for the whole project:
- No login, no accounts, no paywall, no backend. All progress is saved in localStorage.
- Landscape layout only. If the screen is portrait, show a full-screen "Rotate your phone to play" message and pause the game.
- Works on desktop (keyboard) and mobile (touch).
- The game is drawn on one HTML canvas with a fixed 1280x720 logical size that scales to fit the screen.
- Use only original art made from simple shapes and colors for now. No copyrighted content.
- Colors: Pip (player) yellow #FFC933, vision cones soft yellow, exit neon green #2EE66B, UI teal #1FB7B0 and purple #6C4AB6.
Create these screens: Title, Level Select, Game, Results, Settings. Title has buttons Play, Levels, Settings. Use big friendly rounded buttons. Just scaffold the screens and navigation for now.
```

## Stage 1: Engine core
```
In the Game screen, implement a top-down tile-based engine:
- Tile size 48 px. Load a level from a JSON object (I will paste the format).
- Tiles: wall '#', floor '.', carpet '~', tile 't', grass 'g'. Draw them with flat colors.
- Player "Pip" is a yellow circle with a hood shape, 8-direction movement with collision against walls.
- Gaits: sneak 1.8 tiles/s, walk 3.0, run 4.6. Keyboard: WASD/arrows to move, Shift = sneak, Space = run. Touch: a floating joystick on the left side of the screen. Push distance <40% = sneak, 40-85% = walk, above 85% = run.
- Smooth camera follow with the level scrolling if bigger than the screen.
- A "Home Base" tile shown as a glowing green door. Reaching it shows the Results screen.
- A countdown timer at the top center that starts when Pip first moves. At zero show "Time's up!" with a Retry button.
Here is Level 1 JSON: <paste L01.json>
```

## Stage 2: Seekers and vision
```
Add seekers (enemy NPCs who are "it" in hide and seek):
- Each seeker follows a waypoint patrol path from the level JSON (waypoints have x, y, wait seconds, look angle, and loop type: loop or pingpong).
- Each seeker has a vision cone (range in tiles, angle in degrees) drawn as a translucent yellow wedge on the floor. Walls block the cone (raycast on the tile grid). Draw the cone under the characters.
- Detection meter per seeker: while Pip is in the cone it fills at 1.2/s at point blank, 0.4/s at max range. Sneaking multiplies by 0.7, running by 1.4. It drains 0.5/s when Pip is out of sight. Show a small ring above the seeker. At 0.4 the seeker turns toward Pip and shows "?" and the cone turns orange. At 1.0 Pip is FOUND: show "FOUND YOU!" with a short screen shake and a Try Again button that restarts the level instantly.
- Safe start: seekers cannot see Pip for the first 3 seconds.
- Noise: walking makes a noise ring of radius 2.5 tiles, running 6 tiles, sneaking 0. Draw the ring briefly. Seekers whose hearing range covers the ring go to Investigate at that spot for 3 seconds, then return to their patrol.
Use the seeker types from this table: <paste table from docs/05-seeker-ai.md>
```

## Stage 3: Interactions, keys, hiding
```
Add interactable objects defined in the level JSON ("objects"):
- A context button: key E on desktop, a big INSPECT button on touch (bottom-right). It acts on the nearest object within 0.9 tiles. Holding it fills a progress ring over the object for that object's "search time", then reveals its "contains" payload. Moving cancels. Each search makes a small noise ring.
- Payload kinds: empty, key (bronze/silver/gold), clue (show a card with an icon and short text), booster (potion, radio, squeaky toy, slippers), stopwatch (+seconds to the timer), coin, trophy.
- A key ring in the top-left shows collected keys. Locked doors of a matching color open when Pip touches them with the key.
- Hiding spots (wardrobe, under bed, big chest): pressing INSPECT enters, Pip becomes invisible to vision cones. Press again to exit. A seeker with "checks" on that spot opens it if Pip is inside, which means FOUND.
- Searched objects show a faded checkmark.
- Inventory: 3 slots at the bottom center. Tap or press 1-3 to use. Invisibility Potion: Pip is invisible to cones for 12 seconds, shown as a blue shimmer and a draining ring.
Here is the payload and object list: <paste docs/03-searchable-objects.md and docs/04-items-keys-boosters.md tables>
```

## Stage 4: Stars, saving, level select
```
- Stars: 1 for reaching Home Base, 2 for reaching it with at least 35% of the time left, 3 for also picking up the level's trophy.
- Save stars, coins, and unlocked levels in localStorage. Level N+1 unlocks when level N is cleared.
- Level Select screen: a winding path with 20 numbered nodes grouped into 5 zones (Cozy Cottage 1-4, Suburban House 5-8, Mansion 9-12, Haunted Manor 13-16, Grand Estate 17-20), each showing 1-3 stars or a padlock.
- Results screen: HOME BASE! banner, stars animation, time, trophy found, coins, buttons Next Level, Retry, Levels.
- Pause menu: Resume, Restart, Settings, Quit.
```

## Stage 5: Levels 1-10
```
Add these 10 level JSON files and wire them to the Level Select: <paste L01..L10 JSON>.
Check each one loads, has reachable Home Base, and that every locked door has a matching key somewhere reachable. Add a console validator that logs problems.
```
(Write the JSON from `docs/levels/*.md` using the schema in `docs/07-level-data-format.md`. Ask Base44 or another AI to turn each level description into JSON, then run the validator.)

## Stage 6: Polish
```
Polish pass:
- Sound effects with WebAudio (footsteps by surface, pickup chime, found boing, win jingle) and a soft looping music track with a mute toggle in the pause menu. Audio starts only after the first tap.
- Particle effects: dust when running, sparkle on pickups, confetti on win.
- Timer turns red under 25% and pulses under 10 seconds.
- Tutorial prompts in Level 1 (max 3, icon plus 4 words).
- Settings: sound, music, vibration (on mobile), left-handed controls, colorblind cone colors, reduce motion.
- Touch targets at least 56 px. Handle phone notches with safe-area insets.
- Performance: 60 FPS desktop, cap cone raycasts at 48 rays per seeker, pre-render static tiles to an offscreen canvas.
```

## Stage 7: Extra levels and features (if time)
```
Add stairs and multiple floors (a "floors" array, a stairs object linking two floors, a minimap), the Sniffer Dog and Sprinter seekers, the clue notebook, safe codes, then levels 11-20: <paste JSON>.
```

## Stage 8: Release prep
```
- Add a Credits screen.
- Make sure there are no login prompts anywhere.
- Add a short "How to play" on the title screen.
- Run the security scan and fix any flagged items.
- Publish the app and set visibility to Public.
```

---

## Image and audio prompt library (for fal)
Use these to make final art. Keep style consistent (flat vector, chunky outlines, warm interiors).
- **Furniture sheet:** "Top-down game sprite sheet, flat vector style with chunky outlines: sofa, armchair, dining table with chairs, wardrobe, bed, dresser, bookshelf, fridge, kitchen counter, rug, plant, piano, chest, barrel, painting. Transparent background, consistent lighting from top-left."
- **Characters:** "Top-down 4-direction sprite sheet of a kid in a yellow hoodie: idle, walk cycle 6 frames, run cycle 6 frames, crouch walk 6 frames. Transparent background."
- **Seekers:** one prompt each from `docs/10-art-audio-direction.md`.
- **Tiles:** "Seamless tileable floor textures, top-down: warm wood planks, checkered kitchen tile, red carpet, creaky cracked boards, grass."
- **Music:** "Playful tense stealth loop, pizzicato strings and marimba, 100 BPM, 60 seconds, loopable, no vocals."
- **SFX:** footstep on wood, drawer opening, key pickup chime, cartoon boing, dog bark, grandma humming, clock chime.
