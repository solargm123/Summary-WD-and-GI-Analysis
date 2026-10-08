/* Shared Threshold display; retain personal filters and save only changed leaves. */
(function(global){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value||{}));
 const maps=metadata=>({thresholds:clone(metadata?.thresholds),yearThresholds:clone(metadata?.settings?.yearThresholds)});
 function leaves(value,path=[],out=new Map()){
  for(const [key,item] of Object.entries(value||{})){
   if(['__proto__','constructor','prototype'].includes(key))continue;
   const next=path.concat(key);
   if(item&&typeof item==='object'&&!Array.isArray(item))leaves(item,next,out);
   else if(item!==null&&item!==''&&Number.isFinite(Number(item)))out.set(JSON.stringify(next),Number(item));
  }return out;
 }
 function put(target,path,value){
  if(path.some(key=>['__proto__','constructor','prototype'].includes(key)))return;
  let node=target;for(const key of path.slice(0,-1))node=node[key]??={};
  if(value===undefined||value===null)delete node[path.at(-1)];else node[path.at(-1)]=value;
 }
 function changes(before,after){
  const a=leaves(before),b=leaves(after),result=[];
  for(const key of new Set([...a.keys(),...b.keys()]))if(a.get(key)!==b.get(key))result.push({path:JSON.parse(key),before:a.get(key),after:b.get(key)});
  return result;
 }
 function auditPath(path){
  if(path?.[0]==='thresholds')return path;
  if(path?.[0]==='settings'&&path[1]==='yearThresholds')return ['yearThresholds',...path.slice(2)];
  return null;
 }
 function combine(data){
  const merged={thresholds:{},yearThresholds:{}};
  for(const user of [...(data.users||[])].sort((a,b)=>String(a.user_id).localeCompare(String(b.user_id)))){
   const own={thresholds:user.thresholds||{},yearThresholds:user.yearThresholds||{}};
   for(const [key,value] of leaves(own))put(merged,JSON.parse(key),value);
  }
  // The server returns newest first. Apply real edits in chronological order.
  for(const event of [...(data.history||[])].reverse())for(const change of event.changes||[]){
   const path=auditPath(change.path);if(path)put(merged,path,change.after);
  }
  return merged;
 }
 function create(client,workspace){
  let data={users:[],history:[]},effective={thresholds:{},yearThresholds:{}},baseline=null,pending=null,loadedAt=0;
  async function load(force=false){
   if(!force&&loadedAt&&Date.now()-loadedAt<60000)return data;
   if(pending)return pending;
   pending=(async()=>{const result=await client.rpc('inverter_shared_preferences',{p_workspace_id:workspace});
    if(result.error)throw result.error;
    data=result.data||{users:[],history:[]};effective=combine(data);loadedAt=Date.now();return data;
   })();try{return await pending;}finally{pending=null;}
  }
  function prepare(metadata){
   const current=maps(metadata),next=clone(effective);
   // Preserve edits made locally while a month/project request was loading.
   if(baseline)for(const change of changes(baseline,current))put(next,change.path,change.after);
   baseline=clone(effective);
   return {...metadata,thresholds:next.thresholds,settings:{...metadata.settings,yearThresholds:next.yearThresholds}};
  }
  async function personalMetadata(prior,snapshot){
   if(!baseline)return snapshot;
   const delta=changes(baseline,maps(snapshot));
   await load(true);
   const server=leaves(effective);
   for(const change of delta){const now=server.get(JSON.stringify(change.path));
    if(now!==change.before&&now!==change.after)throw Error('Threshold changed by another user. Refresh before saving. / ผู้ใช้อื่นแก้ Threshold นี้แล้ว กรุณารีเฟรชก่อนบันทึก');
   }
   const own=maps(prior);
   for(const change of delta)put(own,change.path,change.after);
   return {...snapshot,thresholds:own.thresholds,settings:{...snapshot.settings,yearThresholds:own.yearThresholds}};
  }
  function saved(snapshot){baseline=maps(snapshot);effective=clone(baseline);loadedAt=0;
   load(true).then(()=>render(document.getElementById('manualThresholdProject')?.value||'')).catch(()=>{});
  }
  function render(project){
   const card=document.getElementById('inverterManualThresholdCard');if(!card)return;
   let panel=document.getElementById('inverterSharedHistory');
   if(!panel){panel=document.createElement('details');panel.id='inverterSharedHistory';panel.className='inverter-shared-history';card.append(panel);}
   const th=typeof currentLang==='function'?currentLang()==='th':document.documentElement.lang==='th';
   const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const label=(en,thai)=>th?thai:en;
   const contributors=(data.users||[]).filter(user=>leaves({thresholds:{[project]:user.thresholds?.[project]},yearThresholds:{[project]:user.yearThresholds?.[project]}}).size);
   const rows=(data.history||[]).flatMap(event=>(event.changes||[]).map(change=>({event,change,path:auditPath(change.path)}))).filter(row=>row.path?.[1]===project);
   panel.innerHTML='<summary>'+esc(label('Shared Threshold · editors & history','Threshold ร่วมกัน · ผู้ตั้งค่าและประวัติ'))+'</summary><p>'+esc(label('Existing settings from: ','ค่าที่บันทึกไว้โดย: '))+esc(contributors.map(user=>user.name||'User').join(', ')||'—')+'</p>'+
    (rows.length?'<div class="table-wrap"><table><thead><tr>'+[label('When','เวลา'),label('Editor','ผู้แก้ไข'),label('Period','ช่วงเวลา'),label('Before','ค่าเดิม'),label('After','ค่าใหม่')].map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(0,100).map(({event,change,path})=>'<tr><td>'+esc(new Date(event.created_at).toLocaleString(th?'th-TH':'en-GB'))+'</td><td>'+esc(event.name)+'</td><td>'+esc(path[0]==='yearThresholds'?path[2]+' / '+path[3]:label('Seasonal month ','เดือนทุกปี ')+path[2])+'</td><td>'+esc(change.before==null?'—':change.before+'%')+'</td><td>'+esc(change.after==null?'—':change.after+'%')+'</td></tr>').join('')+'</tbody></table></div>':'<p>'+esc(label('No detailed edits recorded yet. Existing values are preserved; earlier old/new values were not recorded.','ยังไม่มีประวัติการแก้ไขแบบละเอียด ค่าเดิมยังอยู่ แต่ข้อมูลเก่าไม่ได้บันทึกค่าเดิมและค่าใหม่ไว้'))+'</p>');
  }
  return {load,prepare,personalMetadata,saved,render};
 }
 global.InverterSharedPreferences={create,combine,changes,maps};
})(typeof window==='undefined'?globalThis:window);
