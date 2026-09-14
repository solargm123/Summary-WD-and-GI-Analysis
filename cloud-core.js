(function(global){
  'use strict';
  const CONFIG={
    url:'https://lncoukvtjsgpeyhotukh.supabase.co',
    key:'sb_publishable_pkp8EP-vx61lX7IdF8BDVw_JxgQU0tS',
    siteRoot:'https://solargm123.github.io/Summary-WD-and-GI-Analysis/'
  };
  let client=null,currentProject=null,currentMembership=null,adapter=null,saveTimer=null,dirty=false,saving=false,conflict=false,channel=null;
  const $=id=>document.getElementById(id);
  const indexUrl=()=>CONFIG.siteRoot;
  const projectId=()=>new URLSearchParams(location.search).get('project');
  const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function getClient(){
    if(client)return client;
    if(!global.supabase?.createClient)throw new Error('Supabase client library could not be loaded.');
    client=global.supabase.createClient(CONFIG.url,CONFIG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  async function session(){const {data,error}=await getClient().auth.getSession();if(error)throw error;return data.session}
  async function requireSession(){const s=await session();if(!s){location.replace(indexUrl());throw new Error('Authentication required');}return s}
  async function membership(){
    const {data,error}=await getClient().from('workspace_members').select('workspace_id,role,workspaces(name)').limit(1).maybeSingle();
    if(error)throw error;if(!data)throw new Error('Your account is not assigned to a workspace.');return data;
  }
  async function listProjects(){
    const m=await membership();currentMembership=m;
    const {data,error}=await getClient().from('analysis_projects').select('id,name,analysis_type,period_key,status,version,updated_at,updated_by').eq('workspace_id',m.workspace_id).is('deleted_at',null).order('updated_at',{ascending:false});
    if(error)throw error;return {membership:m,projects:data||[]};
  }
  async function createProject(type,name){
    const s=await requireSession(),m=await membership();
    if(!['admin','editor'].includes(m.role))throw new Error('Viewer cannot create a project.');
    const fallback=type==='working_day'?'Working Day Analysis':type==='global_irradiance'?'Global Irradiance Analysis':'PR Report';
    const {data,error}=await getClient().rpc('create_analysis_project',{p_workspace:m.workspace_id,p_analysis_type:type,p_name:(name||fallback).trim()});
    if(error)throw error;return data.id;
  }
  function analysisUrl(project){const page=project.analysis_type==='working_day'?'working-day-analysis.html':project.analysis_type==='global_irradiance'?'global-irradiance-analysis.html':'pr-report.html';return `${page}?project=${encodeURIComponent(project.id)}`}
  async function signIn(email,password){const {data,error}=await getClient().auth.signInWithPassword({email,password});if(error)throw error;return data}
  async function signOut(){await getClient().auth.signOut();location.replace(indexUrl())}
  async function loadProject(id){
    const {data,error}=await getClient().from('analysis_projects').select('*').eq('id',id).is('deleted_at',null).single();
    if(error)throw error;return data;
  }
  function roleCanAdmin(){return currentMembership?.role==='admin'}
  function roleCanEdit(){return ['admin','editor'].includes(currentMembership?.role)&&(currentProject?.status!=='completed'||roleCanAdmin())}
  function editLockLabel(){return currentMembership?.role==='viewer'?'Viewer':currentProject?.status==='completed'&&!roleCanAdmin()?'Completed — Locked':''}
  async function listDatasets(){
    const m=currentMembership||await membership();
    const {data,error}=await getClient().from('shared_datasets').select('id,name,source_files,normalized_data,updated_at,updated_by').eq('workspace_id',m.workspace_id).order('updated_at',{ascending:false});
    if(error)throw error;return data||[];
  }
  const normalizedHeader=value=>String(value??'').toLowerCase().replace(/[\n\r]+/g,' ').replace(/[_–—-]+/g,' ').replace(/\s+/g,' ').trim();
  const numeric=value=>{if(typeof value==='number')return Number.isFinite(value)?value:0;const n=Number(String(value??'').replace(/,/g,'').replace(/[^0-9.+-]/g,''));return Number.isFinite(n)?n:0};
  const fileDate=name=>{const m=String(name).match(/(\d{4})[-_.](\d{2})[-_.](\d{2})|(?:^|\D)(\d{2})[-_.](\d{2})[-_.](\d{4})(?:\D|$)/);return m?(m[1]?`${m[1]}-${m[2]}-${m[3]}`:`${m[6]}-${m[5]}-${m[4]}`):null};
  function sheetRows(sheet){
    const cells=Object.keys(sheet).filter(key=>/^[A-Z]+\d+$/.test(key));if(!cells.length)return [];
    let minR=Infinity,minC=Infinity,maxR=0,maxC=0;cells.forEach(key=>{const c=global.XLSX.utils.decode_cell(key);minR=Math.min(minR,c.r);minC=Math.min(minC,c.c);maxR=Math.max(maxR,c.r);maxC=Math.max(maxC,c.c)});
    return global.XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',range:global.XLSX.utils.encode_range({s:{r:minR,c:minC},e:{r:maxR,c:maxC}})});
  }
  async function normalizeUpload(files){
    if(!global.XLSX)throw new Error('Excel reader is not available.');
    const working=[],months=new Set(),plants={},dates=new Set(),seen=new Set(),sourceFiles=[];
    for(const file of Array.from(files||[])){
      sourceFiles.push(file.name);const buffer=await file.arrayBuffer();const workbook=global.XLSX.read(buffer,{type:'array'});const fallbackDate=fileDate(file.name);
      workbook.SheetNames.forEach(sheetName=>{
        const rows=sheetRows(workbook.Sheets[sheetName]);if(!rows.length)return;
        let header=-1,idx={plant:-1,cap:-1,pv:-1,specific:-1,loss:-1,irr:-1},date=fallbackDate;
        for(let r=0;r<Math.min(rows.length,30);r++){
          const candidate={plant:-1,cap:-1,pv:-1,specific:-1,loss:-1,irr:-1};
          (rows[r]||[]).forEach((cell,c)=>{const h=normalizedHeader(cell);const dm=String(cell??'').match(/\d{4}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./]\d{4}/);if(dm&&!date){const p=dm[0].split(/[-./]/);date=p[0].length===4?`${p[0]}-${p[1]}-${p[2]}`:`${p[2]}-${p[1]}-${p[0]}`}
            if(candidate.plant<0&&(h.includes('plant name')||h==='plant'||h==='station'||h.includes('ชื่อสถานี')||h.includes('ชื่อโครงการ')))candidate.plant=c;
            if(candidate.cap<0&&(h.includes('capacity')||h.includes('kwp')))candidate.cap=c;
            if(candidate.pv<0&&(h==='pv yield (kwh)'||h.startsWith('pv yield')||h.includes('พลังงาน pv')))candidate.pv=c;
            if(candidate.specific<0&&h.includes('specific energy'))candidate.specific=c;
            if(candidate.loss<0&&(h.includes('loss due to export limitation')||h.includes('loss due export')||h.includes('พลังงานสูญเสียจากการจำกัด')))candidate.loss=c;
            if(candidate.irr<0&&(h.includes('irradiation')||h.includes('irradiance')||h.includes('kwh/㎡')||h.includes('kwh/m²')))candidate.irr=c;
          });
          if(candidate.plant>=0&&(candidate.cap>=0||candidate.pv>=0||candidate.irr>=0)){header=r;idx=candidate;break}
        }
        if(header<0)return;const month=date?.slice(0,7)||null;const day=date?Number(date.slice(8,10)):null;
        for(let r=header+1;r<rows.length;r++){
          const row=rows[r]||[],name=String(row[idx.plant]??'').replace(/\s+/g,' ').trim();if(!name||/total|รวม|plant name/i.test(name))continue;
          const cap=idx.cap>=0?numeric(row[idx.cap]):0,pv=idx.pv>=0?numeric(row[idx.pv]):0,specific=idx.specific>=0?numeric(row[idx.specific]):(cap>0?pv/cap:0),loss=idx.loss>=0?numeric(row[idx.loss]):0;
          if(month&&idx.pv>=0){const key=`${month}|${day??'none'}|${name.toLowerCase()}`;if(!seen.has(key)){seen.add(key);working.push({fileName:file.name,name,cap,pv,specEnergy:specific,loss,recordDay:day,monthKey:month});months.add(month)}}
          if(date&&idx.irr>=0){if(!plants[name])plants[name]={capacity:cap,note:'',dates:{}};if(cap>0)plants[name].capacity=cap;plants[name].dates[date]=numeric(row[idx.irr]);dates.add(date)}
        }
      });
    }
    if(!working.length&&!Object.keys(plants).length)throw new Error('No valid shared data was found in the selected file(s).');
    return {working_day:{records:working,detectedMonths:[...months].sort().reverse()},global_irradiance:{plants,dates:[...dates].sort(),sourceFiles},sourceFiles};
  }
  async function saveSharedDataset(files){
    if(!roleCanEdit()||!files?.length)return null;setStatus('กำลังสร้าง Shared Data...','busy');
    const normalized=await normalizeUpload(files),names=[...normalized.sourceFiles],fingerprint=Array.from(files).map(f=>`${f.name}:${f.size}:${f.lastModified}`).sort().join('|');
    const name=names.length===1?names[0]:`${names[0]} +${names.length-1}`;const s=await requireSession(),m=currentMembership||await membership();
    const {data,error}=await getClient().rpc('upsert_shared_dataset',{p_workspace:m.workspace_id,p_name:name,p_fingerprint:fingerprint,p_source_files:names,p_normalized_data:normalized});if(error)throw error;
    await attachDataset(data,currentProject?.analysis_type!=='pr_report');return data;
  }
  async function attachDataset(dataset,alreadyLoaded=false){
    if(!currentProject||!dataset)return;const payload=currentProject.analysis_type==='pr_report'?dataset.normalized_data:dataset.normalized_data?.[currentProject.analysis_type];if(!payload||!Object.keys(payload).length)throw new Error('ชุดข้อมูลนี้ไม่มีข้อมูลสำหรับหน้าวิเคราะห์ปัจจุบัน');
    if(!alreadyLoaded)await adapter.restore(payload,currentProject.user_state||{});
    const {data,error}=await getClient().rpc('attach_dataset_to_project',{p_project_id:currentProject.id,p_dataset_id:dataset.id});if(error)throw error;currentProject=data;dirty=false;setConflictState(false);setStatus(`Shared: ${dataset.name}`,'ok');
  }
  function setStatus(text,state='ok'){
    const node=$('solarCloudStatus');if(!node)return;node.textContent=text;node.dataset.state=state;
    const dot=$('solarCloudDot');if(dot)dot.dataset.state=state;
  }
  function setConflictState(value){
    conflict=!!value;const button=$('solarConflictButton');if(button)button.style.display=conflict?'inline-block':'none';
  }
  function injectDock(){
    if($('solarCloudDock'))return;
    const style=document.createElement('style');style.textContent=`
      #solarCloudDock{position:fixed;right:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:7px;padding:7px 9px;background:#102432ee;color:#e8f3f5;border:1px solid #426171;border-radius:12px;box-shadow:0 12px 30px #0004;font:500 11px 'Bai Jamjuree',sans-serif;backdrop-filter:blur(10px)}
      #solarCloudDock button{border:1px solid #ffffff22;background:#ffffff0c;color:#e8f3f5;border-radius:8px;padding:6px 8px;font:600 11px 'Bai Jamjuree',sans-serif;cursor:pointer}#solarCloudDock button:hover{background:#ffffff1d}#solarConflictButton{border-color:#fb7185!important;color:#fecdd3!important;background:#fb71851c!important}
      #solarCloudDot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 0 4px #34d39922}#solarCloudDot[data-state=busy]{background:#fbbf24}#solarCloudDot[data-state=error],#solarCloudDot[data-state=conflict]{background:#fb7185}
      #solarCloudStatus[data-state=error],#solarCloudStatus[data-state=conflict]{color:#fecdd3}.solar-cloud-viewer{color:#fbbf24;font-weight:700}
      #solarCloudModal{position:fixed;inset:0;z-index:10000;background:#07151db3;display:none;place-items:center;padding:20px;font-family:'Bai Jamjuree',sans-serif}#solarCloudModal.open{display:grid}
      #solarCloudModalBox{width:min(700px,100%);max-height:80vh;overflow:auto;background:#fff;color:#1e293b;border-radius:14px;padding:18px;box-shadow:0 25px 70px #0007}#solarCloudModalBox h3{margin:0 0 12px}#solarCloudModalBox .log{padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:12px}#solarCloudModalBox time{color:#64748b;font-size:10px;display:block;margin-top:3px}
    `;document.head.appendChild(style);
    const dock=document.createElement('div');dock.id='solarCloudDock';dock.innerHTML=`<button onclick="SolarCloud.back()">← Workspace</button><span id="solarCloudDot"></span><span id="solarCloudStatus">กำลังเชื่อมต่อ...</span><span class="solar-cloud-viewer">${editLockLabel()}</span><button id="solarConflictButton" style="display:none" onclick="SolarCloud.resolveConflict()">จัดการ Conflict</button><button onclick="SolarCloud.datasets()">Shared Data</button><button onclick="SolarCloud.history()">History</button><button onclick="location.reload()">Reload</button><button onclick="SolarCloud.saveNow()" ${roleCanEdit()?'':'disabled'}>Save</button>`;document.body.appendChild(dock);
    const modal=document.createElement('div');modal.id='solarCloudModal';modal.innerHTML='<div id="solarCloudModalBox"><button style="float:right" onclick="document.getElementById(\'solarCloudModal\').classList.remove(\'open\')">✕</button><h3>Activity History</h3><div id="solarCloudLogs">Loading...</div></div>';document.body.appendChild(modal);
  }
  function applyViewerLock(){
    if(roleCanEdit())return;
    const lock=()=>{
      document.querySelectorAll('#excelFileInput,#fileInput,#inputLossFactor,#inputSunHoursCustom,[onchange*="updatePlantCapacity"],[onchange*="updatePlantDays"],[onchange*="updateCalculationMethod"],[onclick*="openLossModal"],[onclick*="openNoteModal"],#toggleEditBtn,[onclick="resetData()"],.data-irr-input,.data-note-input,.btn-copy,.btn-paste,.btn-restore').forEach(el=>{el.disabled=true;el.style.opacity='.6';el.style.cursor='not-allowed'});
    };lock();new MutationObserver(lock).observe(document.body,{subtree:true,childList:true});
  }
  function scheduleSave(reason='edit'){if(!roleCanEdit()||!currentProject)return;dirty=true;setStatus('มีการเปลี่ยนแปลง','busy');clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(reason),1500)}
  async function save(reason='manual'){
    if(!roleCanEdit()||!currentProject||!adapter||saving)return;
    if(conflict){setStatus('Conflict — โหลดข้อมูลล่าสุดก่อน','conflict');return}
    saving=true;setStatus('กำลังบันทึก...','busy');
    try{
      const payload=adapter.capture();
      const baseChanged=!currentProject.dataset_id&&JSON.stringify(payload.baseData??{})!==JSON.stringify(currentProject.base_data??{});
      const {data,error}=await getClient().rpc('save_analysis_project',{p_project_id:currentProject.id,p_expected_version:currentProject.version,p_base_data:baseChanged?(payload.baseData??{}):null,p_user_state:payload.userState??{},p_period_key:payload.periodKey??null,p_source_files:payload.sourceFiles??[],p_change_summary:{source:reason,analysis_type:currentProject.analysis_type,base_changed:baseChanged}});
      if(error)throw error;currentProject=data;dirty=false;setConflictState(false);setStatus('บันทึกแล้ว','ok');
    }catch(error){
      if(/version_conflict|40001/i.test(error.message||'')){setConflictState(true);setStatus('มีข้อมูลใหม่จากผู้ใช้อื่น — จัดการ Conflict','conflict')}else setStatus('บันทึกไม่สำเร็จ','error');
      console.error('Cloud save failed:',error);
    }finally{saving=false}
  }
  function installAutoSave(){
    global.addEventListener('beforeunload',event=>{if(dirty||conflict){event.preventDefault();event.returnValue=''}});
    document.addEventListener('change',event=>{if(event.target.closest('#solarCloudDock,#solarCloudModal'))return;scheduleSave('field_change')},true);
    document.addEventListener('click',event=>{const target=event.target.closest('button');if(target&&!target.closest('#solarCloudDock,#solarCloudModal'))setTimeout(()=>scheduleSave('action'),50)},true);
    const fileInput=$('excelFileInput')||$('fileInput');if(fileInput)fileInput.addEventListener('change',event=>{const files=Array.from(event.target.files||[]);[2500,5000,10000].forEach(ms=>setTimeout(()=>scheduleSave('file_import'),ms));if(files.length&&roleCanEdit())setTimeout(()=>saveSharedDataset(files).catch(error=>{console.error(error);setStatus('สร้าง Shared Data ไม่สำเร็จ','error');alert(`Shared Data: ${error.message}`)}),300)});
  }
  function subscribe(){
    if(channel)client.removeChannel(channel);
    channel=getClient().channel(`project:${currentProject.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'analysis_projects',filter:`id=eq.${currentProject.id}`},payload=>{
      if(payload.new.version>currentProject.version&&!saving){setConflictState(true);setStatus(dirty?'ข้อมูลชนกัน — กรุณาจัดการ Conflict':'มีข้อมูลใหม่ — กรุณา Reload','conflict')}
    }).subscribe();
  }
  async function initAnalysis(expectedType,projectAdapter){
    adapter=projectAdapter;try{
      await requireSession();currentMembership=await membership();const id=projectId();if(!id)throw new Error('Project ID is missing. Open this page from Workspace.');
      currentProject=await loadProject(id);if(currentProject.analysis_type!==expectedType)throw new Error('This project belongs to another analysis type.');
      injectDock();setStatus('กำลังโหลดงาน...','busy');
      if(currentProject.dataset_id){const {data:ds,error:dsError}=await getClient().from('shared_datasets').select('*').eq('id',currentProject.dataset_id).single();if(dsError)throw dsError;const shared=expectedType==='pr_report'?ds.normalized_data:ds.normalized_data?.[expectedType];if(shared)await adapter.restore(shared,currentProject.user_state||{})}
      else if(currentProject.base_data&&Object.keys(currentProject.base_data).length)await adapter.restore(currentProject.base_data,currentProject.user_state||{});
      applyViewerLock();installAutoSave();subscribe();setStatus(roleCanEdit()?'เชื่อมต่อแล้ว':currentProject.status==='completed'?'งานเสร็จแล้ว — โหมดดูอย่างเดียว':'โหมดดูอย่างเดียว','ok');
      document.title=`${currentProject.name} — ${document.title}`;
    }catch(error){console.error(error);alert(`Cloud workspace error: ${error.message}`);if(/Authentication|required|Project ID/.test(error.message))location.replace(indexUrl())}
  }
  function localDraft(){
    if(!currentProject||!adapter)throw new Error('Project is not ready.');
    return {draft_version:1,exported_at:new Date().toISOString(),project:{id:currentProject.id,name:currentProject.name,analysis_type:currentProject.analysis_type,expected_version:currentProject.version},payload:adapter.capture()};
  }
  function downloadLocalDraft(){
    try{
      const draft=localDraft(),blob=new Blob([JSON.stringify(draft,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),link=document.createElement('a'),safeName=String(currentProject.name||'project').replace(/[^a-zA-Z0-9ก-๙_-]+/g,'-').slice(0,80);
      link.href=url;link.download=`${safeName}-local-draft-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
      document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
      setStatus('เก็บ Local Draft แล้ว — พร้อมโหลดข้อมูลล่าสุด','conflict');
    }catch(error){alert(`ดาวน์โหลด Local Draft ไม่สำเร็จ: ${error.message}`)}
  }
  function reloadLatest(){
    // FINAL POLISH TODO: replace native confirm with the shared styled pop-up.
    if(!confirm('โหลดข้อมูลล่าสุดจากระบบหรือไม่? ข้อมูลที่ยังไม่บันทึกในหน้านี้จะหายไป'))return;
    dirty=false;setConflictState(false);location.reload();
  }
  function resolveConflict(){
    if(!currentProject)return;
    $('solarCloudModalBox').querySelector('h3').textContent='จัดการข้อมูลที่แก้ไขพร้อมกัน';
    $('solarCloudModal').classList.add('open');
    $('solarCloudLogs').innerHTML=`<div class="log"><b>พบข้อมูลเวอร์ชันใหม่ในระบบ</b><div>แนะนำให้ดาวน์โหลดข้อมูลที่กำลังแก้ไขเก็บไว้ก่อน แล้วจึงโหลดข้อมูลล่าสุด</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button onclick="SolarCloud.downloadLocalDraft()">ดาวน์โหลดข้อมูลที่ยังไม่บันทึก</button><button onclick="SolarCloud.reloadLatest()">โหลดข้อมูลล่าสุด</button></div>`;
  }
  async function history(){
    if(!currentProject)return;$('solarCloudModalBox').querySelector('h3').textContent='Activity History';$('solarCloudModal').classList.add('open');$('solarCloudLogs').textContent='Loading...';
    const {data,error}=await getClient().from('activity_logs').select('action,details,created_at,profiles!activity_logs_actor_id_fkey(display_name,email)').eq('project_id',currentProject.id).order('created_at',{ascending:false}).limit(50);
    $('solarCloudLogs').innerHTML=error?`<div>${esc(error.message)}</div>`:(data||[]).map(log=>`<div class="log"><b>${esc(log.action)}</b> · ${esc(log.profiles?.display_name||log.profiles?.email||'User')}<div>${esc(JSON.stringify(log.details||{}))}</div><time>${new Date(log.created_at).toLocaleString()}</time></div>`).join('')||'<div>No activity yet.</div>';
  }
  async function datasets(){
    $('solarCloudModalBox').querySelector('h3').textContent='Shared Data';$('solarCloudModal').classList.add('open');$('solarCloudLogs').textContent='Loading...';
    try{const rows=await listDatasets();$('solarCloudLogs').innerHTML=rows.map(ds=>`<div class="log"><b>${esc(ds.name)}</b><div>${esc((ds.source_files||[]).join(', '))}</div><time>${new Date(ds.updated_at).toLocaleString()}</time>${roleCanEdit()?`<button onclick="SolarCloud.useDataset('${ds.id}')">ใช้กับงานนี้</button>`:''}</div>`).join('')||'<div>ยังไม่มี Shared Data — อัปโหลด Excel ในหน้าวิเคราะห์หนึ่งครั้งเพื่อสร้าง</div>'}catch(error){$('solarCloudLogs').textContent=error.message}
  }
  async function useDataset(id){try{const rows=await listDatasets(),ds=rows.find(item=>item.id===id);await attachDataset(ds);$('solarCloudModal').classList.remove('open')}catch(error){alert(error.message)}}
  global.SolarCloud={CONFIG,getClient,session,requireSession,membership,listProjects,createProject,analysisUrl,signIn,signOut,loadProject,initAnalysis,scheduleSave,saveNow:()=>save('manual'),history,datasets,useDataset,resolveConflict,downloadLocalDraft,reloadLatest,back:()=>location.assign(indexUrl()),roleCanEdit,roleCanAdmin};
})(window);
