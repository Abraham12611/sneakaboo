# 00 Vision and Contest

## Pitch
A top-down stealth game with the tension of classic sneak-in-the-house games, flipped into **hide and seek**. You are not stealing. You are a kid crossing a house full of relatives who are "it". Reach Home Base on the far side, within the time limit, without being found.

## Pillars
1. **Readable tension.** Every threat is visible: vision cones, noise rings, suspicion meters. The player should always know why they got caught.
2. **Curiosity pays.** Paintings, drawers, rugs, and wardrobes hide keys, potions, and clues. Searching is risky (time and noise), which makes it a real decision.
3. **Short and replayable.** A level takes 1 to 4 minutes. Failing restarts instantly. Stars make people go back.
4. **Family-friendly.** No violence. Getting caught is "Found you!" with confetti and a cartoon tag.
5. **Data-driven.** Every level is JSON. The same data runs the 20 built-in levels, the level builder, and shared friend levels.

## Target players
- Contest judges and voters: need to "get it" in 10 seconds, and see depth by minute 3.
- Casual mobile players (ages 8+): one-thumb sneaking, short sessions.
- Friends who want to make levels for each other (phase 2).

## Contest constraints (from the official page, checked Nov 24, 2026)
Source: https://nitropay.com/base44webgame/ and https://docs.base44.com/promoting-your-app/submitting-to-launchpad

| Rule | Design consequence |
|------|--------------------|
| Submissions close **Dec 3, 2026, 23:59 UTC**; winners Dec 10 | 9 days from today. Scope the contest build to a vertical slice (see doc 14). |
| Must be built **with Base44** and hosted on a Base44 URL | Develop inside Base44. Use this repo for design, assets, and level JSON to paste in. |
| Free, public, **no login, paywall, or download** | Guests can play everything. Progress in `localStorage`. No account wall anywhere. |
| No copyrighted or trademarked material | Original name, characters, art, audio. Do not use "Robbery Bob" naming, art, or characters. All art here is AI-generated original. |
| Judged on **Gameplay, Creativity, Technical Execution** (equal) | Polish the first 5 minutes. Show the hide-and-seek twist and the level builder teaser. |
| Community vote: top 25 upvoted on Launchpad reach the judges | Strong thumbnail, screenshots (1280x720+), short demo video (MP4/WebM, 50 MB max), and a share-friendly hook. |
| 18+ to enter | Confirm the entrant's age. |
| One game per account | Do not split the idea across two Base44 apps. |

## Scope tiers
- **Must (contest build):** movement and noise, vision cones, seeker AI (4 types), searchables (8 types), keys and doors, 2 boosters, timer, stars, levels 1-10 playable, desktop and mobile landscape controls.
- **Should:** levels 11-20, multi-floor stairs, 6 searchable types more, sound, daily challenge.
- **Could (post-contest):** level builder with share codes, community gallery, cosmetics.
- **Won't (v1):** online multiplayer, accounts, ads, in-app purchases.

## Success criteria
- A new player reaches Home Base in level 1 within 90 seconds with no tutorial text beyond 3 prompts.
- Loading time under 4 seconds on a mid-range phone on 4G.
- 60 FPS desktop, 30+ FPS on a 3-year-old phone.
- Zero login prompts.
