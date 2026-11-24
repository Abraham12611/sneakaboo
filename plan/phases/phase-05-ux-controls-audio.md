# Phase 5: UX Shell, Controls, Audio, and Juice

**Target:** Nov 29-Dec 1 | **Contest critical:** yes | **Gate:** G3 (with P4) | **Milestone:** `P5 UX`
**Depends on:** P1 (input, camera), P3 (HUD data).

**Goal:** a complete, polished, friendly game around the mechanics: menus, HUD, mobile polish, sound, and feel.

**Read first:** `docs/09-ui-ux-and-controls.md`, `docs/10-art-audio-direction.md`, mockups 01, 02, 04, 06, 09-14.

---

## P5.1 Screens and navigation
Acceptance: full flow Title -> Levels -> Pre-level -> Play -> Results/Found -> next works without refresh.
- [ ] P5.1.1 Title screen (mockup 01) with Play, Levels, Level Builder ("Coming soon"), Settings, Credits.
- [ ] P5.1.2 Level select (mockup 06): zones, stars, locks, scroll on mobile.
- [ ] P5.1.3 Pre-level card: name, objectives, seekers preview, timer, "Go!".
- [ ] P5.1.4 Pause menu: resume, restart, notebook, settings, quit.
- [ ] P5.1.5 Results (mockup 11) with star animation and coins.
- [ ] P5.1.6 Found You! (mockup 14) with a cause tip and instant retry.
- [ ] P5.1.7 Time's Up screen.
- [ ] P5.1.8 Credits and "How to play".
- [ ] P5.1.9 Screen transitions (fade, door wipe).

## P5.2 HUD
Acceptance: HUD matches mockups 02 and 04 and scales on all device sizes.
- [ ] P5.2.1 Noise meter, timer, objective chip, key ring, inventory slots, minimap, floor label.
- [ ] P5.2.2 Zoom buttons (+/-) and zoom indicator on mobile and desktop.
- [ ] P5.2.3 Interact hint icons and progress ring styling.
- [ ] P5.2.4 Clue notebook UI and clue card popups.
- [ ] P5.2.5 Booster active rings and "12s" counters.
- [ ] P5.2.6 Detection rings and bubbles (world UI) clamped for zoom.
- [ ] P5.2.7 Key hints (E, Shift, Ctrl/Space) as in mockup 04, hidden on touch.

## P5.3 Mobile
Acceptance: plays well on a real phone in landscape; portrait shows the rotate screen; no scroll bounce.
- [ ] P5.3.1 Rotate-phone overlay (mockup 10) and auto-pause.
- [ ] P5.3.2 Fullscreen request on first tap (where allowed); hide browser bars via meta tags and CSS.
- [ ] P5.3.3 Safe-area insets, notch handling, `touch-action: none`, prevent double-tap zoom and pull-to-refresh.
- [ ] P5.3.4 Joystick feel tuning; button sizes at least 56 px; left-handed swap.
- [ ] P5.3.5 Haptics via `navigator.vibrate` where supported.
- [ ] P5.3.6 Performance modes: High, Balanced, Battery (fewer rays, no lighting blur).
- [ ] P5.3.7 Test on at least one real Android and one iPhone.

## P5.4 Settings and accessibility
- [ ] P5.4.1 Sound, music, SFX, haptics, vibration.
- [ ] P5.4.2 Zoom default slider; threat arrows toggle; patrol-path assist toggle.
- [ ] P5.4.3 Colorblind cone palette and pattern cues.
- [ ] P5.4.4 Reduce motion (no shake/confetti), text size.
- [ ] P5.4.5 Assist mode (longer seeker pauses), shown clearly and never shaming.
- [ ] P5.4.6 Keyboard remap (nice to have).

## P5.5 Audio
Acceptance: all events in `plan/04` have a sound; audio loads lazily; autoplay rules respected.
- [ ] P5.5.1 Audio engine (WebAudio), unlock on first tap, mute toggle always visible.
- [ ] P5.5.2 SFX: footsteps by surface, searches, door creaks, pickups, potion, found, win, timer warning, dog, humming.
- [ ] P5.5.3 Music: menu loop, gameplay loop with tension layer when seekers are Curious, win/fail stingers.
- [ ] P5.5.4 Mix and loudness normalization; positional volume for seeker sounds.
- [ ] P5.5.5 Asset size check (under 3 MB initial).
- [ ] P5.5.6 License log in CREDITS.md.

## P5.6 Juice and tutorial
- [ ] P5.6.1 Screen shake, freeze frame, squash/stretch, door swing, drawer slide.
- [ ] P5.6.2 Particles: dust, sparkle, confetti.
- [ ] P5.6.3 Timer pulse and vignette under 10 s.
- [ ] P5.6.4 Tutorial prompts: L1 (3), L2 hide and radio, L3 keys, L4 surfaces; ghost-hand joystick hint.
- [ ] P5.6.5 Pip personality: small emotes (shush, gulp, wave).
- [ ] P5.6.6 Seeker personality: humming, "huh?" sounds, comedic reactions.

## P5.7 Save system
Acceptance: progress survives refresh; corrupt data does not crash.
- [ ] P5.7.1 Versioned save with migrations (see `plan/04`).
- [ ] P5.7.2 Save stars, best times, coins, unlocks, settings, tutorial flags.
- [ ] P5.7.3 Reset progress option with confirm.
- [ ] P5.7.4 Export/import save (copy code) as a safety net.
- [ ] P5.7.5 Private browsing / storage-blocked fallback (in-memory).

---

## G3 exit checklist
- [ ] Full flow works start to finish on desktop and phone.
- [ ] All screens match mockups in spirit.
- [ ] Audio in, no clipping, mute works.
- [ ] No login or paywall anywhere.
- [ ] Run the Base44 security scan once (early warning).

## Risks
iOS audio and fullscreen quirks (R-9). Too much UI polish before core is solid: keep to the checklist.
