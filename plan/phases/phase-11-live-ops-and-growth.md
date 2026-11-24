# Phase 11: Live Ops and Growth

**Target:** after launch | **Contest critical:** no | **Milestone:** `P11 Live Ops`

**Goal:** keep players coming back: daily content, events, cosmetics, learning from data, more languages, more levels.

**Read first:** `docs/12-economy-and-meta.md`, `docs/08`, `plan/05`.

---

## P11.1 Daily challenge
- [ ] P11.1.1 `getDaily` function with a date-based seed and salt secret.
- [ ] P11.1.2 Procedural level assembly from room templates (hide/seek/keys placed by seed), validated by the shared validator and bot.
- [ ] P11.1.3 Daily screen, streaks, rewards, local and global best times.
- [ ] P11.1.4 Notification opt-in (mobile).

## P11.2 Seasons, events, and new zones
- [ ] P11.2.1 Seasonal themes (winter cabin, spooky season, beach house).
- [ ] P11.2.2 Event levels and limited cosmetics.
- [ ] P11.2.3 New seeker types and boosters per season.
- [ ] P11.2.4 Zones 6+ (hotel, school, ship) with 10 levels each.
- [ ] P11.2.5 Weekly Build Jam with a featured winner.

## P11.3 Cosmetics and economy
- [ ] P11.3.1 Pip outfits and seeker hats, equip UI, preview.
- [ ] P11.3.2 Coins, hints, boosters shop (no pay-to-win in the story).
- [ ] P11.3.3 Achievements and badges from `docs/12`.
- [ ] P11.3.4 IAP SKUs and restore purchases (Route B).
- [ ] P11.3.5 Anti-abuse (fake receipts, duplicate rewards).

## P11.4 Analytics and tuning
- [ ] P11.4.1 Aggregated anonymous analytics (funnel, level fail rates, time per level, retention).
- [ ] P11.4.2 Dashboard (Base44 dashboard or a simple report function).
- [ ] P11.4.3 Remote-tunable difficulty knobs per level (server config).
- [ ] P11.4.4 A/B tests for tutorial and hint placement.
- [ ] P11.4.5 Review privacy and kids compliance after each change.

## P11.5 Localization
- [ ] P11.5.1 Extract strings to a locale file system; plural and number rules.
- [ ] P11.5.2 Fonts for CJK and RTL (Arabic/Hebrew) support check.
- [ ] P11.5.3 Translate store listings and in-game text (EN, ES, PT-BR, FR, DE, JA, KO, ID).
- [ ] P11.5.4 Icon-first clues to reduce text.

## P11.6 Community and creator growth
- [ ] P11.6.1 Creator profiles, follow, badges (needs accounts, optional).
- [ ] P11.6.2 Featured levels and curated packs.
- [ ] P11.6.3 Replay sharing (short clips or ghost replays).
- [ ] P11.6.4 Social: friends leaderboard, challenge a friend link.
- [ ] P11.6.5 Community feedback loop (roadmap page, changelog).

---

## Ongoing rituals
- Weekly: review fail-rate and crash reports, ship a balance patch.
- Monthly: new content drop; update `plan/08` changelog.
- Each release: tag, release notes, regression run from `plan/07`.
