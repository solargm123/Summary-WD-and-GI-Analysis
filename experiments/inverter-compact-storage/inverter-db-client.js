(function(global){
 'use strict';
 function create(client,workspace,codec){
  const tick=()=>new Promise(r=>setTimeout(r,0));
  async function checked(request){const r=await request;if(r.error)throw r.error;return r.data;}
  async function pages(table,select,configure){let rows=[];for(let offset=0;;offset+=500){let q=client.from(table).select(select).order('id').range(offset,offset+499);q=configure(q);const part=await checked(q);rows.push(...part);if(part.length<500)return rows;await tick();}}
  async function user(){const {data,error}=await client.auth.getUser();if(error)throw error;if(!data.user)throw Error('Please sign in to Main Center first');return data.user.id;}
  async function save(state,onProgress=()=>{}){
   const uid=await user();const prior=await checked(client.from('inverter_user_workspaces').select('revision').eq('workspace_id',workspace).eq('user_id',uid).maybeSingle());
   let added=0,skipped=0;
   for(let offset=0;offset<state.daily.length;offset+=500){
    const packed=codec.packDaily(state.daily.slice(offset,offset+500));
    const rows=packed.rows.map((a,i)=>[...packed.devices[a[0]],a[1],...a.slice(2,8),packed.sources[a[8]],a[9],offset+i]);
    const result=await checked(client.rpc('import_inverter_compact_batch',{p_workspace:workspace,p_rows:rows}));added+=result.added;skipped+=result.skipped;onProgress(Math.min(offset+500,state.daily.length),state.daily.length);await tick();
   }
   const {daily,...metadata}=state;
   let result;
   if(prior){result=await checked(client.from('inverter_user_workspaces').update({metadata,revision:prior.revision+1}).eq('workspace_id',workspace).eq('user_id',uid).eq('revision',prior.revision).select('revision'));if(result.length!==1)throw Error('Your saved workspace changed in another session; raw rows are safe. Keep your .iaw and reload before saving notes.');}
   else await checked(client.from('inverter_user_workspaces').insert({workspace_id:workspace,user_id:uid,metadata}));
   return {added,skipped};
  }
  async function load(onProgress=()=>{}){
   const uid=await user();
   const devices=await pages('inverter_devices','id,source_project_name,device_name,project_id',q=>q.eq('workspace_id',workspace));
   const sources=await pages('inverter_sources','id,name',q=>q.eq('workspace_id',workspace));
   const metadata=await checked(client.from('inverter_user_workspaces').select('metadata').eq('workspace_id',workspace).eq('user_id',uid).maybeSingle());
   const dm=new Map(devices.map(d=>[d.id,d])),sm=new Map(sources.map(s=>[s.id,s.name]));
   const rows=[];let last=null;
   for(;;){
    let q=client.from('inverter_daily').select('device_id,record_date,capacity_milli,pv_centi,total_centi,specific_milli,peak_milli,duration_milli,source_id,source_row,record_order,inverter_devices!inner(workspace_id)').eq('inverter_devices.workspace_id',workspace).order('device_id').order('record_date').limit(500);
    if(last)q=q.or(`device_id.gt.${last.device_id},and(device_id.eq.${last.device_id},record_date.gt.${last.record_date})`);
    const part=await checked(q);if(!part.length)break;
    for(const r of part){const d=dm.get(r.device_id);if(!d||!sm.has(r.source_id))throw Error('Incomplete device/source dictionary');const values=['capacity_milli','pv_centi','total_centi','specific_milli','peak_milli','duration_milli'].map(k=>{const v=r[k];if(typeof v==='number'&&!Number.isSafeInteger(v))throw Error('Unsafe numeric response; database returned a BIGINT outside JSON safe range');return v==null?null:String(v);});const restored=codec.unpackDaily({format:'InverterCompactTest',version:1,devices:[[d.source_project_name,d.device_name]],sources:[sm.get(r.source_id)],rows:[[0,r.record_date,...values,0,r.source_row]]});restored[0]._recordOrder=r.record_order;rows.push(restored[0]);}
    last=part.at(-1);onProgress(rows.length);await tick();if(part.length<500)break;
   }
   // Original order matters for last-known capacity and first tie-breaking device.
   // Order retained by .iaw writer is date/project insertion order; DB device IDs are stable.
   rows.sort((a,b)=>a._recordOrder-b._recordOrder||a.date.localeCompare(b.date)||a.project.localeCompare(b.project)||a.device.localeCompare(b.device));for(const r of rows)delete r._recordOrder;
   return {daily:rows,metadata:metadata?.metadata||null,unmatched:devices.filter(d=>!d.project_id).map(d=>d.source_project_name).filter((v,i,a)=>a.indexOf(v)===i)};
  }
  return {save,load};
 }
 global.InverterDatabase={create};
})(typeof window==='undefined'?globalThis:window);
