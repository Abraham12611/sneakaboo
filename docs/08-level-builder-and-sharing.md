# 08 Level Builder and Sharing (Phase 2)

Built after the contest build is stable. Design for it now so nothing needs to be rewritten (see doc 07).

## Goals
- Let a player build a house, hide things, set the difficulty, and send it to a friend in under 5 minutes.
- Make the builder a *game feature*, not a developer tool: friendly, with templates.

## Editor modes
1. **Build:** paint floors, walls, doors, windows, stairs. Drag furniture.
2. **Hide:** place keys, clues, boosters, trophies inside objects. Pick which drawer holds what.
3. **Seek:** place seekers, draw patrol paths, choose types and "look" points.
4. **Rules:** timer, star thresholds, allowed boosters, darkness, alarm.
5. **Test:** play the level. The level must be **completed once by its creator** before sharing (prevents impossible levels).

## UI (see mockup 08)
- Left palette: tiles, furniture, containers, doors, stairs.
- Right panel: selected object properties (contents, search time, locked?).
- Top bar: Undo, Redo, Floors tabs, Test Play, Save, Share.
- Bottom: validator results ("Home Base unreachable", "Gold door has no key").
- Touch: pinch to zoom, two-finger pan, long-press to place, tap to select.

## Templates
Start from: Empty House (small), Two-Floor Home, Mansion, Apartment, Museum. Each has base walls, doors, and furniture ready.

## Difficulty rating
Auto-calculated from: seeker count and types, cone coverage over the main route, time per solve estimate, number of keys and doors. Shown as 1-5 stars. Creators can override within 1 step.

## Hide something for a friend
A special **Friend Mode**: "Hide a trophy where you think a friend will not find it". Friends must find it while evading seekers. Leaves a message card on discovery ("You found my secret acorn!").

## Sharing
- **Link share:** the whole level encoded in the URL (works with no backend).
- **Short code:** `AB12-XY`, stored in the database in phase 2, needed for leaderboards and popularity.
- Share sheet: copy link, WhatsApp, X, Messages, QR code.
- Social proof: creator name, play count, completion rate, best time (anonymous names until accounts exist).

## Community (later)
- Gallery tabs: Featured, New, Popular, Friends.
- Likes and reports. Reported levels hidden pending review. Content filter for names/text.
- Weekly "Build Jam" theme.
- Creator badges for levels with 100+ plays.

## Safety and moderation
- Names and text fields filtered for profanity (word list + length limit 30).
- No free-text chat. No external links in level data.
- Report button on every shared level.
- Child safety: no user photos, no voice. Anonymous creator names are generated ("Sneaky Fox 42").

## Anti-cheese rules
- Levels shown in the gallery only if the creator's clear time is recorded.
- Leaderboards use the replay ("ghost") hash only in phase 3.

## Data for community features (phase 2, Base44 entities)
- `SharedLevel`: id, code, name, creatorName, json, difficulty, plays, clears, likes, createdAt.
- `LevelScore`: levelId, playerName, bestTime, stars.
- `Report`: levelId, reason.
