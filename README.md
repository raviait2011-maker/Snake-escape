# Snake Escape (Capacitor + AdMob)

Quick start (Windows/Linux/macOS, Node 20+):
1. Edit `appId` in `capacitor.config.json` (permanent once published) and the same ID in `codemagic.yaml`.
2. `npm run setup`   -> installs plugins, creates `android/` and `ios/`, applies ads config.
3. `npm run android` -> opens Android Studio; run on a device. You should see Google TEST ads.
4. Edit `www/` or `ads.config.json`, then `npm run sync`.

Ads are in test mode (`ads.config.json` -> `"testMode": true`, Google sample IDs). See DEPLOYMENT_PLAN.md to go live.

Files: `www/index.html` (game) · `www/ads.js` (consent, banner, interstitial, rewarded) · `www/native.js` (haptics, Back button, status bar) · `scripts/configure-native.js` · `codemagic.yaml` (iOS cloud build).
