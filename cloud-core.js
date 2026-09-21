(function(global){
  'use strict';
  const CONFIG={
    url:'https://lncoukvtjsgpeyhotukh.supabase.co',
    key:'sb_publishable_pkp8EP-vx61lX7IdF8BDVw_JxgQU0tS',
    siteRoot:'https://solargm123.github.io/Summary-WD-and-GI-Analysis/'
  };
  let client=null,currentProject=null,currentMembership=null,adapter=null,saveTimer=null,dirty=false,saving=false,conflict=false,channel=null,presenceUsers=[],presenceSession=null,lastPresenceArea='',lastSharedState={},pendingFieldConflict=null,remoteSyncTimer=null;
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
  function analysisUrl(project){const page=project.analysis_type==='working_day'?'working-day-analysis.html':project.analysis_type==='global_irradiance'?'global-irradiance-analysis.html':'pr-report.html';return `${page}?v=20260915-wd-header-visible1&project=${encodeURIComponent(project.id)}`}
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
        let header=-1,idx={plant:-1,address:-1,cap:-1,pv:-1,specific:-1,loss:-1,irr:-1,theory:-1},date=fallbackDate;
        for(let r=0;r<Math.min(rows.length,30);r++){
          const candidate={plant:-1,address:-1,cap:-1,pv:-1,specific:-1,loss:-1,irr:-1,theory:-1};
          (rows[r]||[]).forEach((cell,c)=>{const h=normalizedHeader(cell);const dm=String(cell??'').match(/\d{4}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./]\d{4}/);if(dm&&!date){const p=dm[0].split(/[-./]/);date=p[0].length===4?`${p[0]}-${p[1]}-${p[2]}`:`${p[2]}-${p[1]}-${p[0]}`}
            if(candidate.plant<0&&(h.includes('plant name')||h==='plant'||h==='station'||h.includes('ชื่อสถานี')||h.includes('ชื่อโครงการ')))candidate.plant=c;
            if(candidate.address<0&&(h==='address'||h.includes('plant address')||h.includes('ที่อยู่')))candidate.address=c;
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
          const address=idx.address>=0?String(row[idx.address]??'').replace(/\s+/g,' ').trim():'';
          const cap=idx.cap>=0?numeric(row[idx.cap]):0,pv=idx.pv>=0?numeric(row[idx.pv]):0,specific=idx.specific>=0?numeric(row[idx.specific]):(cap>0?pv/cap:0),loss=idx.loss>=0?numeric(row[idx.loss]):0,irr=idx.irr>=0?numeric(row[idx.irr]):0,theoretical=idx.theory>=0?numeric(row[idx.theory]):cap*irr;
          if(month&&idx.pv>=0){const key=`${month}|${day??'none'}|${name.toLowerCase()}`;if(!seen.has(key)){seen.add(key);working.push({fileName:file.name,name,cap,pv,specEnergy:specific,loss,recordDay:day,monthKey:month});prRecords.push({fileName:file.name,project:name,address,date,capacity:cap,gi:irr,specific,theoretical,pv,loss});months.add(month)}}
          if(date&&idx.irr>=0){if(!plants[name])plants[name]={capacity:cap,address,province:'',note:'',dates:{}};if(cap>0)plants[name].capacity=cap;if(address)plants[name].address=address;plants[name].dates[date]=numeric(row[idx.irr]);dates.add(date)}
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
    Array.from(document.body.childNodes).forEach(node=>{
      if(node.nodeType===Node.TEXT_NODE&&/^(?:\s|\\[nrt])+$/i.test(node.textContent||''))node.remove();
    });
    const style=document.createElement('style');style.textContent=`
      #solarCloudDock{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:7px;width:max-content;max-width:100%;margin:0 auto;padding:7px 9px;background:#102432ee;color:#e8f3f5;border:1px solid #426171;border-radius:12px;box-shadow:0 8px 22px #0003;font:500 11px 'Bai Jamjuree',sans-serif;backdrop-filter:blur(10px);overflow-x:auto;flex-shrink:1}
      .solar-cloud-topbar-host{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;flex:0 1 auto;min-width:0;padding:0 10px;margin-left:auto;box-sizing:border-box;overflow-x:auto}
      @media(max-width:760px){#solarCloudDock{width:max-content;min-width:max-content}.solar-cloud-topbar-host{order:10;flex:1 0 100%;width:100%;padding-top:8px;margin-left:0;justify-content:flex-start}}
      #solarCloudDock button{border:1px solid #ffffff22;background:#ffffff0c;color:#e8f3f5;border-radius:8px;padding:6px 8px;font:600 11px 'Bai Jamjuree',sans-serif;cursor:pointer}#solarCloudDock button:hover{background:#ffffff1d}#solarConflictButton{border-color:#fb7185!important;color:#fecdd3!important;background:#fb71851c!important}
      #solarCloudDot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 0 4px #34d39922}#solarCloudDot[data-state=busy]{background:#fbbf24}#solarCloudDot[data-state=error],#solarCloudDot[data-state=conflict]{background:#fb7185}
      #solarCloudStatus[data-state=error],#solarCloudStatus[data-state=conflict]{color:#fecdd3}.solar-cloud-viewer{color:#fbbf24;font-weight:700}#solarPresenceButton{border-color:#34d39955!important;color:#bbf7d0!important;white-space:nowrap}#solarPresenceButton i{color:#34d399}#solarPresenceButton[data-count="1"]{color:#cbd5e1!important;border-color:#ffffff22!important}
      #solarCloudModal{position:fixed;inset:0;z-index:10000;background:#07151db3;display:none;place-items:center;padding:20px;font-family:'Bai Jamjuree',sans-serif}#solarCloudModal.open{display:grid}
      #solarCloudModalBox{width:min(700px,100%);max-height:80vh;overflow:auto;background:#fff;color:#1e293b;border-radius:14px;padding:18px;box-shadow:0 25px 70px #0007}#solarCloudModalBox h3{margin:0 0 12px}#solarCloudModalBox .log{padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:12px}#solarCloudModalBox time{color:#64748b;font-size:10px;display:block;margin-top:3px}
    `;document.head.appendChild(style);
    const dock=document.createElement('div');dock.id='solarCloudDock';dock.innerHTML=`<button onclick="SolarCloud.back()"><i class="fa-solid fa-arrow-left"></i><span data-solar-th="หน้าหลัก" data-solar-en="Center">หน้าหลัก</span></button><span id="solarCloudDot"></span><span id="solarCloudStatus">กำลังเชื่อมต่อ...</span><button id="solarPresenceButton" data-count="1" onclick="SolarCloud.showPresence()" title="ผู้ใช้งานที่ออนไลน์"><i class="fa-solid fa-user-group"></i> <span id="solarPresenceCount">1</span> <span data-solar-th="ออนไลน์" data-solar-en="online">ออนไลน์</span></button><span class="solar-cloud-viewer">${editLockLabel()}</span><button id="solarConflictButton" style="display:none" onclick="SolarCloud.resolveConflict()"><i class="fa-solid fa-triangle-exclamation"></i><span data-solar-th="ข้อมูลชนกัน" data-solar-en="Conflict">ข้อมูลชนกัน</span></button><button onclick="SolarCloud.history()"><i class="fa-solid fa-clock-rotate-left"></i><span data-solar-th="ประวัติ" data-solar-en="History">ประวัติ</span></button><button onclick="location.reload()"><i class="fa-solid fa-rotate-right"></i><span data-solar-th="โหลดใหม่" data-solar-en="Reload">โหลดใหม่</span></button><button onclick="SolarCloud.saveNow()" ${roleCanEdit()?'':'disabled'}><i class="fa-solid fa-floppy-disk"></i><span data-solar-th="บันทึก" data-solar-en="Save">บันทึก</span></button>`;
    const pageHeader=document.querySelector('header'),host=document.createElement('div');host.className='solar-cloud-topbar-host';host.appendChild(dock);if(pageHeader){const controls=pageHeader.querySelector('.header-controls,#wdHeaderActions'),row=controls?.parentElement||pageHeader;row.insertBefore(host,controls||null)}else document.body.prepend(host);setLanguage(interfaceLanguage);
    const modal=document.createElement('div');modal.id='solarCloudModal';modal.innerHTML='<div id="solarCloudModalBox"><button style="float:right" onclick="document.getElementById(\'solarCloudModal\').classList.remove(\'open\')">✕</button><h3>Activity History</h3><div id="solarCloudLogs">Loading...</div></div>';document.body.appendChild(modal);
  }
  function applyViewerLock(){
    if(roleCanEdit())return;
    const lock=()=>{
      document.querySelectorAll('#excelFileInput,#fileInput,#inputLossFactor,#inputSunHoursCustom,[onchange*="updatePlantCapacity"],[onchange*="updatePlantDays"],[onchange*="updateCalculationMethod"],[onchange*="updateMktEstimate"],[onclick*="openLossModal"],[onclick*="openNoteModal"],#toggleEditBtn,[onclick="resetData()"],.data-irr-input,.data-note-input,.btn-copy,.btn-paste,.btn-restore').forEach(el=>{el.disabled=true;el.style.opacity='.6';el.style.cursor='not-allowed'});
    };lock();new MutationObserver(lock).observe(document.body,{subtree:true,childList:true});
  }
  const cloneJson=value=>JSON.parse(JSON.stringify(value??{}));
  function sharedKeys(type){
    if(type==='working_day')return ['overrides','lossFactor','sunHoursTarget','sunHoursMode','sunHoursCustom'];
    if(type==='global_irradiance')return ['overrides','minIrr','maxIrr'];
    if(type==='pr_report')return ['settings','guarantees','dailyNotes','monthlyNotes','projectNotes'];
    return [];
  }
  function localKeys(type){
    if(type==='working_day')return ['selectedMonth'];
    if(type==='global_irradiance')return ['selectedPlants','selectedTrendPlants','activeStatusFilter','activeProvinceFilter','selectedPeriod','fullDataLoaded','filters'];
    if(type==='pr_report')return ['selectedProject','month','dayMode'];
    return [];
  }
  const localViewStorageKey=()=>currentProject?.id?'solar:last-view:'+currentProject.id:null;
  function loadLocalViewState(){
    const key=localViewStorageKey();if(!key)return{};
    try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'?selectState(value,localKeys(currentProject?.analysis_type)):{}}
    catch(error){console.warn('Cannot restore last view:',error);return{}}
  }
  function saveLocalViewState(){
    const key=localViewStorageKey();if(!key||!adapter)return;
    try{localStorage.setItem(key,JSON.stringify(selectState(adapter.capture().userState||{},localKeys(currentProject?.analysis_type))))}
    catch(error){console.warn('Cannot save last view:',error)}
  }
  function selectState(source,keys){
    const out={};keys.forEach(key=>{if(Object.prototype.hasOwnProperty.call(source||{},key))out[key]=cloneJson(source[key])});return out;
  }
  function sharedState(source){return selectState(source,sharedKeys(currentProject?.analysis_type))}
  function mergeRemoteWithLocal(remote,local){
    const merged=cloneJson(remote||{});
    localKeys(currentProject?.analysis_type).forEach(key=>{if(Object.prototype.hasOwnProperty.call(local||{},key))merged[key]=cloneJson(local[key])});
    return merged;
  }
  function fieldPatches(previous,current,path=[],out=[]){
    if(current&&typeof current==='object'&&!Array.isArray(current)){
      Object.keys(current).forEach(key=>fieldPatches(previous&&typeof previous==='object'?previous[key]:undefined,current[key],[...path,key],out));
      return out;
    }
    if(JSON.stringify(previous)!==JSON.stringify(current))out.push({path,value:current});
    return out;
  }
  const pathId=path=>(path||[]).join('\u001f');
  function pathsOverlap(a,b){const aa=a||[],bb=b||[],n=Math.min(aa.length,bb.length);for(let i=0;i<n;i++)if(aa[i]!==bb[i])return false;return true}
  function pendingPatches(){if(!adapter||!currentProject)return[];return fieldPatches(lastSharedState,sharedState(adapter.capture().userState||{}))}
  function friendlyPath(path){
    const labels={overrides:'ข้อมูลแก้ไข',lossFactor:'Loss Factor',sunHoursTarget:'Sun Hours เป้าหมาย',sunHoursMode:'วิธี Sun Hours',sunHoursCustom:'Sun Hours กำหนดเอง',minIrr:'GI ต่ำสุด',maxIrr:'GI สูงสุด',settings:'เงื่อนไข PR',guarantees:'PR Guarantee',dailyNotes:'Note รายวัน',monthlyNotes:'Note รายเดือน',projectNotes:'Note โครงการ',capacity:'Capacity',note:'Note',dates:'วันที่'};
    return (path||[]).map(x=>labels[x]||x).join(' › ');
  }
  function friendlyValue(value){if(value===undefined)return '—';if(value===null)return 'ไม่มีข้อมูล';if(typeof value==='object')return JSON.stringify(value);return String(value)}
  function showFieldConflict(){
    if(!pendingFieldConflict)return;
    const box=$('solarCloudModalBox');box.querySelector('h3').textContent='มีการแก้ไขช่องเดียวกัน';
    $('solarCloudModal').classList.add('open');
    const rows=(pendingFieldConflict.conflicts||[]).map(item=>`<div class="log"><b>${esc(friendlyPath(item.path))}</b><div style="margin-top:6px">ค่าล่าสุด: <strong>${esc(friendlyValue(item.serverValue))}</strong></div><div>ค่าของคุณ: <strong>${esc(friendlyValue(item.yourValue))}</strong></div></div>`).join('');
    $('solarCloudLogs').innerHTML=rows+`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button onclick="SolarCloud.useLatestConflict()">ใช้ค่าล่าสุด</button><button onclick="SolarCloud.keepMyConflict()">ใช้ค่าของฉัน</button><button onclick="SolarCloud.downloadLocalDraft()">ดาวน์โหลดสำรอง</button></div>`;
  }
  function setProjectFromRpc(value){
    const project=value?.project||value;
    if(project&&project.id)currentProject=project;
    lastSharedState=sharedState(currentProject?.user_state||{});
  }
  async function persistFieldPatches(patches,reason='manual',force=false,clientVersion=null){
    const payload=adapter.capture();
    const {data,error}=await getClient().rpc('save_analysis_field_patches',{
      p_project_id:currentProject.id,
      p_client_version:clientVersion??currentProject.version,
      p_patches:patches,
      p_period_key:payload.periodKey??null,
      p_change_summary:{source:reason,analysis_type:currentProject.analysis_type,save_mode:'field_level'},
      p_force:force
    });
    if(error)throw error;
    if(data?.ok===false){
      pendingFieldConflict={patches,reason,serverVersion:data.serverVersion,conflicts:data.conflicts||[]};
      setConflictState(true);setStatus('แก้ไขช่องเดียวกัน — กรุณาเลือกข้อมูล','conflict');showFieldConflict();return false;
    }
    setProjectFromRpc(data);pendingFieldConflict=null;dirty=false;setConflictState(false);setStatus('บันทึกแล้ว','ok');
    if(channel)channel.send({type:'broadcast',event:'project_saved',payload:{userId:presenceSession?.userId||'',name:presenceSession?.name||'ผู้ใช้อื่น',version:currentProject.version,paths:patches.map(p=>p.path),at:new Date().toISOString()}}).catch(()=>{});
    return true;
  }
  function scheduleSave(reason='edit'){if(!currentProject)return;saveLocalViewState();if(!roleCanEdit())return;dirty=true;setStatus('มีการเปลี่ยนแปลง','busy');clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(reason),1500)}
  async function save(reason='manual'){
    if(!roleCanEdit()||!currentProject||!adapter||saving)return;
    saving=true;setStatus('กำลังบันทึก...','busy');
    try{
      const patches=pendingPatches();
      if(!patches.length){dirty=false;setConflictState(false);setStatus('ไม่มีข้อมูลใหม่ต้องบันทึก','ok');return}
      if(patches.length>1000)throw new Error('มีการแก้ไขมากกว่า 1,000 ช่อง กรุณาบันทึกเป็นช่วงย่อย');
      await persistFieldPatches(patches,reason,false);
    }catch(error){
      const raw=error.message||String(error),friendly=/permission_denied|42501/i.test(raw)?'บัญชีนี้ยังไม่มีสิทธิ์ Editor ใน Workspace':/project_locked_completed/i.test(raw)?'งานนี้ถูกล็อกเป็น Completed':/statement timeout/i.test(raw)?'ฐานข้อมูลใช้เวลานานเกินกำหนด กรุณาลองอีกครั้ง':raw;
      setStatus('บันทึกไม่สำเร็จ: '+friendly,'error');if(reason==='manual')notice('บันทึกไม่สำเร็จ',friendly,'danger');console.error('Field save failed:',error);
    }finally{saving=false}
  }
  function installAutoSave(){
    global.addEventListener('beforeunload',event=>{if(dirty||conflict){event.preventDefault();event.returnValue=''}});
    document.addEventListener('input',event=>{if(event.target.closest('#solarCloudDock,#solarCloudModal,#solarAppDialog'))return;if(event.target.matches('input:not([type="file"]),textarea,select'))scheduleSave('field_input')});
    document.addEventListener('change',event=>{if(event.target.closest('#solarCloudDock,#solarCloudModal,#solarAppDialog'))return;scheduleSave('field_change')});
    document.addEventListener('click',event=>{const target=event.target.closest('button');if(target&&!target.closest('#solarCloudDock,#solarCloudModal,#solarAppDialog'))setTimeout(()=>scheduleSave('action'),50)});
    const fileInput=$('excelFileInput')||$('fileInput');if(fileInput)fileInput.addEventListener('change',event=>{const files=Array.from(event.target.files||[]);[2500,5000,10000].forEach(ms=>setTimeout(()=>scheduleSave('file_import'),ms));if(files.length&&roleCanEdit())setTimeout(()=>saveSharedDataset(files).catch(error=>{console.error(error);setStatus('สร้าง Shared Data ไม่สำเร็จ','error');notice('สร้าง Shared Data ไม่สำเร็จ',error.message,'danger')}),300)});
  }
  function analysisPageLabel(){
    return {working_day:'Working Days',global_irradiance:'Global Irradiance',pr_report:'PR Report'}[currentProject?.analysis_type]||'Analysis';
  }
  function activePresenceArea(){
    const active=document.querySelector('.tab-content.active');
    if(active?.id==='trendTab')return analysisPageLabel()+' / Trend';
    if(active?.id)return analysisPageLabel()+' / '+active.id.replace(/Tab$/,'');
    return analysisPageLabel();
  }
  function flattenPresence(){
    if(!channel)return [];
    const state=channel.presenceState(),map=new Map();
    Object.values(state||{}).flat().forEach(meta=>{
      const key=meta.userId||meta.presence_ref;
      const previous=map.get(key);
      if(!previous||String(meta.onlineAt||'')>String(previous.onlineAt||''))map.set(key,meta);
    });
    return [...map.values()].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'th'));
  }
  function renderPresence(){
    presenceUsers=flattenPresence();
    const count=Math.max(1,presenceUsers.length),button=$('solarPresenceButton'),node=$('solarPresenceCount');
    if(node)node.textContent=String(count);
    if(button){button.dataset.count=String(count);button.title=count>1?'มี '+count+' คนกำลังเปิดงานนี้':'คุณกำลังเปิดงานนี้'}
  }
  async function showPresence(){
    const users=presenceUsers.length?presenceUsers:(presenceSession?[presenceSession]:[]);
    const message=users.map(user=>'• '+(user.name||user.email||'ผู้ใช้งาน')+' — '+(user.role||'member')+'\n  '+(user.area||analysisPageLabel())).join('\n\n')||'ขณะนี้มีคุณกำลังเปิดงานนี้';
    await notice('ผู้ใช้งานออนไลน์ ('+Math.max(1,users.length)+')',message,'success');
  }
  async function updatePresence(force=false){
    if(!channel||!presenceSession)return;
    const area=activePresenceArea();
    if(!force&&area===lastPresenceArea)return;
    lastPresenceArea=area;presenceSession.area=area;presenceSession.lastSeen=new Date().toISOString();
    try{await channel.track(presenceSession)}catch{}
  }
  async function refreshRemoteState(message='อัปเดตข้อมูลล่าสุดแล้ว'){
    if(!currentProject||!adapter||saving)return;
    const captured=adapter.capture();
    const {data,error}=await getClient().from('analysis_projects').select('*').eq('id',currentProject.id).is('deleted_at',null).single();
    if(error||!data||data.version<=currentProject.version)return;
    const state=mergeRemoteWithLocal(data.user_state||{},captured.userState||{});
    currentProject=data;lastSharedState=sharedState(data.user_state||{});
    await adapter.restore(captured.baseData||{},state);dirty=false;setConflictState(false);setStatus(message,'ok');
  }
  function scheduleRemoteRefresh(who){
    clearTimeout(remoteSyncTimer);remoteSyncTimer=setTimeout(()=>refreshRemoteState((who||'ผู้ใช้อื่น')+' อัปเดตข้อมูลแล้ว').catch(console.error),350);
  }
  async function subscribe(){
    if(channel)await getClient().removeChannel(channel);
    const s=await session(),user=s?.user;
    const name=user?.user_metadata?.display_name||user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email||'ผู้ใช้งาน';
    presenceSession={userId:user?.id||crypto.randomUUID(),name,email:user?.email||'',role:currentMembership?.role||'member',area:analysisPageLabel(),onlineAt:new Date().toISOString(),lastSeen:new Date().toISOString()};
    channel=getClient().channel(`project:${currentProject.id}`,{config:{presence:{key:presenceSession.userId},broadcast:{self:false}}})
      .on('presence',{event:'sync'},renderPresence)
      .on('presence',{event:'join'},renderPresence)
      .on('presence',{event:'leave'},renderPresence)
      .on('broadcast',{event:'project_saved'},({payload})=>{
        if(payload?.userId&&payload.userId===presenceSession.userId)return;
        const who=payload?.name||'ผู้ใช้อื่น',remotePaths=Array.isArray(payload?.paths)?payload.paths:[];
        const local=pendingPatches(),same=local.some(a=>remotePaths.some(b=>pathsOverlap(a.path,b)));
        if(dirty&&same){setStatus(who+' แก้ไขช่องเดียวกับคุณ — กำลังตรวจสอบ','conflict');setConflictState(true);return}
        if(!dirty)scheduleRemoteRefresh(who);
        else setStatus(who+' แก้ข้อมูลส่วนอื่น — ระบบจะรวมตอนบันทึก','busy');
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'analysis_projects',filter:`id=eq.${currentProject.id}`},payload=>{
        if(payload.new.version>currentProject.version&&!saving&&!dirty)scheduleRemoteRefresh();
      })
      .subscribe(status=>{if(status==='SUBSCRIBED')updatePresence(true)});
    document.addEventListener('click',()=>setTimeout(()=>updatePresence(false),250),true);
    global.addEventListener('focus',()=>updatePresence(true));
    global.addEventListener('beforeunload',()=>{try{channel?.untrack()}catch{}},{once:true});
  }
  const CENTRAL_CACHE_DB='fusion-central-cache-v2',CENTRAL_CACHE_STORE='payloads';
  function cacheDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(CENTRAL_CACHE_DB,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(CENTRAL_CACHE_STORE))request.result.createObjectStore(CENTRAL_CACHE_STORE)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
  async function cacheRead(key){try{const db=await cacheDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(CENTRAL_CACHE_STORE,'readonly'),request=tx.objectStore(CENTRAL_CACHE_STORE).get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error)})}catch{return null}}
  async function cacheWrite(key,value){try{const db=await cacheDb();await new Promise((resolve,reject)=>{const tx=db.transaction(CENTRAL_CACHE_STORE,'readwrite');tx.objectStore(CENTRAL_CACHE_STORE).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}catch{}}
  function cacheKey(workspace,type,summary){return [workspace,type,summary?.updated_at||summary?.date_end||'current',summary?.record_count||0].join(':')}
  async function initAnalysis(expectedType,projectAdapter){
    adapter=projectAdapter;injectDock();setStatus('กำลังเชื่อมต่อ...','busy');const loading=document.createElement('div');loading.id='solarPageLoading';loading.innerHTML='<div><i class="fa-solid fa-spinner fa-spin"></i><b>กำลังเตรียมข้อมูล...</b><span>Loading central data</span></div>';loading.style.cssText='position:fixed;inset:0;z-index:30000;display:grid;place-items:center;background:#0f172ae8;color:#f8fafc;font-family:Bai Jamjuree,sans-serif;backdrop-filter:blur(5px)';loading.firstElementChild.style.cssText='display:grid;gap:8px;text-align:center;padding:24px';loading.querySelector('i').style.cssText='font-size:26px;color:#38bdf8';loading.querySelector('span').style.cssText='font-size:12px;color:#94a3b8';document.body.appendChild(loading);
    try{
      await requireSession();const id=projectId();if(!id)throw new Error('Project ID is missing. Open this page from Workspace.');
      let bootstrapSummary=null;const bootstrap=await getClient().rpc('get_analysis_bootstrap',{p_project_id:id});
      if(!bootstrap.error&&bootstrap.data){currentMembership=bootstrap.data.membership;currentProject=bootstrap.data.project;bootstrapSummary=bootstrap.data.summary}
      else [currentMembership,currentProject]=await Promise.all([membership(),loadProject(id)]);
      if(currentProject.analysis_type!==expectedType)throw new Error('This project belongs to another analysis type.');
      setStatus('กำลังโหลดงาน...','busy');
      if(currentProject.dataset_id){
        let shared=null,summary=bootstrapSummary;if(!summary){const summaryResult=await getClient().rpc('get_central_summary',{p_workspace:currentMembership.workspace_id});if(!summaryResult.error)summary=summaryResult.data}
        const localView=loadLocalViewState(),restoredUserState=mergeRemoteWithLocal(currentProject.user_state||{},localView);
        const preferredMonth=(expectedType==='working_day'||expectedType==='global_irradiance')?(localView.selectedMonth||localView.selectedPeriod||currentProject.user_state?.selectedMonth||currentProject.user_state?.selectedPeriod||String(summary?.date_end||'').slice(0,7)):null;
        const key=cacheKey(currentMembership.workspace_id,expectedType,summary)+(preferredMonth?':'+preferredMonth:''),cached=await cacheRead(key);
        if(cached?.payload){shared=cached.payload;setStatus('กำลังเปิดข้อมูลจาก Cache...','busy')}
        else{
          if(expectedType==='working_day'||expectedType==='global_irradiance'){
            const rpcName=expectedType==='working_day'?'get_working_day_month':'get_global_irradiance_month';
            const monthly=await getClient().rpc(rpcName,{p_workspace:currentMembership.workspace_id,p_month:preferredMonth||null});
            if(!monthly.error&&monthly.data&&Object.keys(monthly.data).length)shared=monthly.data;
          }
          if(!shared){const fast=await getClient().rpc('get_central_analysis_payload',{p_workspace:currentMembership.workspace_id,p_analysis_type:expectedType});if(!fast.error&&fast.data&&Object.keys(fast.data).length)shared=fast.data}
          if(!shared){const {data:ds,error:dsError}=await getClient().from('shared_datasets').select('id,name,normalized_data').eq('id',currentProject.dataset_id).single();if(dsError)throw dsError;shared=expectedType==='pr_report'?ds.normalized_data:ds.normalized_data?.[expectedType]}
          if(shared)cacheWrite(key,{savedAt:Date.now(),payload:shared})
        }
        if(shared)await adapter.restore(shared,restoredUserState)
      }
      else if(currentProject.base_data&&Object.keys(currentProject.base_data).length)await adapter.restore(currentProject.base_data,mergeRemoteWithLocal(currentProject.user_state||{},loadLocalViewState()));
      lastSharedState=sharedState(currentProject.user_state||{});applyViewerLock();installAutoSave();subscribe();setStatus(roleCanEdit()?'เชื่อมต่อแล้ว':currentProject.status==='completed'?'งานเสร็จแล้ว — โหมดดูอย่างเดียว':'โหมดดูอย่างเดียว','ok');
      document.title=`${currentProject.name} — ${document.title}`;
    }catch(error){console.error(error);loading.remove();await notice('ไม่สามารถเปิดงานได้',error.message,'danger');if(/Authentication|required|Project ID/.test(error.message))location.replace(indexUrl());return}
    loading.remove();
  }
  async function loadCentralPeriod(month){
    const type=currentProject?.analysis_type;
    if(!currentProject||!adapter||!['working_day','global_irradiance'].includes(type)||!/^\d{4}-\d{2}$/.test(String(month||'')))return false;
    const rpcName=type==='working_day'?'get_working_day_month':'get_global_irradiance_month';
    const captured=adapter.capture(),summaryResult=await getClient().rpc('get_central_summary',{p_workspace:currentMembership.workspace_id}),summary=summaryResult.data||{},key=cacheKey(currentMembership.workspace_id,type,summary)+':'+month,cached=await cacheRead(key);
    setStatus('กำลังโหลดเดือน '+month+'...','busy');let payload=cached?.payload||null;
    if(!payload){const result=await getClient().rpc(rpcName,{p_workspace:currentMembership.workspace_id,p_month:month});if(result.error)throw result.error;payload=result.data;cacheWrite(key,{savedAt:Date.now(),payload})}
    await adapter.restore(payload,{...(captured.userState||{}),selectedMonth:month,selectedPeriod:month});saveLocalViewState();setStatus('เชื่อมต่อแล้ว','ok');return true
  }
  async function loadCentralFullData(){
    const type=currentProject?.analysis_type;
    if(!currentProject||!adapter||type!=='global_irradiance')return false;
    const captured=adapter.capture(),summaryResult=await getClient().rpc('get_central_summary',{p_workspace:currentMembership.workspace_id}),summary=summaryResult.data||{},key=cacheKey(currentMembership.workspace_id,type,summary)+':full',cached=await cacheRead(key);
    setStatus('กำลังเตรียมข้อมูล Trend...','busy');let payload=cached?.payload||null;
    if(!payload){
      const result=await getClient().rpc('get_central_analysis_payload',{p_workspace:currentMembership.workspace_id,p_analysis_type:type});
      if(result.error)throw result.error;
      payload=result.data;
      cacheWrite(key,{savedAt:Date.now(),payload});
    }
    await adapter.restore(payload,{...(captured.userState||{}),fullDataLoaded:true});
    saveLocalViewState();
    setStatus('เชื่อมต่อแล้ว','ok');
    return true;
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
  async function useLatestConflict(){
    pendingFieldConflict=null;dirty=false;setConflictState(false);$('solarCloudModal')?.classList.remove('open');await refreshRemoteState('ใช้ข้อมูลล่าสุดแล้ว');
  }
  async function keepMyConflict(){
    if(!pendingFieldConflict||saving)return;
    const pending=pendingFieldConflict;$('solarCloudModal')?.classList.remove('open');saving=true;setStatus('กำลังบันทึกค่าของคุณ...','busy');
    try{await persistFieldPatches(pending.patches,pending.reason,true,pending.serverVersion)}catch(error){setStatus('บันทึกไม่สำเร็จ','error');notice('บันทึกไม่สำเร็จ',error.message,'danger')}finally{saving=false}
  }
  function resolveConflict(){
    if(!currentProject)return;
    if(pendingFieldConflict){showFieldConflict();return}
    $('solarCloudModalBox').querySelector('h3').textContent='จัดการข้อมูลที่แก้ไขพร้อมกัน';
    $('solarCloudModal').classList.add('open');
    $('solarCloudLogs').innerHTML=`<div class="log"><b>พบข้อมูลใหม่ในระบบ</b><div>ข้อมูลที่แก้คนละช่องจะรวมอัตโนมัติ หากเป็นช่องเดียวกันระบบจะแสดงค่าให้เลือก</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button onclick="SolarCloud.downloadLocalDraft()">ดาวน์โหลดข้อมูลที่ยังไม่บันทึก</button><button onclick="SolarCloud.reloadLatest()">โหลดข้อมูลล่าสุด</button></div>`;
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
  async function centralDatasetStatus(){
    const m=currentMembership||await membership();
    const meta=await getClient().from('shared_datasets').select('id,name,updated_at,updated_by').eq('workspace_id',m.workspace_id).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    if(meta.error)throw meta.error;const dataset=meta.data||null;
    const fast=await getClient().rpc('get_central_summary',{p_workspace:m.workspace_id});
    if(!fast.error&&fast.data){const x=fast.data;return{membership:m,dataset,files:Array.isArray(x.files)?x.files:[],projectCount:Number(x.project_count||0),recordCount:Number(x.record_count||0),dateStart:x.date_start||null,dateEnd:x.date_end||null,aliasCount:Number(x.alias_count||0)}}
    const rows=await listDatasets(),full=rows[0]||null,normalized=full?.normalized_data||{},pr=normalized.pr_report?.records||[],wd=normalized.working_day?.records||[],gi=normalized.global_irradiance||{},allDates=[...new Set([...pr.map(r=>r.date),...(gi.dates||[])].filter(Boolean))].sort(),plants=new Set([...pr.map(r=>r.project),...wd.map(r=>r.name),...Object.keys(gi.plants||{})].filter(Boolean));
    return{membership:m,dataset:full,files:full?.source_files||normalized.sourceFiles||[],projectCount:plants.size,recordCount:Math.max(pr.length,wd.length),dateStart:allDates[0]||null,dateEnd:allDates.at(-1)||null,aliasCount:Object.keys(normalized.projectAliases||{}).length}
  }
  async function databaseStorageStatus(limitBytes=524288000){
    const m=currentMembership||await membership(),{data,error}=await getClient().rpc('get_database_storage_status',{p_workspace:m.workspace_id,p_limit_bytes:limitBytes});
    if(error)return{available:false,error:error.message};return{available:true,...data}
  }
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
    let marker=(await getClient().from('shared_datasets').select('id,name,updated_at').eq('workspace_id',m.workspace_id).order('updated_at',{ascending:false}).limit(1).maybeSingle());
    if(marker.error)throw marker.error;
    if(!marker.data){
      const created=await getClient().rpc('upsert_shared_dataset',{p_workspace:m.workspace_id,p_name:'Central Data Hub',p_fingerprint:`central-data-hub:${m.workspace_id}`,p_source_files:[],p_normalized_data:{sourceFiles:[],working_day:{records:[],detectedMonths:[]},global_irradiance:{plants:{},dates:[],sourceFiles:[]},pr_report:{records:[],sourceFiles:[]}}});
      if(created.error)throw created.error;marker={data:created.data};
    }
    for(const type of Object.keys(CENTRAL_PROJECT_NAMES)){const project=await ensureCentralProject(type);if(project.dataset_id!==marker.data.id){const attached=await getClient().rpc('attach_dataset_to_project',{p_project_id:project.id,p_dataset_id:marker.data.id});if(attached.error)throw attached.error}}
    return{dataset:marker.data,normalized:null,summary:await centralDatasetStatus(),batch:completed.data,batchId,failed,inserted,updated,duplicates};
  }
  async function uploadCentralDataset(files){const prepared=await prepareCentralUpload(files);return commitCentralUpload(prepared,prepared.candidates.map(x=>({...x,action:'separate'})))}
  async function backToCenter(){
    saveLocalViewState();
    clearTimeout(saveTimer);
    while(saving)await new Promise(resolve=>setTimeout(resolve,100));
    if(dirty&&roleCanEdit()&&currentProject&&adapter){
      await save('navigation');
      if(dirty){await notice('ยังออกจากหน้านี้ไม่ได้','ไม่สามารถบันทึกการเปลี่ยนแปลงล่าสุดได้ กรุณาตรวจสอบสถานะการบันทึกแล้วลองอีกครั้ง','danger');return}
    }
    location.assign(indexUrl());
  }
  async function openCentralAnalysis(type){const project=await ensureCentralProject(type);if(!project.dataset_id){const {data:dataset,error}=await getClient().from('shared_datasets').select('id').eq('workspace_id',(currentMembership||await membership()).workspace_id).order('updated_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(dataset){const attached=await getClient().rpc('attach_dataset_to_project',{p_project_id:project.id,p_dataset_id:dataset.id});if(attached.error)throw attached.error}}location.href=analysisUrl(project)}
  global.SolarCloud={CONFIG,dialog,notice,confirmDialog,setLanguage,getLanguage,getClient,session,requireSession,membership,listProjects,createProject,analysisUrl,signIn,signOut,loadProject,initAnalysis,scheduleSave,saveNow:()=>save('manual'),history,datasets,useDataset,resolveConflict,downloadLocalDraft,reloadLatest,back:backToCenter,roleCanEdit,roleCanAdmin,centralDatasetStatus,databaseStorageStatus,loadCentralPeriod,loadCentralFullData,showPresence,useLatestConflict,keepMyConflict,prepareCentralUpload,commitCentralUpload,prepareCentralBatchUpload,commitCentralBatchUpload,uploadCentralDataset,openCentralAnalysis};
})(window);
