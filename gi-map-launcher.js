(function(){
'use strict';
let frame=null,previous=null,request=0;
function back(){request++;document.getElementById('giMapV4Overlay')?.remove();frame=null;previous?.focus();document.body.style.overflow=previous?.dataset.giPreviousOverflow||''}
async function open(button){
 if(frame)return;previous=button;previous.dataset.giPreviousOverflow=document.body.style.overflow;const token=++request;
 const overlay=document.createElement('div');overlay.id='giMapV4Overlay';overlay.style.cssText='position:fixed;inset:0;z-index:20000;background:#eef2f4;display:grid;place-items:center';overlay.style.zoom=String(1/(parseFloat(getComputedStyle(document.body).zoom)||1));
 const loading=document.createElement('button');loading.type='button';loading.className='btn btn-secondary';loading.textContent='กำลังเปิดแผนที่… / Loading map… · กลับ / Back';loading.onclick=back;overlay.append(loading);document.body.append(overlay);document.body.style.overflow='hidden';
 try{const payload=await GIMapData.load();if(token!==request)return;
 frame=document.createElement('iframe');frame.title='Global Irradiance Map overview';frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0';frame.src='gi-map-v4.html?v=20261002-map-hover1';
 frame.addEventListener('load',()=>{if(frame)loading.remove()},{once:true});frame.giPayload=payload;overlay.append(frame);
 }catch(e){loading.textContent='เปิดแผนที่ไม่สำเร็จ / Map unavailable: '+e.message+' · กลับ / Back'}
}
addEventListener('message',e=>{if(!frame||e.source!==frame.contentWindow||e.origin!==location.origin)return;if(e.data?.type==='gi-map-ready')frame.contentWindow.postMessage({type:'gi-map-data',payload:frame.giPayload},location.origin);else if(e.data?.type==='gi-map-back')back();else if(e.data?.type==='gi-map-save-locations'){const current=frame,id=e.data.requestId;GIMapData.save(e.data.projectId,e.data.points,e.data.expected).then(payload=>{if(frame===current)frame.contentWindow.postMessage({type:'gi-map-location-result',requestId:id,payload},location.origin)}).catch(error=>{if(frame===current)frame.contentWindow.postMessage({type:'gi-map-location-result',requestId:id,error:error.message},location.origin)})}});
window.GIMapLauncher={open,back};
})();
