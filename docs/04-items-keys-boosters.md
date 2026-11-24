# 04 Items, Keys, Clues, Boosters, Collectibles

Inventory: **3 slots** for consumables (4 from level 11 on, via an unlockable "Bigger Pockets" upgrade). Keys and key parts do **not** use slots. They sit on a key ring (HUD, top left).

## Keys and key parts
| Item | Opens | Notes |
|------|-------|-------|
| Bronze Key | Bronze doors, desks, small chests | Most common. |
| Silver Key | Silver doors and chests | Usually on a different floor than its door. |
| Gold Key | Gold doors, the Home Base gate in late levels | Often needs a clue to find. |
| Skeleton Key | Any one locked door, consumed | Rare reward from 3-star trophies and daily challenge. |
| Key Half (A + B) | Jammed "split lock" doors | Halves are in different rooms. |
| Gear A / B / C | Machinery doors (elevator, drawbridge, portcullis) | Three gears needed. |
| Code | Safe, keypad door | 3 or 4 digits assembled from clues. |
| Switch pair | Two switches must be flipped within 10 seconds | Teaches timing and routing. |

**Multi-lock rule:** A level can use at most 3 colors of keys plus one machinery set. More feels like a chore.

## Boosters (consumables)
| Booster | Effect | Duration | Cost to use | Where found |
|---------|--------|----------|-------------|-------------|
| Invisibility Potion (blue) | Invisible to vision cones. Still audible. Seekers who bump into Pip find him. | 12 s (15 s upgrade) | 1 slot | Medicine cabinets, hidden spots, rewards |
| Speed Boots | x1.35 move speed, noise as walking. | 8 s | 1 slot | Trunks, closets |
| Sneaky Slippers | All gaits silent, including run. | 20 s | 1 slot | Shoe racks, laundry |
| Radio | Placed on the floor. Plays music after 2 s, creates noise events at its spot every 1 s. | 8 s | 1 slot | Shelves |
| Squeaky Toy | Throw up to 6 tiles. Makes one big noise. | instant | 1 slot | Toy chest |
| Decoy Teddy | Placed. Seekers within 8 tiles walk to it and "inspect" for 6 s. | 6 s | 1 slot | Bedrooms |
| Flashlight | Dark rooms: reveals a 3-tile circle. Seekers see Pip x1.2 easier while on. | toggle | 1 slot | Nightstand |
| Stopwatch | +10 s (small) or +15 s (big). Instant on pickup. | instant | no slot | Fridge, clocks |
| Map Scroll | Shows the whole level layout, locked doors, and seeker patrol lines for 5 s. | 5 s | 1 slot | Suitcases, studies |
| Mirror Shard | Lets Pip peek around a corner: shows a safe cone preview for 3 s. | 3 s | 1 slot | Bathrooms |
| Sticky Gum | Place on floor, a seeker that steps on it freezes for 2 s. | 2 s | 1 slot | Candy jars |
| Whistle (late) | Pull one seeker toward a spot you aim at. | instant | 1 slot | Library |

**Booster balance:** a booster should save about 10 to 20 seconds or avoid one danger. No booster removes the need to sneak.

## Clues
Clue cards pop up when a clue object is searched. They are saved in the **Clue Notebook** (a button on the HUD, pauses nothing).
| Clue type | Example |
|-----------|---------|
| Direction | "The silver key sleeps where the sun never visits." (bathroom cabinet) |
| Pattern | A painting with 3 colored dots: red, blue, yellow = safe code order. |
| Count | "The third book from the left." |
| Hot/cold | A warm drawer glows faintly when Pip stands next to it after reading a clue. |
| Code piece | One digit per clue, 3 clues = 3 digits. |
| Map note | Marks a secret passage on the minimap. |

Rules:
- A clue must always be findable in the same section as the thing it points to or earlier.
- Early levels use **picture clues**, not text. Later levels can use riddles.
- Always offer a "Hint" button after 60 seconds on a clue card: it highlights the target object for 3 seconds. Hints cost coins (see economy doc).

## Collectibles (optional goals)
| Collectible | Purpose |
|-------------|---------|
| Trophy (1 per level) | Third star. |
| Golden Acorn (3 per zone) | Zone-wide collection, unlock zone cosmetics. |
| Coins | Currency. |
| Toy Tokens (20 total) | Unlock Pip outfits and seeker silly hats. |
| Family Photos (secret, 1 per zone) | Lore, found in clue-based hidden spots. Unlock a bonus mini-comic. |

## Prank items (harmless traps)
| Item | Trigger |
|------|---------|
| Squeaky floor toy | Pip steps on it, loud squeak. |
| Whoopee cushion on chairs | Pip searches that chair, noise burst. |
| Spring snake in a drawer | Pip is startled (0.5 s stun), noise. |
| Creaky chest lid | 30% chance of loud creak on opening. |

## Inventory UI rules
- Tap a slot or press 1 to 4 to use. Hold a slot to drop. Dropping makes small noise.
- A full inventory prompts "Swap?" with the item on the floor.
- Used items give a clear on-screen cooldown ring (potion shows a draining ring around Pip).
