/* PR Analysis paused; retain implementation for later use. */
const PR_ANALYSIS_ENABLED=false;
if(!PR_ANALYSIS_ENABLED){document.getElementById('analysisTab')?.classList.add('hidden');document.getElementById('analysisView')?.classList.add('hidden');}
/* Read-only evidence analysis. Uses existing PR calculator; never updates source or reviews. */
const PRAnalysis=(()=>{
 let seq=0,rows=[],evidence=[],lastProject='',lastMonth='',lastError='',lastExpected=0;
 const el=id=>document.getElementById(id),label=(th,en)=>tr(th,en);
 async function checked(q){const r=await q;if(r.error)throw r.error;return r.data||[]}
 async function pages(table,columns,filter){let out=[];for(let offset=0;;offset+=500){const part=await checked(filter(SolarCloud.getClient().from(table).select(columns)).range(offset,offset+499));out.push(...part);if(part.length<500)return out}}
 function open(){
  if(!PR_ANALYSIS_ENABLED)return;
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
 function verdict(x){
  if(!x.wdAvailable||x.pv==null)return 'unknown';
  if(x.pv>0||x.inv?.pv>0)return 'watch';
  return lastExpected>0&&x.inv?.count===lastExpected&&x.inv?.valid===lastExpected?'good':'unknown';
 }
 function detail(index){
  const x=evidence[index];if(!x)return;
  el('analysisDetailTitle').textContent=lastProject+' · '+x.date;
  const r=x.r,pr=r&&effectiveTheory(r)>0?(effectivePv(r)+effectiveLoss(r)*state.settings.lossFactor)/effectiveTheory(r)*100:NaN;
  const fields=[['PV Yield (kWh)',x.pv==null?'—':x.pv.toFixed(3)],['GI (kWh/m²)',r?effectiveGi(r).toFixed(3):'—'],['Loss Due (kWh)',r?effectiveLoss(r).toFixed(3):'—'],['PR with loss',Number.isFinite(pr)?fmt(pr)+'%':'—'],[label('ใช้คำนวณ PR','PR inclusion'),r?included(r)?label('ใช้','Included'):label('ไม่ใช้','Excluded'):'—'],[label('Inverter ที่มีข้อมูล','Inverter records'),(x.inv?.count||0)+' / '+lastExpected],[label('เหตุผล WD','WD reason'),x.reason||'—'],['Note',state.dailyNotes[lastProject+'|'+x.date]?.text||'—']];
  el('analysisDetailBody').innerHTML=fields.map(([k,v])=>'<div><span>'+esc(k)+'</span><b>'+esc(v)+'</b></div>').join('');
  el('analysisDetailModal').classList.add('open');
 }
 function render(error,expected){
  const a=aggregate(rows),g=guaranteeFor(lastProject,contractFor(lastProject,rows.at(-1)?.date||lastMonth+'-01').year),diff=a.prLoss-g;
  el('analysisResult').innerHTML='<span>'+esc(lastProject)+' · '+esc(lastMonth)+'</span><span>PR with loss <b>'+fmt(a.prLoss)+'%</b></span><span>Guarantee <b>'+fmt(g)+'%</b></span><span class="'+(diff>=0?'pra-good':'pra-watch')+'">'+label(diff>=0?'สูงกว่าเกณฑ์ ':'ต่ำกว่าเกณฑ์ ',diff>=0?'Above guarantee ':'Below guarantee ')+fmt(Math.abs(diff))+' '+label('จุดเปอร์เซ็นต์','percentage points')+'</span>';
  const groups=[
   {title:label('ข้อมูล Plant ไม่ตรงกับ Inverter','Plant / inverter conflict'),items:evidence.filter(x=>x.pv===0&&x.inv?.pv>0),proof:label('Plant = 0 แต่ Inverter มีการผลิต','Plant = 0; inverter produced'),action:label('ตรวจรายงานต้นทาง','Check source report')},
   {title:label('มีการผลิตในวันที่ WD ตัดออก','Producing day excluded by WD'),items:evidence.filter(x=>x.wdAvailable&&!x.used&&x.pv>0),proof:label('PV Yield มากกว่า 0','PV Yield above 0'),action:label('ตรวจเหตุผลที่ตัดวัน','Check exclusion reason')},
   {title:label('ข้อมูล PV Yield ไม่ครบ','Missing PV Yield'),items:evidence.filter(x=>x.pv==null),proof:label('ไม่มีค่า PV Yield — ไม่ใช่ค่า 0','PV Yield missing — distinct from zero'),action:label('ตรวจหรือเติมข้อมูลก่อนสรุป','Verify missing records first')}
  ];
  el('analysisIssues').innerHTML=groups.filter(x=>x.items.length).map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+x.items.map(d=>'<button class="pra-date" onclick="PRAnalysis.detail('+evidence.indexOf(d)+')">'+esc(d.date.slice(8))+'</button>').join(' ')+'</td><td>'+esc(x.proof)+'</td><td>'+esc(x.action)+'</td></tr>').join('')||'<tr><td colspan="4" class="pra-empty">'+label('ไม่พบประเด็นจากหลักฐานที่โหลดได้','No issues found in loaded evidence')+'</td></tr>';
  const names={watch:label('ควรตรวจซ้ำ','Review needed'),unknown:label('ข้อมูลไม่พอ','Insufficient data'),good:label('มีหลักฐานรองรับ','Evidence supports exclusion')};
  const excluded=evidence.filter(x=>!x.used);
  el('analysisRows').innerHTML=excluded.filter(x=>!el('analysisOnlyIssues').checked||verdict(x)!=='good').map(x=>{
   const v=verdict(x);return '<tr><td>'+esc(x.date)+'</td><td>'+(x.pv==null?'—':x.pv.toFixed(3))+'</td><td>'+(x.inv?x.inv.pv.toFixed(3):'—')+'</td><td>'+esc(x.reason||label('ไม่มีเหตุผลระบุ','No reason recorded'))+'</td><td><span class="pra-status pra-'+v+'">'+names[v]+'</span></td><td><button class="btn pra-detail" onclick="PRAnalysis.detail('+evidence.indexOf(x)+')" aria-label="'+label('ดูรายละเอียด','View details')+'">›</button></td></tr>';
  }).join('')||'<tr><td colspan="6" class="pra-empty">'+label('ไม่มีวันที่ตรงกับตัวกรอง','No matching excluded days')+'</td></tr>';
  el('analysisEvidenceHint').textContent=error?label('ข้อมูล Inverter โหลดไม่ได้: ','Inverter unavailable: ')+error:label('จำนวน Inverter อิงฐานข้อมูล ยังไม่ยืนยันว่าครบหน้างาน • ผลตรวจเป็นหลักฐานประกอบ ไม่แก้ WD อัตโนมัติ','Inverter inventory is not confirmed complete on site • Evidence only; no automatic WD changes');
 }
 return{open,run,detail,filter:()=>render(lastError,lastExpected),assessment};
})();
