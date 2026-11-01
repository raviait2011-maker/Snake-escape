# Snake Escape: Android + iOS with AdMob (no Mac, general audience)

Stack: existing HTML game wrapped with **Capacitor 8** + **@capacitor-community/admob**. Android built locally (any OS). iOS built in the cloud (Codemagic), tested via TestFlight.

## What is already done in this project
| Area | Status |
|---|---|
| Capacitor project, `setup.sh`, `configure-native.js` | Done, tested: platforms generate and the config script is idempotent |
| Consent (UMP) -> iOS ATT prompt -> AdMob init, general-audience flags (not child-directed, max content rating General) | Done |
| Banner on the **level map only**, with reserved space so it never covers buttons | Done |
| Interstitial before "Next" every 3rd cleared level, not before level 4, min 90 s apart, never mid-puzzle | Done |
| Rewarded "Watch ad: +1 heart" on the out-of-hearts popup, once per level | Done |
| Failed/missing ads never block the game | Done |
| "Privacy settings" button (shown only when the consent SDK requires it) | Done |
| iOS haptics (native plugin), Android Back button (level -> map -> home -> exit), status bar, portrait lock | Done |
| Logic tested against a simulated native environment with a fake AdMob plugin | Done. **Not yet run on a real phone** |

Tunables are in `ads.config.json` (frequency, min seconds, content rating, test mode).

## Ad content safety (no vulgar ads)
No ad network can promise zero inappropriate ads, but you can make them very unlikely. Do all four:
1. **Already in code:** max ad content rating = `General` (`ads.config.json` -> `maxAdContentRating`), not child-directed. Ads served are at or below that rating.
2. **AdMob > Apps > Snake Escape > Blocking controls** (do this per app, after you add it):
   - *Ad content rating*: set the maximum to **G** (or PG at most).
   - *Sensitive categories*: block at least **References to sex and sexuality**, **Dating**, **Gambling and betting**, **Alcohol**, **Weight loss**, **Politics**, **Religion**, and any other you dislike.
   - *General categories*: block e.g. dating, adult-adjacent and gambling-related categories you do not want.
   - Keep **ad filtering turned ON** (turning it off also turns off these controls).
3. **Ad review center** (account-level): after launch, review ads that have appeared and press **Block ad** on anything unsuitable. Do this weekly for the first month. Blocked creatives are blocked across your whole account.
4. **Report and respond:** if a user or you see a bad ad, note the advertiser/ad and block it in the Ad review center; use AdMob's ad reporting to flag it to Google.
Do not use third-party mediation networks yet; each extra network adds content you do not control.

## Android-first quick path
1. `npm run setup` -> `npm run android`, test with TEST ads on a real phone.
2. Create AdMob app + 3 ad units (banner, interstitial, rewarded); set blocking controls (above).
3. Put real IDs in `ads.config.json`, set `"testMode": false`, `npm run configure`.
4. `keytool -genkey -v -keystore snake-escape-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload` in the project root; copy `android/keystore.properties.example` to `android/keystore.properties` and fill it in (both git-ignored). **Back up the keystore and passwords.**
5. Bump `versionCode`/`versionName` in `android/app/build.gradle`, then `npm run aab:release` -> `android/app/build/outputs/bundle/release/app-release.aab`.
6. Play Console: create app -> Internal testing -> upload AAB -> store listing, Data safety, Ads = Yes, content rating, target audience -> closed/production as Play requires.
7. Before the first public release, install the release build from Internal testing and confirm real ads load (not test ads) and nothing inappropriate appears.

## 1. Decisions / accounts (do first, some take days)
1. **App ID** (set: `com.rdinfotechservice.snakeescape`): set in `capacitor.config.json` and `codemagic.yaml`. Permanent.
2. **Google Play Console** account (one-time fee) and **Apple Developer Program** (yearly fee). Verify current prices; Apple approval can take days. Both can be done from a browser/phone.
3. **AdMob account** (free). Add two apps (Android, iOS) and create 3 ad units per app: banner, interstitial, rewarded. Add payment info and tax details.
4. **Privacy policy URL** (static page). Must mention: ads via Google AdMob, advertising ID use, that data is shared with ad partners, how to contact you, and local-only game progress.
5. Optional but recommended: a small website to host `app-ads.txt` (AdMob will show you the line). It protects ad revenue from spoofing.

## 2. Build + test with TEST ads (Day 1-2)
1. `npm run setup`, then `npm run android` and run on a real phone. Expect Google test ads labelled "Test Ad".
2. Check: banner appears only on the map and the grid is not covered; interstitial after the 3rd cleared level from level 4 onward; revive button appears on "Out of hearts"; Back button flow; no ads when offline and the game still works.
3. Test consent: use a VPN or the plugin's `debugGeography` option to see the EEA form; test "Privacy settings".
4. **Never click your own live ads.** Keep `testMode: true` until the release build.

## 3. Go live with real ads
1. In `ads.config.json` replace `appId`, `banner`, `interstitial`, `rewarded` for both platforms with your AdMob IDs and set `"testMode": false`.
2. `npm run configure` (or `npm run sync`), rebuild.
3. New AdMob ad units can take a while to start filling. Low fill in the first days is normal.
4. After the app is live on a store, link it to the AdMob app entry (AdMob > App settings).
5. Add Google's full SKAdNetwork ID list to `Info.plist` (the script adds Google's own; the rest are in Google's iOS guide).
6. Optional: AdMob GDPR / US-states message must be created and published in AdMob > Privacy & messaging, or the consent form will not appear.

## 4. Android release (Windows/Linux/macOS)
1. Create an upload keystore (`keytool -genkey -v -keystore snake-escape-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`) and **back it up** with its passwords. Never commit it.
2. Configure signing in `android/app/build.gradle` via a git-ignored `keystore.properties`; bump `versionCode`.
3. `npm run aab:release` -> `.aab` for Play.
4. Play Console: Internal testing -> store listing -> **Data safety** (declare: advertising ID collected/shared for advertising, plus whatever AdMob requires) -> **Ads declaration = Yes** -> content rating -> **Target audience**.
5. Target audience: choose age groups honestly. Selecting under-13 brings Families policy limits on ads. Your plan is general audience; if the game obviously appeals to children, Google may treat it that way, so pick deliberately.
6. New personal developer accounts have historically needed a closed test with a minimum number of testers for about 14 days before production. Check current rules.
7. Check the current required target API level.

## 5. iOS release without a Mac
1. Join the Apple Developer Program. Create the app in **App Store Connect** (same bundle ID). Note its numeric Apple ID.
2. In App Store Connect > Users and Access > Integrations, create an **App Store Connect API key**.
3. Push the project (including `android/` and `ios/`, excluding `node_modules`) to GitHub/GitLab/Bitbucket.
4. In **Codemagic**: add the repo, add the API key as an integration (name it `CODEMAGIC_ASC_KEY`), let it manage signing (certificate + profile). Fill `bundle_identifier` and `APP_STORE_APPLE_ID` in `codemagic.yaml`.
5. Run the `ios-testflight` workflow. The IPA goes to TestFlight automatically.
6. Test on a real iPhone via TestFlight (yours or a friend's). Check the ATT prompt, consent form, banner, interstitial, rewarded, haptics.
7. App Store Connect: screenshots (required iPhone sizes), description, age rating, **privacy nutrition labels** (declare advertising data / identifiers used for tracking), privacy policy URL, then submit for review.
8. If `ios/App` contains `App.xcworkspace` instead of `App.xcodeproj`, change `--project` to `--workspace` in `codemagic.yaml`.

## 6. Store assets checklist
Icon 1024x1024 (no transparency for iOS) and splash 2732x2732 in `resources/`, then `npx capacitor-assets generate`; Android feature graphic 1024x500; 4-8 screenshots; short + full description; support email; privacy policy URL.

## 7. Risks and things to verify
- **Untested on real devices.** The plugin is accessed through `Capacitor.Plugins.AdMob` (no bundler). If a device shows no ads and logs say the plugin is undefined, tell me and I will switch to a small bundled build.
- Plugin API verified against the README of `@capacitor-community/admob` v8.2.0. Google's sample ad unit IDs in `ads.config.json` should be re-checked against the plugin's Testing page.
- Store rules (Data safety, ATT, target API, closed-testing requirement, fees) change often. Re-check before submitting.
- Apple may reject if ATT text or privacy labels do not match actual behaviour.
- Revenue from a small puzzle game is usually low at first; do not over-monetise (the current frequency is deliberately gentle).

## 8. Timeline (realistic)
Setup + test ads on phone: 1-2 days · AdMob + store accounts: 1-7 days (parallel) · Android internal test -> production: 2-4 days (+ closed-test wait if required) · iOS TestFlight -> review: 3-7 days. **Total about 2-3 weeks.**
