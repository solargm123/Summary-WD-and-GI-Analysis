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
    const fallback=type==='working_day'?'Working Day Analysis':'Global Irradiance Analysis';
    const {data,error}=await getClient().from('analysis_projects').insert({workspace_id:m.workspace_id,analysis_type:type,name:(name||fallback).trim(),created_by:s.user.id,updated_by:s.user.id}).select('id').single();
    if(error)throw error;return data.id;
  }
  function analysisUrl(project){return `${project.analysis_type==='working_day'?'working-day-analysis.html':'global-irradiance-analysis.html'}?project=${encodeURIComponent(project.id)}`}
  async function signIn(email,password){const {data,error}=await getClient().auth.signInWithPassword({email,password});if(error)throw error;return data}
  async function signOut(){await getClient().auth.signOut();location.replace(indexUrl())}
  async function loadProject(id){
    const {data,error}=await getClient().from('analysis_projects').select('*').eq('id',id).is('deleted_at',null).single();
    if(error)throw error;return data;
  }
  function roleCanEdit(){return ['admin','editor'].includes(currentMembership?.role)}
  function setStatus(text,state='ok'){
    const node=$('solarCloudStatus');if(!node)return;node.textContent=text;node.dataset.state=state;
    const dot=$('solarCloudDot');if(dot)dot.dataset.state=state;
  }
  function injectDock(){
    if($('solarCloudDock'))return;
    const style=document.createElement('style');style.textContent=`
      #solarCloudDock{position:fixed;right:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:7px;padding:7px 9px;background:#102432ee;color:#e8f3f5;border:1px solid #426171;border-radius:12px;box-shadow:0 12px 30px #0004;font:500 11px 'Bai Jamjuree',sans-serif;backdrop-filter:blur(10px)}
      #solarCloudDock button{border:1px solid #ffffff22;background:#ffffff0c;color:#e8f3f5;border-radius:8px;padding:6px 8px;font:600 11px 'Bai Jamjuree',sans-serif;cursor:pointer}#solarCloudDock button:hover{background:#ffffff1d}
      #solarCloudDot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 0 4px #34d39922}#solarCloudDot[data-state=busy]{background:#fbbf24}#solarCloudDot[data-state=error],#solarCloudDot[data-state=conflict]{background:#fb7185}
      #solarCloudStatus[data-state=error],#solarCloudStatus[data-state=conflict]{color:#fecdd3}.solar-cloud-viewer{color:#fbbf24;font-weight:700}
      #solarCloudModal{position:fixed;inset:0;z-index:10000;background:#07151db3;display:none;place-items:center;padding:20px;font-family:'Bai Jamjuree',sans-serif}#solarCloudModal.open{display:grid}
      #solarCloudModalBox{width:min(700px,100%);max-height:80vh;overflow:auto;background:#fff;color:#1e293b;border-radius:14px;padding:18px;box-shadow:0 25px 70px #0007}#solarCloudModalBox h3{margin:0 0 12px}#solarCloudModalBox .log{padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:12px}#solarCloudModalBox time{color:#64748b;font-size:10px;display:block;margin-top:3px}
    `;document.head.appendChild(style);
    const dock=document.createElement('div');dock.id='solarCloudDock';dock.innerHTML=`<button onclick="SolarCloud.back()">← Workspace</button><span id="solarCloudDot"></span><span id="solarCloudStatus">กำลังเชื่อมต่อ...</span><span class="solar-cloud-viewer">${currentMembership?.role==='viewer'?'Viewer':''}</span><button onclick="SolarCloud.history()">History</button><button onclick="location.reload()">Reload</button><button onclick="SolarCloud.saveNow()" ${roleCanEdit()?'':'disabled'}>Save</button>`;document.body.appendChild(dock);
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
      const baseChanged=JSON.stringify(payload.baseData??{})!==JSON.stringify(currentProject.base_data??{});
      const {data,error}=await getClient().rpc('save_analysis_project',{p_project_id:currentProject.id,p_expected_version:currentProject.version,p_base_data:baseChanged?(payload.baseData??{}):null,p_user_state:payload.userState??{},p_period_key:payload.periodKey??null,p_source_files:payload.sourceFiles??[],p_change_summary:{source:reason,analysis_type:currentProject.analysis_type,base_changed:baseChanged}});
      if(error)throw error;currentProject=data;dirty=false;conflict=false;setStatus('บันทึกแล้ว','ok');
    }catch(error){
      if(/version_conflict|40001/i.test(error.message||'')){conflict=true;setStatus('มีเวอร์ชันใหม่ — กด Reload','conflict')}else setStatus('บันทึกไม่สำเร็จ','error');
      console.error('Cloud save failed:',error);
    }finally{saving=false}
  }
  function installAutoSave(){
    document.addEventListener('change',event=>{if(event.target.closest('#solarCloudDock,#solarCloudModal'))return;scheduleSave('field_change')},true);
    document.addEventListener('click',event=>{const target=event.target.closest('button');if(target&&!target.closest('#solarCloudDock,#solarCloudModal'))setTimeout(()=>scheduleSave('action'),50)},true);
    const fileInput=$('excelFileInput')||$('fileInput');if(fileInput)fileInput.addEventListener('change',()=>[2500,5000,10000].forEach(ms=>setTimeout(()=>scheduleSave('file_import'),ms)));
  }
  function subscribe(){
    if(channel)client.removeChannel(channel);
    channel=getClient().channel(`project:${currentProject.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'analysis_projects',filter:`id=eq.${currentProject.id}`},payload=>{
      if(payload.new.version>currentProject.version&&!saving){if(dirty){conflict=true;setStatus('Conflict — มีผู้แก้ไขงานนี้','conflict')}else{conflict=true;setStatus('มีข้อมูลใหม่ — กด Reload','busy')}}
    }).subscribe();
  }
  async function initAnalysis(expectedType,projectAdapter){
    adapter=projectAdapter;try{
      await requireSession();currentMembership=await membership();const id=projectId();if(!id)throw new Error('Project ID is missing. Open this page from Workspace.');
      currentProject=await loadProject(id);if(currentProject.analysis_type!==expectedType)throw new Error('This project belongs to another analysis type.');
      injectDock();setStatus('กำลังโหลดงาน...','busy');
      if(currentProject.base_data&&Object.keys(currentProject.base_data).length)await adapter.restore(currentProject.base_data,currentProject.user_state||{});
      applyViewerLock();installAutoSave();subscribe();setStatus(roleCanEdit()?'เชื่อมต่อแล้ว':'โหมดดูอย่างเดียว','ok');
      document.title=`${currentProject.name} — ${document.title}`;
    }catch(error){console.error(error);alert(`Cloud workspace error: ${error.message}`);if(/Authentication|required|Project ID/.test(error.message))location.replace(indexUrl())}
  }
  async function history(){
    if(!currentProject)return;$('solarCloudModal').classList.add('open');$('solarCloudLogs').textContent='Loading...';
    const {data,error}=await getClient().from('activity_logs').select('action,details,created_at,profiles!activity_logs_actor_id_fkey(display_name,email)').eq('project_id',currentProject.id).order('created_at',{ascending:false}).limit(50);
    $('solarCloudLogs').innerHTML=error?`<div>${esc(error.message)}</div>`:(data||[]).map(log=>`<div class="log"><b>${esc(log.action)}</b> · ${esc(log.profiles?.display_name||log.profiles?.email||'User')}<div>${esc(JSON.stringify(log.details||{}))}</div><time>${new Date(log.created_at).toLocaleString()}</time></div>`).join('')||'<div>No activity yet.</div>';
  }
  global.SolarCloud={CONFIG,getClient,session,requireSession,membership,listProjects,createProject,analysisUrl,signIn,signOut,loadProject,initAnalysis,scheduleSave,saveNow:()=>save('manual'),history,back:()=>location.assign(indexUrl()),roleCanEdit};
})(window);
