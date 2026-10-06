(function(){
'use strict';
const base=new URL('./',document.baseURI),center='solar-center.html';
if(window.top!==window.self){location.replace(new URL(center+location.search+location.hash,base).href);return;}
const key='solar-shell-route-v1',allowed=new Set([center,'working-day-analysis.html','global-irradiance-analysis.html','pr-report.html','pr-report-r4.html','solar-spare-parts.html','inverter-analysis.html','inverter-analysis-compact-test.html','inverter-report.html','OM_Alarm_Log_V4_7_ClosureWorkflow_TrackingUX.html']);
function safeRoute(value){try{const u=new URL(value,base),raw=u.pathname.split('/').pop(),file=raw.endsWith('.html')?raw:raw+'.html';if(u.origin!==base.origin||!allowed.has(file))return null;return file+u.search+u.hash;}catch{return null;}}
let saved=null;try{saved=safeRoute(sessionStorage.getItem(key));}catch{}
const frame=document.getElementById('solarWorkspaceFrame');
const initial=location.hash?center+location.search+location.hash:saved||center;
const entry=new URL(initial,base);if(entry.pathname.endsWith('inverter-analysis-compact-test.html'))entry.pathname=entry.pathname.replace('inverter-analysis-compact-test.html','inverter-report.html');if(entry.pathname.endsWith('inverter-analysis-compact-test.html'))entry.searchParams.set('v','20261006-inverter-boot7');frame.src=entry.href;
history.replaceState({solarShell:true},'',base.pathname);
function sync(){try{const u=new URL(frame.contentWindow.location.href);if(u.origin!==base.origin)return;let route=safeRoute(u.href);if(!route&&['','index.html'].includes(u.pathname.split('/').pop()))route=center;if(route){sessionStorage.setItem(key,route);document.title=frame.contentDocument.title||'Solar system Analysis Center';}if(frame.contentWindow.SolarCloud)frame.contentWindow.SolarCloud.CONFIG.siteRoot=new URL(center,base).href;}catch{}}
frame.addEventListener('load',sync);
window.addEventListener('pagehide',sync);
})();

