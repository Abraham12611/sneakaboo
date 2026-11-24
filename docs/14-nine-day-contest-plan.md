# 14 Nine-Day Contest Plan

Today: **Tue Nov 24, 2026**. Deadline: **Thu Dec 3, 2026, 23:59 UTC**. Aim to **submit by Dec 2** to leave a buffer, because Base44 reviews Launchpad submissions and runs a security scan before listing. Votes accrue from Nov 5 to Dec 3, so earlier is better for the community vote.

## Principle
A **small, polished, fun game** beats a big broken one. Judges score gameplay, creativity, and technical execution equally. Lock the vertical slice first, then add.

## Build tiers
- **Tier 1 (Dec 1 cutoff):** L1-L10 playable, 4 seeker types, 8 object types, keys and doors, potion, radio, stopwatch, timer, stars, desktop + mobile controls, title/level select/results, sound basics, **stairs and floors, scrolling zoomable camera, hiding system (see plan/02)**.
- **Tier 2 (if time):** L11-L20, 6 more objects, more boosters, clue notebook, music.
- **Tier 3 (stretch):** Level Builder teaser (read-only share link), daily challenge.

## Daily plan
| Day | Date | Focus | Done when |
|-----|------|-------|-----------|
| 1 | Tue Nov 24 | Design docs, mockups, name. Create the Base44 app. Decide engine (Canvas or Phaser). | Docs done. App created. Stage 1 prompt sent. |
| 2 | Wed Nov 25 | **Core engine**: tilemap render, Pip movement, collision, camera, joystick and keyboard. Level JSON loader with L1. | Walk around L1 on desktop and phone. |
| 3 | Thu Nov 26 | **Seekers + vision**: cones, raycasts, detection meter, patrol, found/fail, timer, home base win. Test on a real phone. | L1 is fully playable and fair. |
| 4 | Fri Nov 27 | **Interaction**: search objects, hide spots, keys and doors, noise rings, stars, results, save. Levels 2-4. | L1-L4 playable with stars saved. |
| 5 | Sat Nov 28 | **Items and AI depth**: potion, radio, stopwatch, Snoopy, twins, dog. Levels 5-8. Run Base44 security scan. | L1-L8 playable. Scan clean. |
| 6 | Sun Nov 29 | **Content + screens**: Level select, title polish, pause, settings, rotate prompt, level 9-10. Sound effects and music. | L1-L10 playable. Full menu flow. |
| 7 | Mon Nov 30 | **Playtest day**: 3 to 5 people (phone and desktop). Fix top 10 issues. Balance timers. | Playtest notes resolved. |
| 8 | Tue Dec 1 | **Polish + stretch levels**: juice, tutorial prompts, art pass. L11-L20 if stable. Freeze features. | Feature freeze. |
| 9 | Wed Dec 2 | **Publish + submit**: public, published, no login. Screenshots (5 at 1280x720+), demo video (MP4 under 50 MB), tagline, description. Submit to Launchpad via the contest page form. Share. | Submission accepted or pending review. |
| Buffer | Thu Dec 3 | Fix rejections, share, ask friends to vote. Final deadline 23:59 UTC. | |

## Submission package
- Base44 URL (public, published, free, no login).
- Tagline: "The whole house is looking for you."
- Description (draft): "Sneakaboo is a top-down stealth hide-and-seek game. You're Pip. The whole family is 'it'. Sneak through the house, search drawers and paintings for keys and potions, dodge vision cones, and reach Home Base before time runs out. 20 levels, new seekers every few levels, designed for desktop and phones (landscape)."
- Categories (pick up to 3): Games, Puzzle, Action (confirm names in the form).
- Screenshots: mockup-quality in-game captures: L1 gameplay, mansion 2 floors, inspect painting, invisibility potion, hiding in a wardrobe, level select.
- Demo video (30 to 45 s): hook (Found You!), core loop, potion, win. Record from the game, add music.
- Share message: "Can you sneak past Grandma? Play Sneakaboo (free, no login): <Launchpad link>. Upvote if you win!"

## Voting strategy
- Community Vote: top 25 most-upvoted apps go to a Base44 panel. You can upvote each app once a day, **not your own**. No bots or fake accounts.
- Post to: Base44 Discord, X, Reddit game dev communities where self-promo is allowed, friends and family groups, WhatsApp statuses.
- Ask for daily votes with a short link.

## Risk register
| Risk | Plan |
|------|------|
| Base44 AI can't produce the engine in few prompts | Break into the stages in doc 15. Keep prompts small. Keep each stage working before moving on. |
| Performance on phones | Test day 3. Cut ray count, disable shadows. |
| Level content takes long | Levels are JSON. Use a simple authoring helper and the validator. Ship L1-L10 if L11-L20 slip. |
| Review/security scan delays | Run scan day 5. Submit day 9 at the latest, preferably earlier. |
| Art volume | Mix AI art for hero screens + simple vector shapes in-game. |
| Illness / time loss | The minimum viable build is L1-L5 with all core mechanics. |

## Definition of done (submission)
- [ ] Loads in under 4 s, no login anywhere.
- [ ] L1-L10 completable (verified by playing each).
- [ ] Works on desktop Chrome and mobile Chrome/Safari in landscape with the rotate prompt.
- [ ] No console errors on load and level start.
- [ ] No copyrighted content. Credits page.
- [ ] Contest form submitted.
