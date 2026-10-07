/* Read-only evidence analysis. Uses existing PR calculator; never updates source or reviews. */
const PRAnalysis=(()=>{
 let seq=0,rows=[],evidence=[],lastProject='',lastMonth='',lastError='',lastExpected=0;
 const el=id=>document.getElementById(id),label=(th,en)=>tr(th,en);
 async function checked(q){const r=await q;if(r.error)throw r.error;return r.data||[]}
 async function pages(table,columns,filter){let out=[];for(let offset=0;;offset+=500){const part=await checked(filter(SolarCloud.getClient().from(table).select(columns)).range(offset,offset+499));out.push(...part);if(part.length<500)return out}}
 function open(){
  ['overview','detail','data'].forEach(v=>{el(v+'View').classList.add('hidden');el(v+'Tab').classList.remove('active')});
  el('analysisView').classList.remove('hidden');el('analysisTab').classList.add('active');
  const prior=el('analysisProject').value,names=allProjectNames();el('analysisProject').replaceChildren(new Option(label('เลือกโครงการ','Select project'),''));
  names.forEach(n=>el('analysisProject').add(new Option(n,n)));if(names.includes(prior))el('analysisProject').value=prior;
  if(!el('analysisMonth').value)el('analysisMonth').value=el('monthFilter').value;
 }
 function parseScope(value){try{return typeof value==='string'?JSON.parse(value):value}catch{return null}}
 function assessment(pv,inv,expected,used,scope){
  const complete=expected>0&&inv&&inv.count===expected&&inv.valid===expected;
  if(pv==null)return inv?.pv>0?label('Plant ขาดข้อมูล แต่ Inverter มีผลิต','Plant missing; inverter produced'):label('หลักฐานไม่พอ','Insufficient evidence');
  if(pv>0)return used?label('นับวันตาม PV Yield','Included by PV Yield'):label('ตัดวันผลิต — ตรวจเหตุผล','Producing day excluded — check reason');
  if(inv?.pv>0)return label('ข้อมูลขัดแย้ง — มีการผลิต','Conflict — inverter produced');
  return complete?label('มีหลักฐานสนับสนุนการไม่นับ','Evidence supports exclusion'):label('PV = 0 แต่หลักฐานไม่ครบ','PV = 0; incomplete evidence');
 }
 async function run(){
  const project=el('analysisProject').value,month=el('analysisMonth').value;if(!project||!/^\d{4}-\d{2}$/.test(month))return;
  const request=++seq;el('analysisRun').disabled=true;el('analysisResult').textContent=label('กำลังตรวจหลักฐานรายวัน…','Checking daily evidence…');
  try{
   const member=await SolarCloud.membership(),workspace=member.workspace_id,[start,end]=periodBounds(month,'month'),client=SolarCloud.getClient();
   const prProject=await SolarCloud.loadProject(new URLSearchParams(location.search).get('project'));
   const wdQuery=client.from('analysis_projects').select('id,user_state').eq('workspace_id',workspace).eq('analysis_type','working_day').eq('dataset_id',prProject.dataset_id).is('deleted_at',null).order('updated_at',{ascending:false}).limit(1);
   const [records,wdResult,central,devices,wdPayload]=await Promise.all([SolarCloud.loadPrProjectRecords([project],start,end),checked(wdQuery),checked(client.from('central_projects').select('id,standard_name').eq('workspace_id',workspace).eq('standard_name',project)),pages('inverter_devices','id,source_project_name,device_name,project_id',q=>q.eq('workspace_id',workspace).order('id')),client.rpc('get_working_day_month',{p_workspace:workspace,p_month:month})]);
   if(request!==seq)return;
   const ids=new Set(central.map(p=>p.id)),matched=devices.filter(d=>ids.has(d.project_id)||d.source_project_name===project),daily=new Map();let inverterError='';
   try{for(let i=0;i<matched.length;i+=100){const group=matched.slice(i,i+100);const parts=await pages('inverter_daily','device_id,record_date,pv_centi',q=>q.in('device_id',group.map(d=>d.id)).gte('record_date',start).lt('record_date',end).order('device_id').order('record_date'));for(const r of parts){const x=daily.get(r.record_date)||{count:0,valid:0,pv:0,seen:new Set()};if(x.seen.has(r.device_id))throw Error('Duplicate inverter/day evidence');x.seen.add(r.device_id);x.count++;if(r.pv_centi!=null&&Number.isFinite(Number(r.pv_centi))){x.valid++;x.pv+=Number(r.pv_centi)/100}daily.set(r.record_date,x)}}}catch(e){daily.clear();inverterError=e.message}
   if(request!==seq)return;
   rows=records;lastProject=project;lastMonth=month;
   if(wdPayload.error)throw wdPayload.error;
   const wdRows=(wdPayload.data?.records||[]).filter(r=>r.name===project),wdDaily=new Map(wdRows.map(r=>[Number(r.recordDay),r]));
   const overrides=wdResult[0]?.user_state?.overrides||{},byDate=new Map(records.map(r=>[r.date,r])),count=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
   evidence=Array.from({length:count},(_,i)=>{
    const date=month+'-'+String(i+1).padStart(2,'0'),r=byDate.get(date),wd=wdDaily.get(i+1),rawValid=wd&&wd.pvAvailable!==false&&wd.pv!=null&&wd.pv!==''&&Number.isFinite(Number(wd.pv)),edited=r&&recordOverride(r).pv!=null,pv=edited?effectivePv(r):rawValid?Number(wd.pv):null;
    const stable=wd?.projectId||wd?.projectKey||central[0]?.id||'name:'+project.toLowerCase(),scope=parseScope(overrides['@wdscope:'+month+':'+stable]||overrides['@wdscope:'+month+':name:'+project.toLowerCase()]);
    const inScope=!scope?.confirmed||((scope.pvRule===true||i+1>=scope.start&&i+1<=scope.end)&&!(scope.excluded||[]).includes(i+1)),used=!!wdResult.length&&pv>0&&inScope,inv=daily.get(date);
    return {date,r,pv,inv,used,wdAvailable:!!wdResult.length,reason:scope?.reason||'',assessment:wdResult.length?assessment(pv,inv,matched.length,used,scope):label('ไม่พบ Working Day ชุดเดียวกัน','Matching Working Day unavailable')};
   });
   lastError=inverterError;lastExpected=matched.length;render(inverterError,matched.length);
  }catch(e){if(request===seq)el('analysisResult').textContent=label('วิเคราะห์ไม่สำเร็จ: ','Analysis failed: ')+e.message}
  finally{if(request===seq)el('analysisRun').disabled=false}
 }
 function render(error,expected){
  const a=aggregate(rows),guarantee=guaranteeFor(lastProject,contractFor(lastProject,rows.at(-1)?.date||lastMonth+'-01').year),zero=evidence.filter(x=>x.pv===0),missing=evidence.filter(x=>x.pv==null),conflicts=evidence.filter(x=>x.pv===0&&x.inv?.pv>0),lossDays=rows.filter(r=>effectiveLoss(r)>0);
  el('analysisResult').innerHTML='<h3>'+esc(lastProject)+' · '+esc(lastMonth)+'</h3><p>PR with loss <b>'+fmt(a.prLoss)+'%</b> · Guarantee '+fmt(guarantee)+'% · '+label('วันคำนวณ PR','PR calculation days')+' '+a.days+'</p><p>'+label('ใช้ตัวกรองวัน PR ปัจจุบัน และค่าที่แก้ไขแล้วจาก PR/Global','Uses current PR day filter and corrected PR/Global values')+'</p><ul><li>'+label('วันขาด PV Yield','Missing PV Yield days')+': '+missing.length+'</li><li>'+label('วัน PV Yield = 0','Zero PV Yield days')+': '+zero.length+'</li><li>'+label('วันที่ Plant/Inverter ขัดแย้ง','Conflicting Plant/Inverter days')+': '+conflicts.length+'</li><li>'+label('วันที่มี Loss Due — เปิดตรวจข้อจำกัดการส่งออก','Loss Due days — investigate export limitation')+': '+lossDays.length+'</li></ul><p class="muted">'+label('ผลนี้เป็นหลักฐานประกอบ ไม่ยืนยันสาเหตุอุปกรณ์เสียหรือแก้ WD อัตโนมัติ จำนวนวันเทียบเท่าที่ลดจากสมการ Loss ไม่ใช่วันที่ถูกตัด','Evidence only; no automatic WD changes or confirmed equipment diagnosis. Loss-equivalent days are not excluded calendar dates.')+'</p>'+ (error?'<p>'+esc(label('ข้อมูล Inverter โหลดไม่ได้: ','Inverter unavailable: ')+error)+'</p>':'');
  const only=el('analysisOnlyIssues').checked;
  el('analysisRows').innerHTML=evidence.filter(x=>!only||!x.used||x.pv==null).map(x=>{
   const pv=x.pv==null?'—':x.pv.toFixed(3),loss=x.r?effectiveLoss(x.r).toFixed(3):'—',gi=x.r?effectiveGi(x.r).toFixed(3):'—',pr=x.r&&effectiveTheory(x.r)>0?(effectivePv(x.r)+effectiveLoss(x.r)*state.settings.lossFactor)/effectiveTheory(x.r)*100:NaN;
   return '<tr><td>'+x.date+'</td><td>'+ (x.wdAvailable?x.used?label('นับ','Included'):label('ไม่นับ','Excluded'):'—')+'</td><td>'+pv+'</td><td>'+gi+'</td><td>'+loss+'</td><td>'+fmt(pr)+'</td><td>'+(x.r?included(x.r)?label('ใช้','Used'):label('ไม่ใช้','Excluded'):'—')+'</td><td>'+(x.inv?x.inv.pv.toFixed(3):'—')+'<small style="display:block">'+(x.inv?.count||0)+'/'+expected+'</small></td><td>'+esc(x.assessment)+'</td><td>'+esc(x.reason||state.dailyNotes[lastProject+'|'+x.date]?.text||'')+'</td></tr>';
  }).join('');
 }
 return{open,run,filter:()=>render(lastError,lastExpected),assessment};
})();
