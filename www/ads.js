/* Snake Escape ads layer (AdMob via @capacitor-community/admob).
   Pure no-op in a normal browser. Never blocks gameplay: every call is wrapped so a missing/failed ad just continues the game. */
(function(){
  const C=window.Capacitor, native=!!(C&&C.isNativePlatform&&C.isNativePlatform());
  const CFG=window.ADS_CONFIG;
  const noop=()=>{};
  if(!native||!CFG){window.Ads={gate:f=>f(),rewardedReady:()=>false,showRewarded:cb=>cb(false)};return}

  const AdMob=C.Plugins.AdMob, plat=C.getPlatform(), ID=CFG[plat]||CFG.android, test=!!CFG.testMode;
  let ready=false, interReady=false, rewReady=false, lastInter=0, cleared=0, bannerOn=false, earned=false, rewCb=null;
  const safe=async f=>{try{return await f()}catch(e){console.warn('[ads]',e&&e.message||e)}};
  const ev=(n,f)=>safe(()=>AdMob.addListener(n,f));

  /* --- loaders (retry with delay on failure) --- */
  const loadInter=()=>{interReady=false;safe(()=>AdMob.prepareInterstitial({adId:ID.interstitial,isTesting:test}))};
  const loadRew=()=>{rewReady=false;safe(()=>AdMob.prepareRewardVideoAd({adId:ID.rewarded,isTesting:test}))};

  async function init(){
    // 1) consent (UMP). Required in EEA/UK and some US states.
    let ci=await safe(()=>AdMob.requestConsentInfo());
    if(ci&&ci.isConsentFormAvailable&&ci.status==='REQUIRED')ci=await safe(()=>AdMob.showConsentForm())||ci;
    if(ci&&ci.canRequestAds===false)return;
    // "Privacy settings" entry point (required by UMP when the user can change their choice)
    if(ci&&ci.privacyOptionsRequirementStatus==='REQUIRED'){
      const b=document.getElementById('privacyBtn');
      if(b){b.style.display='';b.onclick=()=>safe(()=>AdMob.showPrivacyOptionsForm())}
    }
    // 2) iOS App Tracking Transparency prompt
    if(plat==='ios'){const t=await safe(()=>AdMob.trackingAuthorizationStatus());
      if(t&&t.status==='notDetermined')await safe(()=>AdMob.requestTrackingAuthorization())}
    // 3) SDK init, general-audience settings (NOT child-directed)
    await safe(()=>AdMob.initialize({tagForChildDirectedTreatment:false,tagForUnderAgeOfConsent:false,maxAdContentRating:CFG.maxAdContentRating||'General'}));
    ready=true;
    // events
    ev('interstitialAdLoaded',()=>{interReady=true});
    ev('interstitialAdFailedToLoad',()=>{interReady=false;setTimeout(loadInter,30000)});
    ev('interstitialAdDismissed',()=>{lastInter=Date.now();loadInter();const f=gateCb;gateCb=null;f&&f()});
    ev('interstitialAdFailedToShow',()=>{loadInter();const f=gateCb;gateCb=null;f&&f()});
    ev('onRewardedVideoAdLoaded',()=>{rewReady=true});
    ev('onRewardedVideoAdFailedToLoad',()=>{rewReady=false;setTimeout(loadRew,30000)});
    ev('onRewardedVideoAdReward',()=>{earned=true});
    ev('onRewardedVideoAdDismissed',()=>{const cb=rewCb,ok=earned;rewCb=null;earned=false;loadRew();cb&&cb(ok)});
    ev('onRewardedVideoAdFailedToShow',()=>{const cb=rewCb;rewCb=null;earned=false;loadRew();cb&&cb(false)});
    // banner: reserve space so it never covers the level grid
    ev('bannerAdSizeChanged',s=>document.documentElement.style.setProperty('--ad-h',((s&&s.height)||0)+'px'));
    ev('bannerAdFailedToLoad',()=>document.documentElement.style.setProperty('--ad-h','0px'));
    loadInter();loadRew();
    onScreen(currentScreen());
  }

  /* --- banner only on the level map --- */
  const currentScreen=()=>['home','map','game'].find(s=>document.getElementById(s).classList.contains('on'));
  async function onScreen(id){
    if(!ready)return;
    if(id==='map'&&!bannerOn){bannerOn=true;
      await safe(()=>AdMob.showBanner({adId:ID.banner,adSize:'ADAPTIVE_BANNER',position:'BOTTOM_CENTER',margin:0,isTesting:test}))}
    else if(id!=='map'&&bannerOn){bannerOn=false;
      document.documentElement.style.setProperty('--ad-h','0px');await safe(()=>AdMob.removeBanner())}
  }
  const origShow=window.show;
  window.show=function(id){origShow(id);onScreen(id)};

  /* --- interstitial at natural breaks (before starting the next level) --- */
  let gateCb=null;
  function gate(next){
    cleared++;
    const lvl=(typeof G!=='undefined'&&G&&G.lv)||0; // G is a top-level let, not a window property
    const due=ready&&interReady&&lvl>=CFG.noAdsBeforeLevel&&cleared%CFG.interstitialEveryNLevels===0
              &&(Date.now()-lastInter)/1000>=CFG.interstitialMinSeconds;
    if(!due)return next();
    gateCb=next;
    safe(()=>AdMob.showInterstitial()); // game continues from the Dismissed / FailedToShow listeners
    setTimeout(()=>{if(gateCb===next){gateCb=null;next()}},60000); // safety net
  }

  /* --- rewarded: opt-in only --- */
  function showRewarded(cb){
    if(!ready||!rewReady)return cb(false);
    rewCb=cb;earned=false;
    safe(()=>AdMob.showRewardVideoAd()).then(()=>{});
  }

  window.Ads={gate,showRewarded,rewardedReady:()=>ready&&rewReady};
  // start after first paint so the UI is never blocked
  setTimeout(init,400);
})();
