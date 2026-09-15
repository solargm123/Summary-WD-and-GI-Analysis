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

  function ensureDialogStyle(){
    if($('solarAppDialogStyle'))return;
    const style=document.createElement('style');style.id='solarAppDialogStyle';style.textContent=
      '#solarAppDialog{position:fixed;inset:0;z-index:20000;background:#020617c7;display:grid;place-items:center;padding:20px;font-family:Bai Jamjuree,sans-serif;backdrop-filter:blur(5px)}#solarAppDialog .sad-card{width:min(480px,100%);background:linear-gradient(160deg,#1e293b,#111c30);color:#f8fafc;border:1px solid #475569;border-radius:18px;padding:22px;box-shadow:0 28px 80px #0009}#solarAppDialog .sad-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:13px;background:#38bdf820;color:#7dd3fc;font-size:22px;margin-bottom:12px}#solarAppDialog[data-tone=danger] .sad-icon{background:#fb718520;color:#fda4af}#solarAppDialog[data-tone=success] .sad-icon{background:#34d39920;color:#6ee7b7}#solarAppDialog h3{font-size:18px;margin:0 0 7px}#solarAppDialog .sad-message{white-space:pre-line;color:#cbd5e1;font-size:13px;line-height:1.65;margin-bottom:14px}#solarAppDialog .sad-field{display:block;margin:12px 0}#solarAppDialog .sad-field>span{display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:#e2e8f0}#solarAppDialog input:not([type=checkbox]),#solarAppDialog select{width:100%;border:1px solid #475569;background:#0f172a;color:#fff;border-radius:9px;padding:10px 11px;font:500 13px Bai Jamjuree,sans-serif;outline:none}#solarAppDialog input:focus,#solarAppDialog select:focus{border-color:#38bdf8;box-shadow:0 0 0 3px #38bdf820}#solarAppDialog .sad-check{display:flex;gap:9px;align-items:flex-start;padding:11px;border:1px solid #475569;border-radius:10px;background:#0f172a;color:#e2e8f0;font-size:12px;line-height:1.5;cursor:pointer}#solarAppDialog .sad-check input{margin-top:3px;accent-color:#38bdf8}#solarAppDialog .sad-error{min-height:18px;color:#fda4af;font-size:11px;margin-top:6px}#solarAppDialog .sad-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}#solarAppDialog button{border:1px solid #475569;border-radius:9px;padding:9px 14px;font:600 12px Bai Jamjuree,sans-serif;cursor:pointer}#solarAppDialog .sad-cancel{background:#1e293b;color:#cbd5e1}#solarAppDialog .sad-confirm{background:#0ea5e9;border-color:#38bdf8;color:#06263a}#solarAppDialog[data-tone=danger] .sad-confirm{background:#e11d48;border-color:#fb7185;color:#fff}';
    document.head.appendChild(style);
  }
  function dialog(options={}){
    ensureDialogStyle();const old=$('solarAppDialog');if(old)old.remove();const fields=Array.isArray(options.fields)?options.fields:[];
    const overlay=document.createElement('div');overlay.id='solarAppDialog';overlay.dataset.tone=options.tone||'default';
    const fieldHtml=fields.map(field=>{const key=esc(field.key||'value'),label=esc(field.label||''),required=field.required?' data-required="true"':'';
      if(field.type==='checkbox')return '<label class="sad-check"><input type="checkbox" data-dialog-field="'+key+'"'+required+(field.checked?' checked':'')+'><span>'+label+'</span></label>';
      if(field.type==='select'){const opts=(field.options||[]).map(option=>{const value=typeof option==='string'?option:option.value,text=typeof option==='string'?option:option.label;return '<option value="'+esc(value)+'"'+(String(value)===String(field.value??'')?' selected':'')+'>'+esc(text)+'</option>'}).join('');return '<label class="sad-field"><span>'+label+'</span><select data-dialog-field="'+key+'"'+required+'>'+opts+'</select></label>'}
      return '<label class="sad-field"><span>'+label+'</span><input type="'+(field.type==='password'?'password':'text')+'" data-dialog-field="'+key+'" value="'+esc(field.value??'')+'" placeholder="'+esc(field.placeholder||'')+'"'+required+'></label>'
    }).join('');
    const hasCancel=options.cancelText!==null;overlay.innerHTML='<form class="sad-card"><div class="sad-icon">'+esc(options.icon||(options.tone==='danger'?'!':'✓'))+'</div><h3>'+esc(options.title||'แจ้งเตือน')+'</h3><div class="sad-message">'+esc(options.message||'')+'</div>'+fieldHtml+'<div class="sad-error"></div><div class="sad-actions">'+(hasCancel?'<button type="button" class="sad-cancel">'+esc(options.cancelText||'ยกเลิก')+'</button>':'')+'<button type="submit" class="sad-confirm">'+esc(options.confirmText||'ตกลง')+'</button></div></form>';document.body.appendChild(overlay);
    return new Promise(resolve=>{const finish=value=>{document.removeEventListener('keydown',onKey);overlay.remove();resolve(value)},onKey=event=>{if(event.key==='Escape'&&hasCancel)finish(null)};document.addEventListener('keydown',onKey);
      if(hasCancel){overlay.querySelector('.sad-cancel').onclick=()=>finish(null);overlay.onclick=event=>{if(event.target===overlay)finish(null)}}
      overlay.querySelector('form').onsubmit=event=>{event.preventDefault();const values={},error=overlay.querySelector('.sad-error');for(const field of fields){const input=overlay.querySelector('[data-dialog-field="'+CSS.escape(String(field.key||'value'))+'"]'),value=field.type==='checkbox'?input.checked:input.value;if(field.required&&((field.type==='checkbox'&&!value)||(field.type!=='checkbox'&&!String(value).trim()))){error.textContent=field.error||'กรุณากรอกหรือยืนยันข้อมูลให้ครบ';input.focus();return}values[field.key||'value']=value}finish(values)};
      setTimeout(()=>overlay.querySelector('input:not([type=checkbox]),select,.sad-confirm')?.focus(),0)
    })
  }
  async function notice(title,message,tone='default'){await dialog({title,message,tone,cancelText:null})}
  async function confirmDialog(title,message,options={}){return !!(await dialog({title,message,tone:options.tone||'default',icon:options.icon,confirmText:options.confirmText||'ยืนยัน',cancelText:options.cancelText||'ยกเลิก',fields:options.fields||[]}))}



  let interfaceLanguage=localStorage.getItem('fusionLanguage')||'th';
  function setLanguage(language){
    interfaceLanguage=language==='en'?'en':'th';localStorage.setItem('fusionLanguage',interfaceLanguage);
    document.querySelectorAll('[data-solar-th][data-solar-en]').forEach(node=>{node.textContent=interfaceLanguage==='th'?node.dataset.solarTh:node.dataset.solarEn});
    document.documentElement.lang=interfaceLanguage;
  }
  function getLanguage(){return interfaceLanguage}

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
    const working=[],prRecords=[],months=new Set(),plants={},dates=new Set(),seen=new Set(),sourceFiles=[];
    for(const file of Array.from(files||[])){
      sourceFiles.push(file.name);const buffer=await file.arrayBuffer();const workbook=global.XLSX.read(buffer,{type:'array'});const fallbackDate=fileDate(file.name);
      workbook.SheetNames.forEach(sheetName=>{
        const rows=sheetRows(workbook.Sheets[sheetName]);if(!rows.length)return;
        let header=-1,idx={plant:-1,cap:-1,pv:-1,specific:-1,loss:-1,irr:-1,theory:-1},date=fallbackDate;
        for(let r=0;r<Math.min(rows.length,30);r++){
          const candidate={plant:-1,cap:-1,pv:-1,specific:-1,loss:-1,irr:-1,theory:-1};
          (rows[r]||[]).forEach((cell,c)=>{const h=normalizedHeader(cell);const dm=String(cell??'').match(/\d{4}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./]\d{4}/);if(dm&&!date){const p=dm[0].split(/[-./]/);date=p[0].length===4?`${p[0]}-${p[1]}-${p[2]}`:`${p[2]}-${p[1]}-${p[0]}`}
            if(candidate.plant<0&&(h.includes('plant name')||h==='plant'||h==='station'||h.includes('ชื่อสถานี')||h.includes('ชื่อโครงการ')))candidate.plant=c;
            if(candidate.cap<0&&(h.includes('capacity')||h.includes('kwp')))candidate.cap=c;
            if(candidate.pv<0&&(h==='pv yield (kwh)'||h.startsWith('pv yield')||h.includes('พลังงาน pv')))candidate.pv=c;
            if(candidate.specific<0&&h.includes('specific energy'))candidate.specific=c;
            if(candidate.loss<0&&(h.includes('loss due to export limitation')||h.includes('loss due export')||h.includes('พลังงานสูญเสียจากการจำกัด')))candidate.loss=c;
            if(candidate.irr<0&&(h.includes('irradiation')||h.includes('irradiance')||h.includes('kwh/㎡')||h.includes('kwh/m²')))candidate.irr=c;
            if(candidate.theory<0&&h.includes('theoretical yield'))candidate.theory=c;
          });
          if(candidate.plant>=0&&(candidate.cap>=0||candidate.pv>=0||candidate.irr>=0)){header=r;idx=candidate;break}
        }
        if(header<0)return;const month=date?.slice(0,7)||null;const day=date?Number(date.slice(8,10)):null;
        for(let r=header+1;r<rows.length;r++){
          const row=rows[r]||[],name=String(row[idx.plant]??'').replace(/\s+/g,' ').trim();if(!name||/total|รวม|plant name/i.test(name))continue;
          const cap=idx.cap>=0?numeric(row[idx.cap]):0,pv=idx.pv>=0?numeric(row[idx.pv]):0,specific=idx.specific>=0?numeric(row[idx.specific]):(cap>0?pv/cap:0),loss=idx.loss>=0?numeric(row[idx.loss]):0,irr=idx.irr>=0?numeric(row[idx.irr]):0,theoretical=idx.theory>=0?numeric(row[idx.theory]):cap*irr;
          if(month&&idx.pv>=0){const key=`${month}|${day??'none'}|${name.toLowerCase()}`;if(!seen.has(key)){seen.add(key);working.push({fileName:file.name,name,cap,pv,specEnergy:specific,loss,recordDay:day,monthKey:month});prRecords.push({fileName:file.name,project:name,date,capacity:cap,gi:irr,specific,theoretical,pv,loss});months.add(month)}}
          if(date&&idx.irr>=0){if(!plants[name])plants[name]={capacity:cap,note:'',dates:{}};if(cap>0)plants[name].capacity=cap;plants[name].dates[date]=numeric(row[idx.irr]);dates.add(date)}
        }
      });
    }
    if(!working.length&&!Object.keys(plants).length)throw new Error('No valid shared data was found in the selected file(s).');
    return {working_day:{records:working,detectedMonths:[...months].sort().reverse()},global_irradiance:{plants,dates:[...dates].sort(),sourceFiles},pr_report:{records:prRecords,sourceFiles},sourceFiles};
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
    const dock=document.createElement('div');dock.id='solarCloudDock';dock.innerHTML=`<button onclick="SolarCloud.back()"><i class="fa-solid fa-arrow-left"></i><span data-solar-th="หน้าหลัก" data-solar-en="Center">หน้าหลัก</span></button><span id="solarCloudDot"></span><span id="solarCloudStatus">กำลังเชื่อมต่อ...</span><span class="solar-cloud-viewer">${editLockLabel()}</span><button id="solarConflictButton" style="display:none" onclick="SolarCloud.resolveConflict()"><i class="fa-solid fa-triangle-exclamation"></i><span data-solar-th="ข้อมูลชนกัน" data-solar-en="Conflict">ข้อมูลชนกัน</span></button><button onclick="SolarCloud.datasets()"><i class="fa-solid fa-database"></i><span data-solar-th="ชุดข้อมูล" data-solar-en="Shared Data">ชุดข้อมูล</span></button><button onclick="SolarCloud.history()"><i class="fa-solid fa-clock-rotate-left"></i><span data-solar-th="ประวัติ" data-solar-en="History">ประวัติ</span></button><button onclick="location.reload()"><i class="fa-solid fa-rotate-right"></i><span data-solar-th="โหลดใหม่" data-solar-en="Reload">โหลดใหม่</span></button><button onclick="SolarCloud.saveNow()" ${roleCanEdit()?'':'disabled'}><i class="fa-solid fa-floppy-disk"></i><span data-solar-th="บันทึก" data-solar-en="Save">บันทึก</span></button>`;document.body.appendChild(dock);setLanguage(interfaceLanguage);
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
    document.addEventListener('change',event=>{if(event.target.closest('#solarCloudDock,#solarCloudModal,#solarAppDialog'))return;scheduleSave('field_change')},true);
    document.addEventListener('click',event=>{const target=event.target.closest('button');if(target&&!target.closest('#solarCloudDock,#solarCloudModal,#solarAppDialog'))setTimeout(()=>scheduleSave('action'),50)},true);
    const fileInput=$('excelFileInput')||$('fileInput');if(fileInput)fileInput.addEventListener('change',event=>{const files=Array.from(event.target.files||[]);[2500,5000,10000].forEach(ms=>setTimeout(()=>scheduleSave('file_import'),ms));if(files.length&&roleCanEdit())setTimeout(()=>saveSharedDataset(files).catch(error=>{console.error(error);setStatus('สร้าง Shared Data ไม่สำเร็จ','error');notice('สร้าง Shared Data ไม่สำเร็จ',error.message,'danger')}),300)});
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
    }catch(error){console.error(error);await notice('ไม่สามารถเปิดงานได้',error.message,'danger');if(/Authentication|required|Project ID/.test(error.message))location.replace(indexUrl())}
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
    }catch(error){notice('ดาวน์โหลดข้อมูลสำรองไม่สำเร็จ',error.message,'danger')}
  }
  async function reloadLatest(){
    const ok=await confirmDialog('โหลดข้อมูลล่าสุด','ข้อมูลที่ยังไม่บันทึกในหน้านี้จะหายไป แนะนำให้ดาวน์โหลดข้อมูลที่แก้ไขเก็บไว้ก่อน',{tone:'danger',icon:'↻',confirmText:'โหลดข้อมูลล่าสุด'});if(!ok)return;
    dirty=false;setConflictState(false);location.reload();
  }
  function resolveConflict(){
    if(!currentProject)return;
    $('solarCloudModalBox').querySelector('h3').textContent='จัดการข้อมูลที่แก้ไขพร้อมกัน';
    $('solarCloudModal').classList.add('open');
    $('solarCloudLogs').innerHTML=`<div class="log"><b>พบข้อมูลเวอร์ชันใหม่ในระบบ</b><div>แนะนำให้ดาวน์โหลดข้อมูลที่กำลังแก้ไขเก็บไว้ก่อน แล้วจึงโหลดข้อมูลล่าสุด</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button onclick="SolarCloud.downloadLocalDraft()">ดาวน์โหลดข้อมูลที่ยังไม่บันทึก</button><button onclick="SolarCloud.reloadLatest()">โหลดข้อมูลล่าสุด</button></div>`;
  }
  function projectActivityText(log){const d=log.details||{},title={create:'สร้างงาน',save:'บันทึกการแก้ไข',archive:'เก็บงานออกจากรายการ',restore:'กู้คืนงาน',project_metadata_update:'แก้ไขชื่อหรือสถานะ',attach_dataset:'เชื่อมชุดข้อมูล'}[log.action]||'มีการใช้งานระบบ';let detail='ดำเนินการเรียบร้อย';if(log.action==='save')detail=`บันทึกครั้งที่ ${Number(d.version||0)}`;if(log.action==='create')detail='สร้างงานวิเคราะห์ใหม่';if(log.action==='attach_dataset')detail=`เชื่อมชุดข้อมูล “${d.dataset_name||'—'}”`;if(log.action==='project_metadata_update')detail=`เปลี่ยนชื่อหรือสถานะเป็น ${d.new_status||'สถานะใหม่'}`;return {title,detail}}
  async function history(){
    if(!currentProject)return;$('solarCloudModalBox').querySelector('h3').textContent='ประวัติการใช้งาน';$('solarCloudModal').classList.add('open');$('solarCloudLogs').textContent='กำลังโหลด...';
    const {data,error}=await getClient().from('activity_logs').select('action,details,created_at,profiles!activity_logs_actor_id_fkey(display_name,email)').eq('project_id',currentProject.id).order('created_at',{ascending:false}).limit(50);
    $('solarCloudLogs').innerHTML=error?`<div>${esc(error.message)}</div>`:(data||[]).map(log=>{const copy=projectActivityText(log);return `<div class="log"><b>${esc(copy.title)}</b> · ${esc(log.profiles?.display_name||log.profiles?.email||'ผู้ใช้')}<div>${esc(copy.detail)}</div><time>${new Date(log.created_at).toLocaleString('th-TH')}</time></div>`}).join('')||'<div>ยังไม่มีประวัติการใช้งาน</div>';
  }
  async function datasets(){
    $('solarCloudModalBox').querySelector('h3').textContent='Shared Data';$('solarCloudModal').classList.add('open');$('solarCloudLogs').textContent='Loading...';
    try{const rows=await listDatasets();$('solarCloudLogs').innerHTML=rows.map(ds=>`<div class="log"><b>${esc(ds.name)}</b><div>${esc((ds.source_files||[]).join(', '))}</div><time>${new Date(ds.updated_at).toLocaleString()}</time>${roleCanEdit()?`<button onclick="SolarCloud.useDataset('${ds.id}')">ใช้กับงานนี้</button>`:''}</div>`).join('')||'<div>ยังไม่มี Shared Data — อัปโหลด Excel ในหน้าวิเคราะห์หนึ่งครั้งเพื่อสร้าง</div>'}catch(error){$('solarCloudLogs').textContent=error.message}
  }
  async function useDataset(id){try{const rows=await listDatasets(),ds=rows.find(item=>item.id===id);await attachDataset(ds);$('solarCloudModal').classList.remove('open')}catch(error){notice('ใช้ Shared Data ไม่สำเร็จ',error.message,'danger')}}
  const CENTRAL_PROJECT_NAMES={working_day:'System · Working Day',global_irradiance:'System · Global Irradiance',pr_report:'System · PR Report'};
  function centralName(value){return String(value||'').toLowerCase().normalize('NFKC').replace(/\b(company|public|limited|co|ltd|thailand|plc)\b/g,' ').replace(/บริษัท|จำกัด|มหาชน/g,' ').replace(/[^a-z0-9ก-๙]+/g,' ').replace(/\s+/g,' ').trim()}
  function nameScore(a,b){a=centralName(a);b=centralName(b);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return Math.min(a.length,b.length)/Math.max(a.length,b.length)+.30;const pairs=x=>{const out=[];for(let i=0;i<x.length-1;i++)out.push(x.slice(i,i+2));return out},aa=pairs(a),bb=pairs(b);let hit=0,copy=[...bb];for(const x of aa){const i=copy.indexOf(x);if(i>=0){hit++;copy.splice(i,1)}}return aa.length+bb.length?2*hit/(aa.length+bb.length):0}
  function projectCatalog(data){const map=new Map();for(const r of data?.pr_report?.records||[]){const item=map.get(r.project)||{name:r.project,capacity:0,lastDate:''};if(Number(r.capacity)>0)item.capacity=Number(r.capacity);if(String(r.date)>item.lastDate)item.lastDate=String(r.date);map.set(r.project,item)}for(const r of data?.working_day?.records||[]){if(!map.has(r.name))map.set(r.name,{name:r.name,capacity:Number(r.cap)||0,lastDate:r.monthKey||''})}return[...map.values()]}
  function renameCentralProject(data,from,to){if(!data||!from||!to||from===to)return data;const same=v=>String(v||'').toLowerCase()===String(from).toLowerCase();for(const r of data.working_day?.records||[])if(same(r.name))r.name=to;for(const r of data.pr_report?.records||[])if(same(r.project))r.project=to;const plants=data.global_irradiance?.plants||{};for(const key of Object.keys(plants))if(same(key)){const target=plants[to]||{capacity:0,note:'',dates:{}};plants[to]={...target,...plants[key],dates:{...(target.dates||{}),...(plants[key].dates||{})}};if(key!==to)delete plants[key]}return data}
  function applyKnownAliases(data,aliases){for(const [alias,canonical] of Object.entries(aliases||{}))renameCentralProject(data,alias,canonical);return data}
  function mergeCentralData(previous,next){
    const old=previous&&typeof previous==='object'?previous:{},fresh=next&&typeof next==='object'?next:{},aliases={...(old.projectAliases||{}),...(fresh.projectAliases||{})};applyKnownAliases(old,aliases);applyKnownAliases(fresh,aliases);
    const merged={working_day:{records:[],detectedMonths:[]},global_irradiance:{plants:{},dates:[],sourceFiles:[]},pr_report:{records:[],sourceFiles:[]},sourceFiles:[...new Set([...(old.sourceFiles||[]),...(fresh.sourceFiles||[])])],projectAliases:aliases};
    const wd=new Map();[...(old.working_day?.records||[]),...(fresh.working_day?.records||[])].forEach(r=>wd.set(`${r.monthKey||''}|${r.recordDay??''}|${String(r.name||'').toLowerCase()}`,r));merged.working_day.records=[...wd.values()];merged.working_day.detectedMonths=[...new Set(merged.working_day.records.map(r=>r.monthKey).filter(Boolean))].sort().reverse();
    for(const source of [old.global_irradiance?.plants||{},fresh.global_irradiance?.plants||{}])for(const [name,plant] of Object.entries(source)){if(!merged.global_irradiance.plants[name])merged.global_irradiance.plants[name]={capacity:0,note:'',dates:{}};Object.assign(merged.global_irradiance.plants[name],plant,{dates:{...merged.global_irradiance.plants[name].dates,...(plant.dates||{})}})}
    merged.global_irradiance.dates=[...new Set(Object.values(merged.global_irradiance.plants).flatMap(p=>Object.keys(p.dates||{})))].sort();merged.global_irradiance.sourceFiles=merged.sourceFiles;
    const pr=new Map();[...(old.pr_report?.records||[]),...(fresh.pr_report?.records||[])].forEach(r=>pr.set(`${r.date||''}|${String(r.project||'').toLowerCase()}`,r));merged.pr_report.records=[...pr.values()].sort((x,y)=>String(x.date).localeCompare(String(y.date))||String(x.project).localeCompare(String(y.project)));merged.pr_report.sourceFiles=merged.sourceFiles;return merged;
  }
  async function ensureCentralProject(type){const m=currentMembership||await membership(),name=CENTRAL_PROJECT_NAMES[type];if(!name)throw new Error('Unknown analysis type.');const {data,error}=await getClient().from('analysis_projects').select('*').eq('workspace_id',m.workspace_id).eq('analysis_type',type).is('deleted_at',null).order('updated_at',{ascending:false});if(error)throw error;let project=(data||[]).find(p=>p.name===name);if(!project){if(!['admin','editor'].includes(m.role))throw new Error('พื้นที่วิเคราะห์กลางยังไม่ถูกสร้าง กรุณาให้ Admin หรือ Editor เปิดเครื่องมือนี้ครั้งแรก');const id=await createProject(type,name);project=await loadProject(id)}return project}
  async function centralDatasetStatus(){const m=currentMembership||await membership(),rows=await listDatasets(),dataset=rows[0]||null,normalized=dataset?.normalized_data||{},pr=normalized.pr_report?.records||[],wd=normalized.working_day?.records||[],gi=normalized.global_irradiance||{},allDates=[...new Set([...pr.map(r=>r.date),...(gi.dates||[])].filter(Boolean))].sort(),plants=new Set([...pr.map(r=>r.project),...wd.map(r=>r.name),...Object.keys(gi.plants||{})].filter(Boolean));return{membership:m,dataset,files:dataset?.source_files||normalized.sourceFiles||[],projectCount:plants.size,recordCount:Math.max(pr.length,wd.length),dateStart:allDates[0]||null,dateEnd:allDates.at(-1)||null,aliasCount:Object.keys(normalized.projectAliases||{}).length}}
  async function prepareCentralUpload(files){
    const m=currentMembership||await membership();if(!['admin','editor'].includes(m.role))throw new Error('Viewer cannot upload or replace central data.');if(!files?.length)throw new Error('Please select at least one Excel file.');
    const fresh=await normalizeUpload(files),rows=await listDatasets(),existing=rows[0]||null,previous=structuredClone(existing?.normalized_data||{}),aliases=previous.projectAliases||{};applyKnownAliases(fresh,aliases);
    const oldProjects=projectCatalog(previous),newProjects=projectCatalog(fresh),oldNames=new Set(oldProjects.map(x=>x.name.toLowerCase())),candidates=[];
    for(const incoming of newProjects){if(oldNames.has(incoming.name.toLowerCase())||aliases[incoming.name])continue;let best=null;for(const older of oldProjects){const score=nameScore(incoming.name,older.name);if(score>=.58&&(!best||score>best.score))best={oldName:older.name,newName:incoming.name,score,oldCapacity:older.capacity,newCapacity:incoming.capacity,oldLastDate:older.lastDate,newLastDate:incoming.lastDate}}if(best)candidates.push(best)}
    return{fresh,previous,existingId:existing?.id||null,candidates,files:Array.from(files).map(x=>x.name)};
  }
  async function commitCentralUpload(prepared,resolutions=[]){
    const m=currentMembership||await membership(),previous=prepared.previous||{},fresh=prepared.fresh||{},aliases={...(previous.projectAliases||{})};
    for(const choice of resolutions){if(choice.action==='use_new'){renameCentralProject(previous,choice.oldName,choice.newName);aliases[choice.oldName]=choice.newName}else if(choice.action==='keep_old'){renameCentralProject(fresh,choice.newName,choice.oldName);aliases[choice.newName]=choice.oldName}}
    previous.projectAliases=aliases;fresh.projectAliases=aliases;const merged=mergeCentralData(previous,fresh),fingerprint=`central-data-hub:${m.workspace_id}`;
    const {data,error}=await getClient().rpc('upsert_shared_dataset',{p_workspace:m.workspace_id,p_name:'Central Data Hub',p_fingerprint:fingerprint,p_source_files:merged.sourceFiles,p_normalized_data:merged});if(error)throw error;
    for(const type of Object.keys(CENTRAL_PROJECT_NAMES)){const project=await ensureCentralProject(type),attached=await getClient().rpc('attach_dataset_to_project',{p_project_id:project.id,p_dataset_id:data.id});if(attached.error)throw attached.error}return{dataset:data,normalized:merged,summary:await centralDatasetStatus()}
  }

  async function fileFingerprint(file){
    const bytes=await file.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function prepareCentralBatchUpload(files,onProgress){
    const list=Array.from(files||[]),m=currentMembership||await membership();
    if(!['admin','editor'].includes(m.role))throw new Error('Viewer cannot upload or replace central data.');
    if(!list.length)throw new Error('Please select at least one Excel file.');
    const rows=await listDatasets(),existing=rows[0]||null,previous=structuredClone(existing?.normalized_data||{}),aliases=previous.projectAliases||{},payloads=[];let fresh={};
    for(let i=0;i<list.length;i++){
      const file=list[i];onProgress?.({stage:'reading',current:i+1,total:list.length,file:file.name});
      try{
        const normalized=await normalizeUpload([file]);applyKnownAliases(normalized,aliases);
        const fingerprint=await fileFingerprint(file);payloads.push({file,fileName:file.name,fingerprint,normalized,error:null});
        fresh=mergeCentralData(fresh,normalized);
      }catch(error){payloads.push({file,fileName:file.name,fingerprint:null,normalized:null,error:error.message||String(error)})}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const oldProjects=projectCatalog(previous),newProjects=projectCatalog(fresh),oldNames=new Set(oldProjects.map(x=>x.name.toLowerCase())),candidates=[];
    for(const incoming of newProjects){if(oldNames.has(incoming.name.toLowerCase())||aliases[incoming.name])continue;let best=null;for(const older of oldProjects){const score=nameScore(incoming.name,older.name);if(score>=.58&&(!best||score>best.score))best={oldName:older.name,newName:incoming.name,score,oldCapacity:older.capacity,newCapacity:incoming.capacity,oldLastDate:older.lastDate,newLastDate:incoming.lastDate}}if(best)candidates.push(best)}
    return{fresh,previous,existingId:existing?.id||null,candidates,files:list.map(x=>x.name),payloads};
  }
  async function commitCentralBatchUpload(prepared,resolutions=[],onProgress){
    const m=currentMembership||await membership(),aliases={...(prepared.previous?.projectAliases||{})},dbAliases={};
    for(const choice of resolutions){
      if(choice.action==='use_new'){aliases[choice.oldName]=choice.newName;dbAliases[choice.newName]=choice.oldName}
      else if(choice.action==='keep_old'){aliases[choice.newName]=choice.oldName;dbAliases[choice.newName]=choice.oldName}
    }
    const started=await getClient().rpc('begin_central_import',{p_workspace:m.workspace_id,p_total_files:prepared.payloads.length});if(started.error)throw started.error;
    const batchId=started.data,failed=[];let inserted=0,updated=0,duplicates=0;
    for(let i=0;i<prepared.payloads.length;i++){
      const item=prepared.payloads[i];onProgress?.({stage:'saving',current:i+1,total:prepared.payloads.length,file:item.fileName,failed:failed.length,duplicates});
      if(item.error){failed.push({file:item.fileName,error:item.error});continue}
      try{
        const records=item.normalized?.pr_report?.records||[],recordDate=records.find(x=>x.date)?.date||fileDate(item.fileName);
        const registered=await getClient().rpc('register_central_import_file',{p_workspace:m.workspace_id,p_batch:batchId,p_file_name:item.fileName,p_fingerprint:item.fingerprint,p_record_date:recordDate||null});
        if(registered.error)throw registered.error;
        if(registered.data?.duplicate){duplicates++;continue}
        const fileId=registered.data.file_id,uploadRows=records.map(r=>({...r,fingerprint:item.fingerprint}));
        for(let p=0;p<uploadRows.length;p+=250){
          const saved=await getClient().rpc('upsert_central_daily_batch',{p_workspace:m.workspace_id,p_batch:batchId,p_file:fileId,p_rows:uploadRows.slice(p,p+250),p_aliases:dbAliases});
          if(saved.error)throw saved.error;inserted+=Number(saved.data?.inserted||0);updated+=Number(saved.data?.updated||0);
        }
      }catch(error){failed.push({file:item.fileName,error:error.message||String(error)})}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const completed=await getClient().rpc('complete_central_import',{p_workspace:m.workspace_id,p_batch:batchId});if(completed.error)throw completed.error;
    const preparedLegacy={...prepared,previous:prepared.previous,fresh:prepared.fresh};
    const legacy=await commitCentralUpload(preparedLegacy,resolutions);
    return{...legacy,batch:completed.data,batchId,failed,inserted,updated,duplicates};
  }
  async function uploadCentralDataset(files){const prepared=await prepareCentralUpload(files);return commitCentralUpload(prepared,prepared.candidates.map(x=>({...x,action:'separate'})))}
  async function openCentralAnalysis(type){const project=await ensureCentralProject(type),rows=await listDatasets(),dataset=rows[0]||null;if(dataset&&project.dataset_id!==dataset.id){const {error}=await getClient().rpc('attach_dataset_to_project',{p_project_id:project.id,p_dataset_id:dataset.id});if(error)throw error}location.href=analysisUrl(project)}
  global.SolarCloud={CONFIG,dialog,notice,confirmDialog,setLanguage,getLanguage,getClient,session,requireSession,membership,listProjects,createProject,analysisUrl,signIn,signOut,loadProject,initAnalysis,scheduleSave,saveNow:()=>save('manual'),history,datasets,useDataset,resolveConflict,downloadLocalDraft,reloadLatest,back:()=>location.assign(indexUrl()),roleCanEdit,roleCanAdmin,centralDatasetStatus,prepareCentralUpload,commitCentralUpload,prepareCentralBatchUpload,commitCentralBatchUpload,uploadCentralDataset,openCentralAnalysis};
})(window);
