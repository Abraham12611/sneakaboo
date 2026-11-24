# Phase 7: QA, Performance, and Contest Submission

**Target:** Dec 1-3 (submit by Dec 2) | **Contest critical:** yes | **Gate:** G4 | **Milestone:** `P7 Submission`
**Deadline:** Dec 3, 2026, 23:59 UTC. Winners announced Dec 10.

**Goal:** a stable, public, no-login build on a Base44 URL, submitted with strong visuals and copy.

**Read first:** `plan/07`, `docs/00` (contest rules), `docs/14` (submission package), https://docs.base44.com/promoting-your-app/submitting-to-launchpad

---

## P7.1 Full regression
Acceptance: every checklist item passes on desktop Chrome and a real phone.
- [ ] P7.1.1 Play every level start to finish (human) and run the bot on all levels.
- [ ] P7.1.2 Test all hiding spots, all keys and doors, all boosters once each.
- [ ] P7.1.3 Test save/load, reset, private mode.
- [ ] P7.1.4 Test retry loops (30 retries in a row, no memory growth).
- [ ] P7.1.5 Edge cases: pause during search, rotate during play, tab switch, low battery mode.
- [ ] P7.1.6 Fix all S1 and S2 bugs. Triage S3.

## P7.2 Performance and devices
- [ ] P7.2.1 Profile worst level (largest, most seekers) on the reference phone.
- [ ] P7.2.2 Fix hotspots: cone rays, overdraw, texture memory, GC spikes.
- [ ] P7.2.3 Check load time on throttled Fast 4G (under 4 s to title).
- [ ] P7.2.4 Device matrix pass (Windows Chrome/Edge/Firefox, macOS Safari, Android Chrome, iPhone Safari).
- [ ] P7.2.5 Battery mode quality check.

## P7.3 Security and compliance
Acceptance: Base44 scan is clean; asset and content compliance verified.
- [ ] P7.3.1 Run the Base44 security scan; fix all issues (do this by Dec 1).
- [ ] P7.3.2 No login prompts, no paywall, no download required.
- [ ] P7.3.3 Asset audit: every asset in `CREDITS.md`; no Robbery Bob or other copyrighted/trademarked material; no real brands in art.
- [ ] P7.3.4 Fonts and audio licenses verified.
- [ ] P7.3.5 Secret scan on repo; remove anything sensitive.
- [ ] P7.3.6 Privacy note visible (no data collected beyond anonymous scores).
- [ ] P7.3.7 Confirm entrant is 18+ and one game per account.

## P7.4 Publish
- [ ] P7.4.1 Final build from `main` at tag `contest-rc1`; run tests, validate levels.
- [ ] P7.4.2 `base44 deploy --yes`; `base44 visibility public`.
- [ ] P7.4.3 Confirm the Base44 URL (custom domains are not allowed for the contest).
- [ ] P7.4.4 Run the smoke test in a private window on desktop and phone.
- [ ] P7.4.5 Freeze: tag `contest-final`. Only S1 fixes after this.

## P7.5 Submission assets
Acceptance: all assets meet Launchpad specs (up to 5 screenshots at 1280x720 or larger, or a video MP4/WebM up to 50 MB).
- [ ] P7.5.1 Capture 5 real screenshots: L1 gameplay, mansion two floors, inspect painting key, hiding in wardrobe (seeker approaching), potion invisibility. Use zoom variety.
- [ ] P7.5.2 Record a 30-45 s trailer from real gameplay with music: hook, hide, search, potion, escape, "Found you!" gag.
- [ ] P7.5.3 Thumbnail/key art (mockup 16 redone to match final art, check text).
- [ ] P7.5.4 Tagline, description (who, why, what's different), 3 categories, share message. Draft in `docs/14`.
- [ ] P7.5.5 Use "Improve with AI" in the form, then edit by hand.
- [ ] P7.5.6 Proofread everything; no claims the game doesn't deliver.

## P7.6 Submit and share
- [ ] P7.6.1 Submit the game on the contest page form (one game per account) and to Launchpad.
- [ ] P7.6.2 Track status in My submissions (Pending review -> Published). Fix "Needs changes" immediately.
- [ ] P7.6.3 Share link to friends, Base44 Discord, social channels with a clear vote ask.
- [ ] P7.6.4 Respond to comments (replies show an "App's creator" badge).
- [ ] P7.6.5 Daily reminder to supporters to upvote (once per day per app; no bots or fake accounts).

## P7.7 Buffer and hotfix window
- [ ] P7.7.1 Dec 3: only critical fixes; note listing edits while voting is live are limited to logo and screenshots.
- [ ] P7.7.2 Archive the final build (git tag, Base44 version).
- [ ] P7.7.3 Post-submission retro notes (what to fix first for P8-P10).

---

## G4 checklist (submission ready)
- [ ] Public, published, free, no login, Base44 URL.
- [ ] Security scan clean.
- [ ] L1-L8 minimum (L1-L10 target) playable.
- [ ] Desktop and mobile landscape verified.
- [ ] Submission form sent before Dec 3, 23:59 UTC (target Dec 2).

## Notes
- While voting is live, only the logo and screenshots can be edited without re-review.
- After voting ends, the listing is locked.
