/* Native niceties. No-op in a browser. */
(function(){
  const C=window.Capacitor;
  if(!(C&&C.isNativePlatform&&C.isNativePlatform()))return;
  const P=C.Plugins, safe=f=>{try{const r=f();r&&r.catch&&r.catch(()=>{})}catch(e){}};

  // Haptics: navigator.vibrate does not exist on iOS, so use the native plugin.
  if(P.Haptics){
    window.vib=p=>{ if(Array.isArray(p))safe(()=>P.Haptics.notification({type:'ERROR'}));
                    else safe(()=>P.Haptics.impact({style:'LIGHT'})) };
  }

  // Android Back button: level -> map -> home -> exit
  if(P.App&&P.App.addListener){
    P.App.addListener('backButton',()=>{
      const pop=document.getElementById('pop');
      if(pop&&pop.classList.contains('on'))return;                 // finish the popup first
      const on=['home','map','game'].find(s=>document.getElementById(s).classList.contains('on'));
      if(on==='game'){buildMap(curW);show('map')}
      else if(on==='map')show('home');
      else P.App.exitApp();
    });
  }

  // Status bar text colour follows the light/dark theme
  const sb=P.StatusBar;
  if(sb){const apply=()=>safe(()=>sb.setStyle({style:isDark?'DARK':'LIGHT'}));
    const og=window.applyTheme;window.applyTheme=function(l){og(l);apply()};apply()}
})();
