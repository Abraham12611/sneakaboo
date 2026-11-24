# Phase 9: Level Builder and Community

**Target:** Dec onward | **Contest critical:** no | **Milestone:** `P9 Builder`
**Depends on:** G3, P6 (backend), P8 for full object set.

**Goal:** players can build houses, hide keys and collectibles, set difficulty, and share them with friends. Safe by default for a young audience.

**Read first:** `docs/08-level-builder-and-sharing.md`, `docs/07-level-data-format.md`, `plan/05`.

---

## P9.1 Schema freeze and shared validator
Acceptance: schema v1 frozen; validator runs identically in the browser and in backend functions.
- [ ] P9.1.1 Freeze level schema v1, document migrations for v2.
- [ ] P9.1.2 Move the validator into a shared package imported by client and `base44` functions.
- [ ] P9.1.3 Add limits: size 80x50 tiles, 5 floors, 24 seekers, 200 objects, JSON under 64 KB.
- [ ] P9.1.4 Difficulty rating algorithm (seekers, cone coverage, solve time, locks).
- [ ] P9.1.5 Golden tests: all 20 official levels pass.

## P9.2 Editor core
Acceptance: build a small house with walls, doors, furniture, and place Pip start and Home Base on desktop and tablet.
- [ ] P9.2.1 Editor shell reusing the game renderer (same camera and zoom).
- [ ] P9.2.2 Tools: paint floor, draw wall, door, window, erase, select, move, rotate, copy.
- [ ] P9.2.3 Palette from the object library with categories.
- [ ] P9.2.4 Undo/redo, autosave to localStorage, multiple floors and stairs.
- [ ] P9.2.5 Templates (Empty, Two-Floor, Mansion, Apartment).
- [ ] P9.2.6 Touch editing: pan, pinch zoom, long press place.

## P9.3 Hide, seek, rules modes
- [ ] P9.3.1 Hide mode: set contents of containers, place keys, clues, boosters, trophies.
- [ ] P9.3.2 Seek mode: place seekers, draw patrol paths with look points, preview cones.
- [ ] P9.3.3 Rules mode: timer, star thresholds, allowed boosters, darkness, alarm.
- [ ] P9.3.4 Live validator panel with clear fix hints ("Gold door has no key").
- [ ] P9.3.5 "Friend mode": hide a trophy and leave a message card.

## P9.4 Test play and publish gate
Acceptance: a level can be published only if its creator beats it once.
- [ ] P9.4.1 Test Play button with return-to-editor.
- [ ] P9.4.2 Record clear time and store a proof hash.
- [ ] P9.4.3 Block publishing until validator passes and a clear exists.
- [ ] P9.4.4 Auto-generated thumbnail and name suggestion.

## P9.5 Link sharing (no backend)
- [ ] P9.5.1 Compress and encode JSON into a URL (`#/play?c=...`).
- [ ] P9.5.2 Open shared link: load, validate, play.
- [ ] P9.5.3 Share sheet: copy link, Web Share API, QR code.
- [ ] P9.5.4 Safe handling of malformed or malicious codes.

## P9.6 Short codes and gallery (backend)
- [ ] P9.6.1 `SharedLevel` entity live; `publishLevel`, `getLevel` functions.
- [ ] P9.6.2 Short code `AB12-XY` generation (collision-safe).
- [ ] P9.6.3 Gallery: New, Popular, Featured, filters by difficulty.
- [ ] P9.6.4 Per-level leaderboards and "friends" via shared code groups (no accounts needed).
- [ ] P9.6.5 Plays, clears, likes counters.
- [ ] P9.6.6 Share card (mockup 15).

## P9.7 Moderation and safety
- [ ] P9.7.1 Name/text filter, length limits, no free chat, no links in level data.
- [ ] P9.7.2 Report button, auto-hide at threshold, admin review via `base44 dashboard`.
- [ ] P9.7.3 Rate limits on publishing.
- [ ] P9.7.4 Terms and community guidelines page.
- [ ] P9.7.5 Optional: creator accounts via `base44 auth social-login` (not required to play).
- [ ] P9.7.6 Privacy review for children.

---

## Exit criteria
- [ ] Build, test, publish, share, and play a friend's level end to end.
- [ ] Moderation path works.
- [ ] 20 official levels untouched by the editor work.
