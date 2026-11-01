#!/usr/bin/env node
/* Applies ads.config.json to the web assets and to the native projects (idempotent; safe to re-run).
   - writes www/ads.config.js  (ad unit IDs used by the game)
   - Android: AdMob app ID meta-data, strings.xml, portrait lock, release signing (keystore.properties)
   - iOS: GADApplicationIdentifier, SKAdNetwork, ATT text, portrait lock (iPhone)            */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'ads.config.json'), 'utf8'));
const log = m => console.log('•', m);
const rd = p => fs.readFileSync(p, 'utf8'), wr = (p, s) => fs.writeFileSync(p, s);

// ---- web
const pub = { ...cfg }; delete pub._readme;
wr(path.join(root, 'www', 'ads.config.js'), 'window.ADS_CONFIG=' + JSON.stringify(pub) + ';\n');
log('wrote www/ads.config.js (testMode=' + cfg.testMode + ')');

// ---- Android
const man = path.join(root, 'android/app/src/main/AndroidManifest.xml');
if (fs.existsSync(man)) {
  let s = rd(man);
  if (!s.includes('com.google.android.gms.ads.APPLICATION_ID'))
    s = s.replace('</application>', '    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />\n    </application>');
  if (!/screenOrientation/.test(s)) s = s.replace('<activity', '<activity\n            android:screenOrientation="portrait"');
  wr(man, s);
  const sx = path.join(root, 'android/app/src/main/res/values/strings.xml');
  let x = rd(sx);
  if (/name="admob_app_id"/.test(x)) x = x.replace(/(<string name="admob_app_id">)[^<]*(<\/string>)/, '$1' + cfg.android.appId + '$2');
  else x = x.replace('</resources>', '    <string name="admob_app_id">' + cfg.android.appId + '</string>\n</resources>');
  wr(sx, x);
  log('Android configured');
} else log('android/ not found, skipped (run npm run setup first)');

// ---- Android release signing (reads android/keystore.properties; skipped silently if the file is absent, so debug builds still work)
const gr = path.join(root, 'android/app/build.gradle');
if (fs.existsSync(gr)) {
  let g = rd(gr);
  if (!g.includes('keystoreProps')) {
    g = g.replace('android {', "def keystorePropsFile = rootProject.file('keystore.properties')\ndef keystoreProps = new Properties()\nif (keystorePropsFile.exists()) { keystoreProps.load(new FileInputStream(keystorePropsFile)) }\n\nandroid {");
    g = g.replace('    buildTypes {', "    signingConfigs {\n        release {\n            if (keystorePropsFile.exists()) {\n                storeFile file(keystoreProps['storeFile'])\n                storePassword keystoreProps['storePassword']\n                keyAlias keystoreProps['keyAlias']\n                keyPassword keystoreProps['keyPassword']\n            }\n        }\n    }\n    buildTypes {");
    g = g.replace('        release {\n            minifyEnabled false', "        release {\n            if (keystorePropsFile.exists()) { signingConfig signingConfigs.release }\n            minifyEnabled false");
    wr(gr, g);
    log('Android release signing wired (create android/keystore.properties)');
  }
  const ex = path.join(root, 'android/keystore.properties.example');
  if (!fs.existsSync(ex)) wr(ex, 'storeFile=../snake-escape-upload.jks\nstorePassword=CHANGE_ME\nkeyAlias=upload\nkeyPassword=CHANGE_ME\n');
}

// ---- iOS
const plist = path.join(root, 'ios/App/App/Info.plist');
if (fs.existsSync(plist)) {
  let s = rd(plist);
  const put = (key, xml) => { if (!s.includes('<key>' + key + '</key>')) s = s.replace(/<\/dict>\s*<\/plist>\s*$/, '\t<key>' + key + '</key>\n\t' + xml + '\n</dict>\n</plist>\n'); };
  const set = (key, xml) => { const re = new RegExp('(<key>' + key + '</key>\\s*)<string>[^<]*</string>'); if (re.test(s)) s = s.replace(re, '$1<string>' + xml + '</string>'); else put(key, '<string>' + xml + '</string>'); };
  set('GADApplicationIdentifier', cfg.ios.appId);
  set('NSUserTrackingUsageDescription', cfg.trackingMessage);
  put('GADIsAdManagerApp', '<true/>');
  put('SKAdNetworkItems', '<array>\n\t\t<dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict>\n\t</array>');
  // iPhone portrait only (iPad keys are left alone: Apple expects iPad to support all orientations)
  s = s.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*)<array>[\s\S]*?<\/array>/, '$1<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>');
  wr(plist, s);
  log('iOS configured (add the full SKAdNetwork ID list from Google before release)');
} else log('ios/ not found, skipped');
