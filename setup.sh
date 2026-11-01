#!/usr/bin/env bash
# One-time setup. Needs Node 20+. Works on Windows (Git Bash), Linux, macOS.
set -e
npm install @capacitor/core @capacitor/app @capacitor/haptics @capacitor/status-bar @capacitor/splash-screen @capacitor-community/admob
npm install -D @capacitor/cli @capacitor/assets
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios            # creates the iOS project (building it needs macOS or a cloud Mac)
node scripts/configure-native.js
npx cap sync
echo "Done. Next: npm run android   (Android Studio)"
