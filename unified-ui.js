
(function(){
  const pairs=[["เข้าสู่ระบบ","Sign in"],["ใช้บัญชีที่ผู้ดูแลระบบสร้างให้ เพื่อเปิดและแก้ไขงานของทีม","Use an account created by an administrator to open and edit team projects."],["ลืมรหัสผ่าน","Forgot password"],["สมาชิกและสิทธิ์","Members & access"],["ศูนย์จัดการ Admin","Admin Center"],["ออกจากระบบ","Sign out"],["งานทั้งหมด","All projects"],["เริ่มงานวิเคราะห์","Start an analysis"],["เลือกประเภทงาน ระบบจะสร้าง Project ใหม่และบันทึกใน Workspace","Choose an analysis type. A new project will be created and saved in the workspace."],["พร้อมใช้งาน","Ready"],["พักรายละเอียดไว้ก่อน","Development paused"],["สร้างงานใหม่","Create project"],["เปิดโครง PR Report","Open PR foundation"],["นำเข้า FusionSolar Report คำนวณ Working Days และบันทึก Loss Days, Method และ Note","Import FusionSolar reports, calculate working days, and save loss days, method, and notes."],["ตรวจข้อมูล Irradiation รายวัน เปรียบเทียบโครงการ และคัดกรอง Normal / Abnormal","Review daily irradiation, compare projects, and classify Normal / Abnormal."],["โครงสำหรับเชื่อมข้อมูลเตรียมไว้แล้ว ส่วนสูตรและรูปแบบรายงานจะพัฒนาภายหลัง","The data-link foundation is ready. Formulas and report design will be developed later."],["งานที่บันทึกไว้","Saved projects"],["คลิกชื่องานเพื่อเปิดต่อจากข้อมูลล่าสุด","Select a project name to continue from its latest saved data."],["ทุกประเภท","All types"],["ทุกสถานะ","All statuses"],["กำลังโหลด...","Loading..."],["เพิ่งสร้างงานและยังอาจไม่มีข้อมูลครบ","Newly created; some information may still be incomplete."],["มีการนำเข้าหรือแก้ไขข้อมูลแล้ว และยังทำงานต่อได้","Data has been imported or edited and work can continue."],["งานเสร็จและถูกล็อกสำหรับ Editor ส่วน Admin ยังแก้ไขได้","Completed and locked for Editors; Admins can still edit."],["ซ่อนจากรายการหลัก แต่ Admin สามารถกู้คืนได้","Hidden from the main list; Admins can restore it."],["แบบร่าง","Draft"],["กำลังทำ","In progress"],["เสร็จแล้ว","Completed"],["เก็บออกจากรายการ","Archived"],["ศูนย์จัดการสำหรับ Admin","Admin Management Center"],["จัดการสถานะงาน ชุดข้อมูล และข้อมูลสำรองของ Workspace","Manage project status, datasets, and workspace backups."],["ตรวจความพร้อมระบบ","System check"],["ดาวน์โหลดข้อมูลสำรอง","Download backup"],["ตรวจไฟล์ก่อนกู้คืน","Preview restore file"],["Active Project Settings","Active Project Settings"],["แก้ไขเฉพาะชื่อและสถานะ ไม่กระทบข้อมูลหรือสูตรคำนวณ","Edit only name and status; data and calculation formulas are unchanged."],["งานที่ Archive","Archived projects"],["ลบได้เฉพาะ Dataset ที่ไม่มีงานใดใช้งานอยู่","Only datasets not used by any project can be deleted."],["รายการใช้งานล่าสุด","Recent activity"],["ดูว่าใครทำอะไรกับระบบและทำเมื่อใด","See who performed each action and when."],["โหลดใหม่","Reload"],["ผู้ใช้ต้องถูกสร้างใน Authentication → Users ก่อน จึงจะเพิ่มเข้า Workspace ได้","The user must first be created in Authentication → Users before being added to the workspace."],["เพิ่มสมาชิก","Add member"],["ล้างข้อมูล","Clear data"],["ส่งออก Excel","Export Excel"],["ตารางข้อมูล","Data table"],["แนวโน้ม Irradiation","Irradiation trend"],["อัปโหลด Plant Report (.xlsx/.csv)","Upload Plant Report (.xlsx/.csv)"],["คลิกเพื่อเลือกไฟล์ หรือลากหลายไฟล์มาวางได้","Click to browse or drop multiple files here."],["โครงการที่เลือก","Selected plants"],["โครงการ","plants"],["วันที่มีข้อมูล","Dates available"],["วัน","days"],["Irradiation เฉลี่ยต่อวัน","Average daily irradiation"],["สัดส่วนวันที่ค่าปกติ","Normal-day ratio"],["เปรียบเทียบ Global Irradiation รายวัน (kWh/m²)","Daily Global Irradiation Comparison (kWh/m²)"],["ช่วงค่าปกติ:","Normal range:"],["ตัวกรอง","Filters"],["แก้ไขค่า Irradiation","Edit irradiation"],["กรองตามสถานะ:","Filter by status:"],["ทุกโครงการ","All plants"],["ปกติ","Normal"],["ผิดปกติ","Abnormal"],["ไม่พบข้อมูล","Not found"],["อัปโหลด Plant Report","Upload Plant Report"],["เลือกโครงการและตรวจค่าผิดปกติ","Select plants and review anomalies"],["ดูแนวโน้มหรือส่งออก Excel","Review trends or export Excel"],["โครงสร้างสำหรับเชื่อมข้อมูลก่อนกำหนดสูตร PR Guarantee และกติกาการคำนวณ","Data-link foundation before defining PR Guarantee formulas and calculation rules."],["เชื่อมไฟล์ FusionSolar","Connect FusionSolar files"],["ยังไม่มีข้อมูลเชื่อมต่อ","No linked data"],["เลือก Shared Data จากแถบด้านล่าง หรืออัปโหลดไฟล์ FusionSolar","Choose Shared Data from the bottom bar or upload FusionSolar files."],["ยังไม่เปิดการคำนวณ — รอรายละเอียดสูตร, Capacity Basis, Loss Adjustment, Target PR และ Guarantee Period","Calculation is not enabled — awaiting formula, Capacity Basis, Loss Adjustment, Target PR, and Guarantee Period details."],["บันทึกข้อมูลหรือข้อกำหนดสำหรับ PR Report...","Enter notes or requirements for the PR Report..."],["ยังไม่มีข้อมูล","No data yet"],["Data Link Status","สถานะการเชื่อมข้อมูล"],["Available Project Data","ข้อมูลโครงการที่พร้อมใช้"],["PR Calculation Configuration","การตั้งค่าการคำนวณ PR"],["Report Notes","หมายเหตุรายงาน"],["Energy Records","รายการพลังงาน"],["GI Plants","โครงการ GI"],["GI Dates","วันที่ GI"],["Source Files","ไฟล์ต้นทาง"],["Waiting for Shared Dataset","กำลังรอ Shared Dataset"],["Shared Dataset Connected","เชื่อม Shared Dataset แล้ว"],["Plant","โครงการ"],["Capacity","กำลังผลิต"],["PV Yield","พลังงานผลิต"],["Loss","การสูญเสีย"],["GI Data","ข้อมูล GI"],["Trend Controls","ตัวควบคุมแนวโน้ม"],["Date Filter","ตัวกรองวันที่"],["Year","ปี"],["Month","เดือน"],["Options","ตัวเลือก"],["Show Baseline Avg Line","แสดงเส้นค่าเฉลี่ยอ้างอิง"],["Select Plants","เลือกโครงการ"],["Clear","ล้าง"],["All","ทั้งหมด"],["Search plant...","ค้นหาโครงการ..."],["Min Irr (Selected)","Irr ต่ำสุด (ที่เลือก)"],["Mean Avg (Selected)","ค่าเฉลี่ย (ที่เลือก)"],["Max Irr (Selected)","Irr สูงสุด (ที่เลือก)"],["Selected Plants Overall","ภาพรวมโครงการที่เลือก"],["อัปโหลด FusionSolar Report","Upload FusionSolar Report"],["ตรวจค่า Loss, Method และพารามิเตอร์","Review Loss, Method, and parameters"],["ตรวจผลและส่งออก Excel","Review results and export Excel"],["หน้าหลัก","Center"],["ข้อมูลชนกัน","Conflicts"],["ชุดข้อมูล","Shared Data"],["ประวัติ","History"],["บันทึก","Save"],["ปิด","Close"],["แก้ไข","Edit"],["ลบ","Delete"],["กู้คืน","Restore"],
["กำลังเชื่อมต่อ...","Connecting..."],["กำลังโหลดงาน...","Loading project..."],["เชื่อมต่อแล้ว","Connected"],["โหมดดูอย่างเดียว","View only"],["งานเสร็จแล้ว — โหมดดูอย่างเดียว","Completed — View only"],["มีการเปลี่ยนแปลง","Unsaved changes"],["กำลังบันทึก...","Saving..."],["บันทึกแล้ว","Saved"],["บันทึกไม่สำเร็จ","Save failed"],["สร้าง Shared Data ไม่สำเร็จ","Shared Data creation failed"],["ยังไม่มีประวัติการใช้งาน","No activity yet"],["ไม่พบงานที่ค้นหา","No matching projects"],["ยังไม่มีงานที่บันทึกไว้","No saved projects"],["ไม่พบข้อมูลสำหรับแสดงผล","No data to display"],["กำลังเข้าสู่ระบบ...","Signing in..."],["เพิ่มสมาชิกสำเร็จ","Member added"],["กำลังเพิ่ม...","Adding..."],["ไฟล์พร้อมสำหรับกู้คืน","File is ready to restore"],["ระบบพร้อมใช้งาน","System ready"]];
  pairs.push(
    ["กรองโครงการและวันที่","Filter Plants & Dates"],["กรองค่า PR","Filter PR"],["ช่วงสัญญา","Contract Period"],["ทุกช่วงสัญญา","All contract periods"],
    ["เงื่อนไข PR","PR condition"],["PR ต่ำกว่า Guarantee","PR below Guarantee"],["PR ผ่าน Guarantee","PR meets Guarantee"],["PR อยู่ในช่วง","PR within range"],
    ["PR ตั้งแต่","PR from"],["PR ถึง","PR to"],["ผลต่าง","Difference"],["ติดลบ","Negative"],["เป็นบวก","Positive"],["รีเซ็ต","Reset"],
    ["กำลังผลิต","Capacity"],["Guarantee","Guarantee"],["วันที่ไม่ผ่าน","Failed Days"],["สถานะ","Status"],["หมายเหตุ","Note"],["วันที่","Date"],
    ["พลังงานทฤษฎี","Theoretical"],["เกณฑ์คัดกรอง","Filter"],["เลือกทั้งหมด","Select All"],["ยกเลิกทั้งหมด","Deselect All"],
    ["รูปแบบการแสดง PR","PR display mode"],["ทุกโครงการ","All projects"],["โครงการเฉพาะ","Specific project"],["วันที่ใช้คำนวณ","Calculation days"],
    ["เฉพาะวันที่ผ่านเงื่อนไข","Passed days only"],["ทุกวันที่มีข้อมูล","All available days"],["เฉพาะวันที่ไม่ผ่านเงื่อนไข","Failed days only"],
    ["ช่วงเวลาแนวโน้ม","Trend interval"],["รายวัน","Daily"],["รายเดือน","Monthly"],["รายปี","Yearly"],["ตลอดอายุโครงการ","Lifetime"],
    ["ช่วงสถิติ","Statistical period"],["วันที่เริ่มต้น","Start date"],["วันที่สิ้นสุด","End date"],["นำไปใช้และปิด","Apply & Close"],
    ["GI ต่ำสุด (kWh/m²)","Minimum GI (kWh/m²)"],["Specific ต่ำสุด (kWh/kWp)","Minimum Specific (kWh/kWp)"],
    ["ตัวคูณ Loss","Loss Factor"],["Guarantee เริ่มต้น (%)","Default Guarantee (%)"],["คำอธิบาย PR","PR Description"],
    ["บันทึกเหตุการณ์ของเดือนนี้...","Enter this month's event note..."],["ค้นหาโครงการ...","Search plant..."],["รายละเอียด","Details"],
    ["ประเภทเหตุการณ์","Event type"],["ลบ Note","Delete note"],["Note โครงการ","Project note"],["สรุปโครงการ","Project summary"],
    ["Note รวม","Overall note"],["Note รายเดือน","Monthly note"],["ข้อมูลรายวัน","Daily records"],["คลิกวันที่เพื่อเพิ่มหรือแก้ไข Note","Click a date to add or edit a note"]
  );
  const thToEn=new Map(pairs),enToTh=new Map(pairs.map(([th,en])=>[en,th]));
  let language=localStorage.getItem('fusionLanguage')==='en'?'en':'th';
  let theme=localStorage.getItem('fusionTheme')==='light'?'light':'dark';
  const iconMap={sun:'fa-sun','trash-2':'fa-trash-can',download:'fa-file-arrow-down',table:'fa-table','line-chart':'fa-chart-line','upload-cloud':'fa-cloud-arrow-up',building:'fa-building',calendar:'fa-calendar-days','check-circle-2':'fa-circle-check',filter:'fa-filter','edit-3':'fa-pen-to-square','check-circle':'fa-circle-check','alert-triangle':'fa-triangle-exclamation','help-circle':'fa-circle-question',sliders:'fa-sliders',check:'fa-check'};
  const t=(th,en)=>language==='th'?th:en;
  function setTheme(next){
    theme=next==='light'?'light':'dark';localStorage.setItem('fusionTheme',theme);
    const root=document.documentElement;root.dataset.fsTheme=theme;root.dataset.theme=theme;
    root.classList.toggle('dark',theme==='dark');root.classList.toggle('light',theme==='light');
    document.querySelectorAll('[data-fs-theme-icon]').forEach(i=>i.className='fa-solid '+(theme==='dark'?'fa-sun':'fa-moon'));
    document.querySelectorAll('[data-fs-theme-label]').forEach(n=>n.textContent=theme==='dark'?t('โหมดสว่าง','Light'):t('โหมดมืด','Dark'));
  }
  function translate(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const n=walker.currentNode,v=n.nodeValue.trim();if(!v)continue;
      const next=language==='en'?thToEn.get(v):enToTh.get(v);if(next)n.nodeValue=n.nodeValue.replace(v,next);
    }
    root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(n=>['placeholder','title','aria-label'].forEach(a=>{const v=n.getAttribute(a);if(!v)return;const next=language==='en'?thToEn.get(v):enToTh.get(v);if(next)n.setAttribute(a,next)}));
    document.documentElement.lang=language;
    document.querySelectorAll('[data-fs-lang-label]').forEach(n=>n.textContent=language==='th'?'EN':'ไทย');
    document.querySelectorAll('[data-fs-theme-label]').forEach(n=>n.textContent=theme==='dark'?t('โหมดสว่าง','Light'):t('โหมดมืด','Dark'));
    if(window.SolarCloud?.setLanguage)window.SolarCloud.setLanguage(language);
  }
  function iconFor(button){
    const key=((button.id||'')+' '+(button.getAttribute('onclick')||'')+' '+button.textContent).toLowerCase();
    if(/export|download|ส่งออก|ดาวน์โหลด/.test(key))return'fa-file-arrow-down';
    if(/login|เข้าสู่ระบบ/.test(key))return'fa-right-to-bracket';
    if(/signout|ออกจากระบบ/.test(key))return'fa-right-from-bracket';
    if(/member|สมาชิก/.test(key))return'fa-users';
    if(/admin|systemcheck|ตรวจความพร้อม/.test(key))return'fa-gear';
    if(/restore|คืนค่า|กู้คืน/.test(key))return'fa-rotate-left';
    if(/save|confirm|บันทึก|ยืนยัน/.test(key))return'fa-floppy-disk';
    if(/filter|ตัวกรอง/.test(key))return'fa-filter';
    if(/edit|แก้ไข/.test(key))return'fa-pen-to-square';
    if(/archive/.test(key))return'fa-box-archive';
    if(/delete|remove|reset|clear|ลบ|ล้าง|เคลียร์/.test(key))return'fa-trash-can';
    if(/close|✕|ปิด/.test(key))return'fa-xmark';
    if(/reload|refresh|โหลดใหม่/.test(key))return'fa-rotate-right';
    if(/create|สร้าง|add|เพิ่ม/.test(key))return'fa-plus';
    if(/upload|file|อัปโหลด|ไฟล์/.test(key))return'fa-cloud-arrow-up';
    if(/table|ตาราง/.test(key))return'fa-table';
    if(/trend|แนวโน้ม/.test(key))return'fa-chart-line';
    return'fa-circle-dot';
  }
  function ensureIcons(root=document){
    root.querySelectorAll?.('i[data-lucide]').forEach(old=>{const i=document.createElement('i');i.className='fa-solid '+(iconMap[old.dataset.lucide]||'fa-circle-dot');i.style.cssText=old.style.cssText;old.replaceWith(i)});
    root.querySelectorAll?.('button,.upload').forEach(b=>{if(b.closest('.fs-ui-toolbar')||b.querySelector('i'))return;const i=document.createElement('i');i.className='fa-solid '+iconFor(b);b.prepend(i)});
    root.querySelectorAll?.('.logo,.brand-mark').forEach(n=>{if(!n.querySelector('i'))n.innerHTML='<i class="fa-solid fa-sun"></i>'});
    const cards=[['.working .icon','fa-calendar-check'],['.irr .icon','fa-sun'],['.pr .icon','fa-chart-line']];
    cards.forEach(([sel,cls])=>root.querySelectorAll?.(sel).forEach(n=>n.innerHTML='<i class="fa-solid '+cls+'"></i>'));
  }
  function toolbar(){
    const box=document.createElement('div');box.className='fs-ui-toolbar';
    box.innerHTML='<button type="button" class="fs-ui-control" data-fs-lang><i class="fa-solid fa-language"></i><span data-fs-lang-label></span></button><button type="button" class="fs-ui-control" data-fs-theme><i class="fa-solid" data-fs-theme-icon></i><span data-fs-theme-label></span></button>';
    box.querySelector('[data-fs-lang]').onclick=()=>{
      const desired=language==='th'?'en':'th';
      if(location.pathname.includes('working-day')&&typeof window.toggleLanguage==='function'){window.toggleLanguage();language=document.documentElement.lang==='en'?'en':'th'}else language=desired;
      localStorage.setItem('fusionLanguage',language);translate();ensureIcons();
    };
    box.querySelector('[data-fs-theme]').onclick=()=>setTheme(theme==='dark'?'light':'dark');
    return box;
  }
  function mount(){
    if(document.querySelector('#giHeaderActions')) {
      // Global Irradiance owns its Language, Export and Theme controls.
    } else
    if(document.querySelector('#wdHeaderActions')) {
      // Working Day owns its Language, Export and Theme controls; do not inject duplicates.
    } else if(document.querySelector('.header-controls'))document.querySelector('.header-controls').prepend(toolbar());
    else if(document.querySelector('body > main .head')){const wrap=document.createElement('div');wrap.className='fs-ui-toolbar';const tb=toolbar();while(tb.firstChild)wrap.appendChild(tb.firstChild);document.querySelector('body > main .head').appendChild(wrap)}
    else if(document.querySelector('#workspaceView')){
      document.querySelector('#workspaceView .workspace-actions')?.prepend(toolbar());
      const loginBox=toolbar();loginBox.style.cssText='justify-content:center;margin:0 auto 16px;width:100%';document.querySelector('#loginView .auth-card')?.prepend(loginBox);
    } else {
      const target=[...document.querySelectorAll('header div')].find(n=>/items-center/.test(n.className)&&n.querySelector('button'));
      (target||document.querySelector('header')||document.body).appendChild(toolbar());
    }
    if(location.pathname.includes('working-day')&&language==='en'&&document.documentElement.lang!=='en'&&typeof window.toggleLanguage==='function')window.toggleLanguage();
    setTheme(theme);translate();ensureIcons();
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;translate();ensureIcons()})}).observe(document.body,{childList:true,subtree:true});
  }
  window.FusionUI={setLanguage(v){language=v==='en'?'en':'th';localStorage.setItem('fusionLanguage',language);translate();ensureIcons()},setTheme,getLanguage:()=>language,getTheme:()=>theme};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
