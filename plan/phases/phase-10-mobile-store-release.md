# Phase 10: Mobile Store Release (App Store and Google Play)

**Target:** Jan 2027 onward | **Contest critical:** no | **Gate:** G5 | **Milestone:** `P10 Stores`
**Depends on:** P8 (full campaign), recommended P9 (builder) later.

**Goal:** Sneakaboo on iOS and Android with offline play, native feel, and a monetization setup that complies with store and kids policies.

**Read first:** `docs/13-mobile-store-roadmap.md`, `docs/12-economy-and-meta.md`, Base44's store doc https://docs.base44.com/documentation/building-your-app/uploading-to-app-stores.md

---

## P10.1 Route decision
Acceptance: route A or B chosen and recorded as a decision.
- [ ] P10.1.1 Evaluate **Route A** (Base44 web-view wrapper: needs Builder plan or higher, no IAP, content updates ship via publish) against **Route B** (Capacitor native shell).
- [ ] P10.1.2 Prototype both: build a wrapper, run L1 on a real iPhone and Android, measure FPS and load.
- [ ] P10.1.3 Check Apple guideline 4.2 risk (minimum functionality) for Route A.
- [ ] P10.1.4 Decide monetization needs (ads/IAP) because Route A can't do IAP.
- [ ] P10.1.5 Record decision D-013 in `plan/08`.

## P10.2 Native wrapper
- [ ] P10.2.1 Project setup (Route B: Capacitor; Route A: Base44 generated files).
- [ ] P10.2.2 Landscape lock in native config; safe-area handling.
- [ ] P10.2.3 Bundle assets for offline play; service worker or local files.
- [ ] P10.2.4 App icon, splash screen, app name, bundle ids.
- [ ] P10.2.5 Back button, background pause, audio interruptions.
- [ ] P10.2.6 Build pipeline (macOS or cloud build for iOS; Gradle for Android).

## P10.3 Mobile adaptations
- [ ] P10.3.1 Native haptics.
- [ ] P10.3.2 Performance targets on low-end devices; quality auto-selection.
- [ ] P10.3.3 Save data robustness (app updates, storage clearing).
- [ ] P10.3.4 Cloud save with optional sign-in (`base44 auth`) while keeping guest play.
- [ ] P10.3.5 Optional push notifications (daily challenge) with opt-in.
- [ ] P10.3.6 Accessibility labels (VoiceOver, TalkBack).

## P10.4 Monetization and compliance
- [ ] P10.4.1 Choose model (premium, rewarded ads, cosmetics IAP). Recommended: free, opt-in rewarded ads, cosmetic IAP, one-time ad removal. See `docs/12`.
- [ ] P10.4.2 Kids policy review: Apple Kids Category and Google Families Policy; ad SDK restrictions.
- [ ] P10.4.3 Integrate ad and IAP plugins (Route B).
- [ ] P10.4.4 Privacy policy, terms, data safety and App Privacy forms.
- [ ] P10.4.5 Age rating questionnaires.
- [ ] P10.4.6 Trademark and store name search for "Sneakaboo" (D-000).

## P10.5 Store assets and listings
- [ ] P10.5.1 Icon (1024x1024), feature graphic (1024x500), landscape screenshots for phone and tablet.
- [ ] P10.5.2 Trailer (15-30 s) and preview video.
- [ ] P10.5.3 Titles, subtitle, descriptions, keywords, categories.
- [ ] P10.5.4 Localization for first languages (EN, ES, PT-BR, FR, DE).
- [ ] P10.5.5 Support URL and website/landing page.

## P10.6 Test tracks
- [ ] P10.6.1 Apple developer account and App Store Connect setup; TestFlight build.
- [ ] P10.6.2 Google Play Console, internal testing, and closed testing if required for new accounts.
- [ ] P10.6.3 Tester feedback round (20+ devices).
- [ ] P10.6.4 Crash reporting and fixes.

## P10.7 Soft launch and launch
- [ ] P10.7.1 Soft launch in 2-3 small markets; track D1/D7 retention and level fail rates.
- [ ] P10.7.2 Tune difficulty and ads.
- [ ] P10.7.3 Submit for review, handle rejections.
- [ ] P10.7.4 Global launch, press and community push.
- [ ] P10.7.5 Day-1 monitoring and hotfix plan.

---

## G5 checklist
- [ ] Both store builds approved or ready for submission.
- [ ] Privacy and policy forms complete.
- [ ] No crashers in 3 days of testing.
