(function(){
'use strict';
const regionLists={
เหนือ:'เชียงใหม่ เชียงราย ลำพูน ลำปาง แม่ฮ่องสอน น่าน พะเยา แพร่ อุตรดิตถ์',
อีสาน:'กาฬสินธุ์ ขอนแก่น ชัยภูมิ นครพนม นครราชสีมา บึงกาฬ บุรีรัมย์ มหาสารคาม มุกดาหาร ยโสธร ร้อยเอ็ด เลย ศรีสะเกษ สกลนคร สุรินทร์ หนองคาย หนองบัวลำภู อำนาจเจริญ อุดรธานี อุบลราชธานี',
กลาง:'กรุงเทพมหานคร กรุงเทพ อยุธยา พระนครศรีอยุธยา อ่างทอง ลพบุรี สิงห์บุรี ชัยนาท สระบุรี นครนายก นครปฐม นนทบุรี ปทุมธานี สมุทรปราการ สมุทรสาคร สมุทรสงคราม สุพรรณบุรี นครสวรรค์ อุทัยธานี กำแพงเพชร พิจิตร พิษณุโลก เพชรบูรณ์ สุโขทัย',
ตะวันออก:'ฉะเชิงเทรา ชลบุรี ระยอง จันทบุรี ตราด ปราจีนบุรี สระแก้ว',
ตะวันตก:'ตาก กาญจนบุรี ราชบุรี เพชรบุรี ประจวบคีรีขันธ์',
ใต้:'ชุมพร ระนอง สุราษฎร์ธานี พังงา ภูเก็ต กระบี่ นครศรีธรรมราช ตรัง พัทลุง สงขลา สตูล ปัตตานี ยะลา นราธิวาส'
};
const median=a=>{a=[...a].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2};
const value=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const key=p=>p.lat.toFixed(6)+','+p.lng.toFixed(6);
const pointDistance=(a,b)=>{const r=x=>x*Math.PI/180,h=Math.sin(r(b.lat-a.lat)/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(r(b.lng-a.lng)/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)))};
const points=p=>p.meta?.points?.length?p.meta.points:[{lat:p.lat,lng:p.lng}];
const distance=(a,b)=>Math.min(...points(a).flatMap(x=>points(b).map(y=>pointDistance(x,y))));
function compare(p,state,data){
 if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return {eligible:false,reason:'insufficient',peers:[],base:null,diff:null};
 const month=String(state.year)+'-'+String(state.month+1).padStart(2,'0');
 const own=p.meta?.dates||{},groups=new Map();
 if(!Object.entries(own).some(([d,v])=>d.startsWith(month+'-')&&value(v)))return {eligible:false,reason:'no-data',peers:[],base:null,diff:null};
 for(const q of data){if(!Number.isFinite(q.lat)||!Number.isFinite(q.lng)||key(q)===key(p))continue;const km=distance(p,q);if(km<.001||km>state.rules.radius)continue;const k=key(q);if(!groups.has(k))groups.set(k,[]);groups.get(k).push({project:q,distance:km})}
 const available=[...groups.values()].map(group=>{const entries=group.map(x=>({...x,readings:Object.entries(x.project.meta?.dates||{}).filter(([d,v])=>d.startsWith(month+'-')&&value(v))})).filter(x=>x.readings.length);if(!entries.length)return null;const rep=entries[0],readings=rep.readings.map(([,v])=>v);return {project:rep.project,distance:Math.min(...group.map(x=>x.distance)),gi:readings.reduce((s,v)=>s+v,0)/readings.length,comparisonUsed:false};}).filter(Boolean).sort((a,b)=>a.distance-b.distance);
 let total=0,reference=0,days=0;const used=new Map();
 for(const [day,v] of Object.entries(own)){if(!day.startsWith(month+'-')||!value(v))continue;const readings=[];for(const [k,group] of groups){const valid=group.filter(x=>value(x.project.meta?.dates?.[day]));if(valid.length)readings.push({k,group:valid,gi:median(valid.map(x=>x.project.meta.dates[day]))})}if(readings.length<state.rules.minPeers)continue;const vals=readings.map(x=>x.gi),base=state.rules.method==='mean'?vals.reduce((s,v)=>s+v,0)/vals.length:median(vals);if(!(base>0))continue;total+=v;reference+=base;days++;for(const x of readings){const rep=x.group[0];let u=used.get(x.k);if(!u){u={project:rep.project,distance:rep.distance,total:0,count:0};used.set(x.k,u)}u.total+=x.gi;u.count++}}
 const peers=[...used.values()].map(x=>({project:x.project,distance:x.distance,gi:x.total/x.count})).sort((a,b)=>a.distance-b.distance);
 if(!days)return {eligible:false,reason:'insufficient',peers:available,nearbySites:groups.size,availableSites:available.length,comparisonDays:0,base:null,diff:null};
 return {eligible:true,reason:'ok',peers,base:reference/days,diff:Math.abs(total-reference)/reference*100,direction:total>reference?'สูงกว่า':total<reference?'ต่ำกว่า':'เท่ากัน'};
}
function averageCompare(p,state,data){
 const average=q=>{const v=q.irradiance?.[String(state.year)]?.[String(state.month+1).padStart(2,'0')];return value(v)?v:null};
 if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return {eligible:false,reason:'insufficient',peers:[],base:null,diff:null};
 const own=average(p),groups=new Map();
 if(own===null)return {eligible:false,reason:'no-data',peers:[],base:null,diff:null};
 for(const q of data){if(!Number.isFinite(q.lat)||!Number.isFinite(q.lng)||key(q)===key(p))continue;const km=distance(p,q);if(km<.001||km>state.rules.radius)continue;const k=key(q);if(!groups.has(k))groups.set(k,[]);groups.get(k).push({project:q,distance:km})}
 const peers=[...groups.values()].map(group=>{const available=group.filter(x=>average(x.project)!==null);if(!available.length)return null;return {project:available.length>1?{...available[0].project,name:available.map(x=>x.project.name).join(' / ')}:available[0].project,distance:Math.min(...available.map(x=>x.distance)),gi:median(available.map(x=>average(x.project)))};}).filter(Boolean).sort((a,b)=>a.distance-b.distance);
 const info={peers,nearbySites:groups.size,availableSites:peers.length};
 if(peers.length<state.rules.minPeers)return {...info,eligible:false,reason:'insufficient',base:null,diff:null};
 const values=peers.map(x=>x.gi),base=state.rules.method==='mean'?values.reduce((sum,v)=>sum+v,0)/values.length:median(values);
 if(!(base>0))return {...info,eligible:false,reason:'invalid-base',base:null,diff:null};
 return {...info,eligible:true,reason:'ok',base,diff:Math.abs(own-base)/base*100,direction:own>base?'สูงกว่า':own<base?'ต่ำกว่า':'เท่ากัน'};
}
window.GIMapAverageCompare=averageCompare;
const caches=new WeakMap();
function cachedCompare(p,state,data){let cache=caches.get(data);if(!cache){cache=new Map();caches.set(data,cache)}const k=JSON.stringify([p.id,state.year,state.month,state.rules]);if(cache.has(k))return cache.get(k);if(cache.size>1000)cache.clear();const result=averageCompare(p,state,data);cache.set(k,result);return result}
window.GIMapLiveCompare=cachedCompare;
window.GIMapLegacyCompare=compare;
let initialized=false;
addEventListener('message',e=>{
 if(e.source!==parent||e.origin!==location.origin||!['gi-map-data','gi-map-location-result'].includes(e.data?.type))return;
 if(e.data.error)return;const previous=initialized?GIMap.getState():null;
 const payload=e.data.payload;if(!payload||!Array.isArray(payload.projects))return;
 if(!initialized){GIMap.init({rootId:'gi-map-module',dataLabel:payload.label,compare:cachedCompare,tileUrl:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',tileAttribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'});GIMap.setRules({radius:20,minPeers:3,normal:5,abnormal:10,method:'median'});initialized=true}
 const projects=payload.projects.map(p=>({...p,projectId:encodeURIComponent(p.projectId),region:p.region||Object.entries(regionLists).find(([,s])=>s.split(' ').includes(p.province.replace(/^จังหวัด\s*/,'')))?.[0]||''}));
 GIMap.setData(projects,{label:payload.label});
 if(previous?.year){GIMap.setYear(previous.year);GIMap.setMonth(previous.month+1)}else if(payload.period){GIMap.setYear(+payload.period.slice(0,4));GIMap.setMonth(+payload.period.slice(5,7))}
 const badge=document.querySelector('[data-role="data-badge"]');badge.title=payload.locationNote+' · '+payload.unlocated+' projects without mapped coordinates';
 GIMap.fit();parent.postMessage({type:'gi-map-loaded'},location.origin);window.dispatchEvent(new CustomEvent("gi-map-payload",{detail:payload}));
});
document.querySelector('[data-action="return-gi"]').addEventListener('click',()=>parent.postMessage({type:'gi-map-back'},location.origin));
window.addEventListener('load',()=>{if(parent!==window)parent.postMessage({type:'gi-map-ready'},location.origin);else document.querySelector('[data-role="data-badge"]').textContent='Open through Map overview'});
})();
