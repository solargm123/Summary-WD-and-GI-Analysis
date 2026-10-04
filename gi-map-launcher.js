(function(){
'use strict';
let frame=null,previous=null,request=0,opening=false;
const restoreKey='gi-map-open:'+ (new URLSearchParams(location.search).get('project')||location.pathname);
function remember(value){try{if(value)sessionStorage.setItem(restoreKey,'1');else sessionStorage.removeItem(restoreKey)}catch{}}
function back(){request++;opening=false;remember(false);document.getElementById('giMapV4Overlay')?.remove();frame=null;previous?.focus();document.body.style.overflow=previous?.dataset.giPreviousOverflow||''}
async function open(button){
 if(frame||opening)return;opening=true;remember(true);previous=button;previous.dataset.giPreviousOverflow=document.body.style.overflow;const token=++request;
 const overlay=document.createElement('div');overlay.id='giMapV4Overlay';overlay.style.cssText='position:fixed;inset:0;z-index:20000;background:#0f172ae8;color:#f8fafc;backdrop-filter:blur(5px);font-family:Bai Jamjuree,sans-serif;display:grid;place-items:center';overlay.style.zoom=String(1/(parseFloat(getComputedStyle(document.body).zoom)||1));
 const loading=document.createElement('button');loading.type='button';loading.className='btn btn-secondary';loading.style.cssText='position:relative;z-index:2;display:grid;gap:8px;text-align:center;padding:24px;border:0;background:transparent;color:#f8fafc;font:inherit;cursor:pointer';loading.innerHTML='<i class="fa-solid fa-spinner fa-spin" style="font-size:26px;color:#38bdf8"></i><b>กำลังเตรียมแผนที่...</b><span style="font-size:12px;color:#94a3b8">Loading GI map data</span><small>กลับ / Back</small>';loading.onclick=back;overlay.append(loading);document.body.append(overlay);document.body.style.overflow='hidden';
 try{const payload=await GIMapData.load();if(token!==request)return;
 frame=document.createElement('iframe');frame.title='Global Irradiance Map overview';frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;visibility:hidden';frame.src='gi-map-v4.html?v=20261004-map-reference-focus1';
 frame.addEventListener('load',()=>{if(frame)loading.querySelector('b').textContent='กำลังแสดงข้อมูลแผนที่…'},{once:true});frame.giPayload=payload;overlay.append(frame);
 }catch(e){loading.textContent='เปิดแผนที่ไม่สำเร็จ / Map unavailable: '+e.message+' · กลับ / Back'}finally{if(token===request)opening=false}
}
addEventListener('message',e=>{if(!frame||e.source!==frame.contentWindow||e.origin!==location.origin)return;if(e.data?.type==='gi-map-ready')frame.contentWindow.postMessage({type:'gi-map-data',payload:frame.giPayload},location.origin);else if(e.data?.type==='gi-map-loaded'){frame.style.visibility='visible';document.querySelector('#giMapV4Overlay > button')?.remove();}else if(e.data?.type==='gi-map-back')back();else if(e.data?.type==='gi-map-save-locations'){const current=frame,id=e.data.requestId;GIMapData.save(e.data.projectId,e.data.points,e.data.expected).then(payload=>{if(frame===current)frame.contentWindow.postMessage({type:'gi-map-location-result',requestId:id,payload},location.origin)}).catch(error=>{if(frame===current)frame.contentWindow.postMessage({type:'gi-map-location-result',requestId:id,error:error.message},location.origin)})}});
window.GIMapLauncher={open,back};
function restore(){let active=false;try{active=sessionStorage.getItem(restoreKey)==='1'}catch{}if(active){const launch=()=>{const button=document.querySelector('[onclick*="GIMapLauncher.open"]')||document.createElement('button');open(button)};if(document.getElementById('solarPageLoading')){const observer=new MutationObserver(()=>{if(!document.getElementById('solarPageLoading')){observer.disconnect();launch()}});observer.observe(document.body,{childList:true});addEventListener('pagehide',()=>observer.disconnect(),{once:true});}else launch()}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});else restore();
})();

