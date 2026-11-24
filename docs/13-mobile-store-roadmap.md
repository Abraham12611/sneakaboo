# 13 Mobile Store Roadmap (App Store and Google Play)

Start after the contest (results Dec 10, 2026). Do not let this slow the contest build.

## Two possible routes
| Route | How | Pros | Cons |
|-------|-----|------|------|
| **A. Base44 store wrapper** | Base44's app-store flow wraps the published app in a native web view and generates the store files. Source: https://docs.base44.com/documentation/building-your-app/uploading-to-app-stores.md | Fastest. Content updates ship without a new store release. | Needs Base44 **Builder plan or higher** to download submission files. **No In-App Purchase or Play Billing support yet.** Web view performance. Apple may reject thin web wrappers (guideline 4.2, minimum functionality). |
| **B. Native wrapper with Capacitor** | Export the web build (HTML/JS/assets) and wrap with Capacitor. | Real native shell, offline play, haptics, IAP plugins, ads plugins, better performance control. | Needs a Mac for iOS builds (or a cloud build service), more setup. Requires access to the game source outside Base44. |

**Recommendation:** ship **A** first only if the game feels solid in a web view and has no IAP. Move to **B** for monetization, offline, and the level builder with accounts.

Because both routes need the code, **keep the engine free of Base44-specific APIs** (storage and share through thin adapters).

## Store readiness checklist
**Product**
- [ ] Works fully offline (bundle assets, no network calls needed for campaign).
- [ ] Landscape only locked natively (Info.plist `UISupportedInterfaceOrientations` landscape only. Android `screenOrientation="sensorLandscape"`).
- [ ] Safe-area insets (notch, rounded corners, home indicator).
- [ ] 60 FPS on iPhone 11 and a mid Android (Snapdragon 6-series).
- [ ] Save data survives updates. Add cloud save later with sign-in.
- [ ] Audio interruptions handled (calls, background).
- [ ] Pause on app background.

**Legal and policy**
- [ ] Privacy policy URL and terms page.
- [ ] Age rating questionnaires (expect 4+ / Everyone, cartoon mild fantasy, no violence).
- [ ] If the app targets kids: Apple Kids Category and Google Families Policy rules (no behavioral ads, restricted SDKs). Decide the audience before choosing ads.
- [ ] Data safety form (Google) and App Privacy labels (Apple): "no data collected" for a local-only build.
- [ ] Trademark check on the name (doc 01).
- [ ] Asset license log (art, audio, fonts).

**Accounts and cost (verify current prices before budgeting)**
- Apple Developer Program: annual fee.
- Google Play Console: one-time registration fee. New personal accounts may need closed testing with a minimum number of testers for a set period before production. Check current policy at release.

**Store listing**
- Icon (1024x1024), feature graphic (Google 1024x500), screenshots in landscape (phone and tablet), 15 to 30 s preview video.
- Title, subtitle, short and long descriptions, keywords. Localize: EN first, then ES, PT-BR, FR, DE, JP later.
- Key art: see mockup 16.

## Phased plan
| Phase | When | Goal |
|-------|------|------|
| 0 | Now - Dec 3 | Web contest build |
| 1 | Dec 4 - Dec 20 | Fix feedback from contest, balance, polish; add levels 21-30 |
| 2 | Dec - Jan | Capacitor wrapper, TestFlight and Play internal testing, haptics, offline |
| 3 | Jan - Feb | Soft launch in 2 to 3 small markets, collect analytics, tune difficulty |
| 4 | Feb - Mar | Global launch, level builder v1 with short codes |
| 5 | After | Daily challenge, community gallery, seasonal houses, cosmetics IAP |

## Mobile-specific design changes
- Bigger touch targets, left-handed layout option.
- Battery: cap at 60 FPS, 30 FPS option.
- Haptics through the native plugin.
- Rewarded video placement (if ads): after a Found You! (extra 10 s), before a level (starting potion). Never interrupt mid-level.
- Notifications (opt-in): daily challenge reminder.
- Accessibility: VoiceOver / TalkBack labels on menus.

## Analytics (post-contest, mobile)
Funnel: install, tutorial complete, L5, L10, L20. Level fail rates, average attempts per level, retention D1/D7/D30, ad opt-in rate. Use a privacy-friendly SDK and respect kids policy.
