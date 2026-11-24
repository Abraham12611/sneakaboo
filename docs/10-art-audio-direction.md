# 10 Art and Audio Direction

## Style
**Polished flat vector, warm cutaway dollhouse view**, seen from straight above with slight front-facing furniture sprites (see mockups 01 and 02). Chunky outlines, soft shadows, saturated warm interiors against dark cool exteriors.

## Palette
| Role | Color | Hex |
|------|-------|-----|
| Pip hoodie (hero) | Sunny yellow | #FFC933 |
| Calm cone | Soft yellow, 35% opacity | #FFE066 |
| Suspicious cone | Orange | #FF9F43 |
| Chase cone | Red | #FF4D4D |
| Exit / Home Base | Neon green | #2EE66B |
| UI primary | Teal | #1FB7B0 |
| UI accent | Purple | #6C4AB6 |
| Interior warm | Amber wood / cream | #D9A066 / #F6E3C5 |
| Exterior night | Deep green / navy | #1E3B2C / #1B2540 |

Rule: only Pip and pickups use saturated yellow/gold. Cones are a lighter yellow so the player never confuses them.

## Characters
| Name | Look |
|------|------|
| **Pip** | Kid, yellow hoodie, brown hair, small backpack. 4 animation sets: sneak (crouched), walk, run, hide. |
| **Grandma Gus** | Grey bun, purple cardigan, glasses, slippers. |
| **Uncle Marlo** | Big mustache, tank top, suspenders. |
| **Tilly & Tobi** | Twins, matching red pajamas. |
| **Biscuit** | Floppy-eared brown dog. |
| **Sprinter Sibling** | Teen in a track suit and headband. |
| **Night Watcher** | Cap, big flashlight, long coat. |
| **Auntie Alarm** | Green bathrobe, whistle around the neck. |
| **Head Seeker** | A stern Great-Aunt with a lantern and a ring of keys. |

All characters are original. No likeness to existing games.

## Sprite plan (contest build)
- Characters: 4 directions x (idle 2, walk 6, run 6) frames. Seekers: 4 dirs x (walk 6, look 4, search 4, chase 6).
- Furniture and objects: 60 sprites for the contest build (see doc 03 list), one shadow shape each.
- Tilesets: floor (wood, tile, carpet, creaky), walls (4 wall types), doors (open, closed, locked colors).
- UI: icons for items (mockup 05), buttons, meters, cone gradients.
- FX: dust puff, noise ring, sparkle, confetti, "?" "!" bubbles, potion shimmer.

**Budget option for the 9-day plan:** generate sprites with AI image tools, then assemble sheets. If time is short, render objects as clean vector shapes with CSS/canvas primitives using the palette above, and use AI art for the title, key art, level select, and item icons only.

## Camera and rendering
- Canvas 2D (or Phaser). Pixel snapping off, smooth scaling.
- Cones drawn as radial-gradient wedges clipped by wall raycasts.
- Dark levels: a black overlay with "light holes" via `globalCompositeOperation = "destination-out"`.
- Layered draw order: floor, shadows, objects, characters, tall furniture, cones (under characters, over floor), lighting, HUD.

## Animation and juice
- Squash and stretch on pickups, "pop" on item reveal.
- Door swing. Drawer slide. Rug flip.
- Screen shake at found. Slow-mo 0.3 s freeze-frame on found.
- Confetti on Home Base.
- Timer pulse under 10 s.

## Audio
| Cue | Style |
|-----|-------|
| Music, menu | Light, playful pizzicato strings and marimba. |
| Music, gameplay | Soft tense loop: low pizzicato bass, light percussion. Tempo rises when a seeker is Curious. |
| Music, finale | Full ensemble. |
| Footsteps | Per surface: wood, tile, carpet, creak. Louder when running. |
| Seeker humming | Each seeker has a distinct hum. Volume shows distance. |
| Alerts | "Huh?" short vocal for Curious. Whistle for chase. |
| Dog | Pants (near), barks (alert). |
| Search | Drawer slide, rattle, lid creak. |
| Pickup | Bright chime. |
| Potion | Sparkle and glug. |
| Found | Cartoon "boing" + "Found you!" kid voice. |
| Win | Short jingle and a kid laugh. |

Audio sources: generate with fal (music and sound effects) or royalty-free packs with licenses that allow commercial use. Keep a `CREDITS.md`. No copyrighted samples.

## Juice rules for mobile
- Total audio under 3 MB for first load. Lazy-load zone music.
- Respect silent switch, mute toggle always visible.
- First audio only after first tap (browser autoplay rules).
