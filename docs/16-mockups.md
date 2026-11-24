# 16 Mockups

All images generated with fal `openai/gpt-image-2.6/sunburst/text-to-image` (16:9, high quality). Files are in `../mockups/`. They are **concept art**, not final assets. Text inside images is AI-rendered and may contain small errors.

| # | File | What it shows | Notes |
|---|------|---------------|-------|
| 01 | [title screen](../mockups/01-title-screen.png) | Logo, mansion backdrop, menu buttons | Final logo should be redrawn as a clean vector. |
| 02 | [level 1 gameplay](../mockups/02-level1-gameplay.png) | Cottage with Grandma and Uncle, cones, HUD, joystick, INSPECT, EXIT | Best reference for the in-game look and HUD. |
| 03 | [mansion, two floors](../mockups/03-mansion-two-floors.png) | Locked doors, colored keys, dog sniff radius, minimap, hiding in a wardrobe, painting | Seekers rendered as guards in uniforms. Final seekers should be the family characters from doc 10. |
| 04 | [inspect painting](../mockups/04-inspect-painting-key.png) | Search ring, "You found a Silver Key!" card, suspicion bubble | |
| 05 | [item icons](../mockups/05-items-sheet.png) | Potions, keys, gadgets, trophy | |
| 06 | [level select](../mockups/06-level-select.png) | 20-level path with zones, stars, locks | |
| 07 | [seeker characters](../mockups/07-seeker-characters.png) | Seeker types and Pip | |
| 08 | [level builder](../mockups/08-level-builder.png) | Editor with palette, properties, share code | Phase 2. |
| 09 | [mobile landscape controls](../mockups/09-mobile-landscape-controls.png) | Phone in landscape, joystick, INSPECT, RUN | |
| 10 | [rotate phone](../mockups/10-rotate-phone.png) | Portrait-mode overlay | |
| 11 | [results screen](../mockups/11-results-screen.png) | Stars, stats, buttons | |
| 12 | [invisibility potion](../mockups/12-invisibility-potion.png) | Potion effect and timer ring | |
| 13 | [hiding in wardrobe](../mockups/13-hiding-in-wardrobe.png) | Hide mechanic, seeker approaching | |
| 14 | [found you](../mockups/14-found-you.png) | Friendly fail screen | |
| 15 | [share a level](../mockups/15-share-level.png) | Share card with code and friends board | Phase 2. First version showed a side-scroller preview, so it was regenerated as top-down. |
| 16 | [key art](../mockups/16-key-art.png) | Promo thumbnail | Use for Launchpad thumbnail after checking text accuracy. |

## Observations to carry into production
- The model draws recognizable HUD patterns. Keep them: timer top center, noise meter top left, inventory bottom center, joystick bottom-left, INSPECT bottom-right.
- Mockup 03 shows a good multi-floor layout and a minimap. Use it as the L9 target.
- Mockup 02 has the strongest "cozy" feel. Make L1 look like this.
- In mockup 03 the seekers read as police. Regenerate seeker sprites per doc 10 to keep the family-friendly tone.
- Re-check any text in the images before using them publicly (the share-level mockup in particular).

## Prompts
Prompts used are stored in the generation history on fal and summarized above. To regenerate, reuse the descriptions in the table with the style line: "polished flat vector game art, warm colors, original characters, no real brands".

## Next mockups to generate
Sprite sheets (furniture, characters, tiles), a level-select zone banner set, app icon (1024x1024), store screenshots, 10 s trailer storyboard, Pip outfit variants.
