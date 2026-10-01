/* Working Day presentation and collaboration only; metrics come from the existing calculator. */
const WDReview = (() => {
  let activeTab = 'details', reviewFilter = 'all', reviews = {}, users = [], connected = false, editing = null;
  const editApproved = new Set(), editPending = new Set();
  const $ = id => document.getElementById(id);
  const text = (th, en) => currentLanguage === 'th' ? th : en;
  const month = () => $('monthSelect').value;
  const reviewKey = plant => '@review:' + month() + ':' + projectStableKey(plant);
  const findPlant = id => plantData.find(plant => String(plant.id) === String(id));
  const number = value => Number.isFinite(value) ? value.toFixed(2) : '—';

  // Store the complete review as one field so concurrent reviews cannot mix authors and results.
  function fingerprint(plant) {
    const context = getCalculationContext(), metrics = calculatePlantMetrics(plant, context);
    return JSON.stringify([context, metrics, plant.note || '', plant.mktEstimate || '', plant.calculationMethod,
      [...plant.lossDaysArray].sort((a,b)=>a-b)]);
  }
  // Keep the input snapshot in memory only; a fixed-size digest is enough for new review records.
  function digest(snapshot) {
    let a=2166136261,b=2246822519;
    for (let i=0;i<snapshot.length;i++) {
      const code=snapshot.charCodeAt(i);
      a=Math.imul(a^code,16777619);
      b=Math.imul(b^code,3266489917);
    }
    return 'h1:'+[(a>>>0).toString(16).padStart(8,'0'),(b>>>0).toString(16).padStart(8,'0')].join('');
  }
  function sourceSnapshot(plant) {
    return JSON.stringify(Object.keys(plant.dailyMap||{}).sort((a,b)=>Number(a)-Number(b)).map(day=>[day,plant.dailyMap[day]]));
  }
  function currentFingerprint(plant) { return digest(fingerprint(plant)+'|'+sourceSnapshot(plant)); }
  function review(plant) {
    try { return JSON.parse(reviews[reviewKey(plant)] || 'null'); } catch { return null; }
  }
  function reviewed(plant){
    if(!reviewScope)return reviewedUncached(plant);
    if(!reviewScope.has(plant))reviewScope.set(plant,reviewedUncached(plant));
    return reviewScope.get(plant);
  }
  function reviewedUncached(plant) {
    const value = review(plant);
    if (value?.done !== true || value.again) return false;
    // Existing full-snapshot reviews remain valid until the next review action.
    return value.fingerprint === (value.fingerprint?.startsWith('h1:') ? currentFingerprint(plant) : fingerprint(plant));
  }
  function editors(plant) {
    const seen = new Set();
    return users.filter(user => {
      const context = user.workingDay;
      if (!context || context.month !== month() || context.projectKey !== projectStableKey(plant) ||
          Date.now() - Date.parse(user.lastSeen) > 90000 || !Number.isFinite(Date.parse(user.lastSeen))) return false;
      if (seen.has(user.userId)) return false;
      seen.add(user.userId);return true;
    });
  }
  function statusHtml(plant) {
    const value = review(plant), done = reviewed(plant), active = editors(plant);
    const saved = SolarCloud.isSharedValueSaved(['overrides', reviewKey(plant)], reviews[reviewKey(plant)]);
    const label = done && !saved ? text('ตรวจแล้ว — รอบันทึก','Reviewed — pending save') : done ? text('ตรวจแล้ว', 'Reviewed') : value?.done ? text('ข้อมูลเปลี่ยน — ตรวจอีกครั้ง', 'Changed — review again') : text('ยังไม่ระบุว่าตรวจแล้ว', 'Not marked reviewed');
    let html = `<span class="wd-status ${done&&saved?'wd-status-done':''}">${label}</span>`;
    if (value?.done) {
      const at = new Date(value.at), date = Number.isFinite(at.getTime()) ? at.toLocaleString(currentLanguage==='th'?'th-TH':'en-GB') : '';
      html += `<span>${escapeHtml(value.by || '')} · ${escapeHtml(date)}${saved?'': ' · '+text('รอบันทึก','Pending save')}</span>`;
    } else if (value && !saved) html += `<span>${text('รอบันทึก','Pending save')}</span>`;
    if (connected && active.length) html += `<span class="wd-status-active">${text('กำลังแก้ไข','Editing')}: ${active.map(user=>escapeHtml(user.name||text('ผู้ใช้','User'))).join(', ')}</span>`;
    if (!connected) html += `<span>${text('สถานะออนไลน์ยังไม่เชื่อมต่อ','Live status unavailable')}</span>`;
    return html;
  }
  function reviewLabel(plant) { return reviewed(plant) ? text('เปิดตรวจอีกครั้ง','Reopen review') : review(plant)?.done ? text('ตรวจอีกครั้ง','Review again') : text('ตรวจเสร็จ','Mark reviewed'); }
  function reviewState(plant) { return reviewed(plant) ? 'done' : review(plant)?.done ? 'changed' : 'new'; }
  function reviewIcon(plant) { return reviewState(plant)==='done' ? 'fa-rotate-left' : reviewState(plant)==='changed' ? 'fa-rotate' : 'fa-circle-check'; }
  function reviewButtonHtml(plant) {
    const state=reviewState(plant),label=state==='done'?text('ตรวจแล้ว','Reviewed'):state==='changed'?text('ตรวจอีกครั้ง','Review again'):text('ยังไม่ตรวจ','Not reviewed');
    return `<button type="button" role="checkbox" class="wd-review-button wd-review-check" data-wd-review="${plant.id}" data-review-state="${state}" aria-checked="${state==='done'?'true':state==='changed'?'mixed':'false'}" aria-label="${label}" title="${label}" onclick="WDReview.toggleReview(${plant.id})" ${SolarCloud.roleCanEdit()?'':'disabled'}><i class="fa-solid ${state==='done'?'fa-check':state==='changed'?'fa-rotate-right':''}" aria-hidden="true"></i></button>`;
  }
  function detailBadge(plant) {return reviewButtonHtml(plant)}
  // Ask before the first edit to a reviewed project in this page session; the choice is not stored.
  function guardReviewedEdit(event) {
    const control=event.target.closest('#tableBody input[type="number"],#tableBody select,#tableBody button[onclick^="openLossModal"],#tableBody button[onclick^="openNoteModal"],#sunHoursTarget,#inputSunHoursCustom,input[name="sunHoursMode"]');
    if (!control || (event.type==='beforeinput' && !control.matches('input[type="number"]')) ||
        (event.type==='keydown' && ['Tab','Shift','Control','Alt','Meta','Escape'].includes(event.key))) return;
    const row=control.closest('[data-wd-plant]'),plant=row&&findPlant(row.dataset.wdPlant);
    const global=!plant;
    const affected=global?plantData.filter(reviewed):[];
    if (global?!affected.length:!reviewed(plant)) return;
    const key=global?'@global:'+month():reviewKey(plant);
    if (editApproved.has(key)) return;
    event.preventDefault();event.stopImmediatePropagation();
    if (event.type==='click') control.blur();
    if (editPending.has(key)) return;
    editPending.add(key);
    SolarCloud.confirmDialog(global?text('มีโครงการที่ตรวจแล้ว','Some projects are reviewed'):text('โครงการนี้ตรวจแล้ว','This project is reviewed'),
      global?text('การเปลี่ยนพารามิเตอร์อาจกระทบ '+affected.length+' โครงการที่ตรวจแล้ว หลังยืนยัน กรุณากดช่องเดิมเพื่อแก้ไข',
                  'This parameter may affect '+affected.length+' reviewed projects. Confirm, then select the field again.'):
      text('หากแก้ไขข้อมูลของ '+plant.name+' สถานะตรวจแล้วจะเปลี่ยนเป็นรอตรวจอีกครั้ง หลังยืนยัน กรุณากดช่องเดิมเพื่อแก้ไข',
           'Editing '+plant.name+' will require another review. Confirm, then select the field again.'),
      {icon:'!',confirmText:text('แก้ไขต่อ','Continue editing'),cancelText:text('ยกเลิก','Cancel')})
      .then(allowed=>{if(allowed)editApproved.add(key);else calculateAndRender()})
      .finally(()=>editPending.delete(key));
  }
  function toggleReview(id) {
    const plant = findPlant(id), actor = SolarCloud.collaborationActor();
    if (!plant || !month() || !actor || !SolarCloud.roleCanEdit()) return;
    if(!['m1','m2'].includes(plant.calculationMethod)){SolarCloud.notice(text('ต้องเลือกวิธีคำนวณก่อน','Select a calculation method'),text('โครงการนี้เลือก Other อยู่ กรุณาเลือกวิธีที่ 1 หรือ 2 ก่อนตรวจ','This project uses Other. Select Method 1 or Method 2 before reviewing.'),'danger');document.querySelector('[data-wd-plant="'+plant.id+'"] .wd-method-select')?.focus();return;}
    const metrics = calculatePlantMetrics(plant);
    if (!metrics.valid) { SolarCloud.notice(text('ยังตรวจเสร็จไม่ได้','Cannot mark reviewed'),text('กรุณาตรวจค่าคำนวณที่ไม่ถูกต้องก่อน','Please correct invalid calculation inputs first'));return; }
    const state=reviewState(plant);
    reviews[reviewKey(plant)] = JSON.stringify({done:state!=='changed',again:state==='done',by:actor.name,userId:actor.userId,at:new Date().toISOString(),fingerprint:currentFingerprint(plant)});
    editApproved.delete(reviewKey(plant));
    editApproved.delete('@global:'+month());
    SolarCloud.scheduleSave('working_day_review');
    calculateAndRender();
  }
  function refreshStatuses(){if(document.hidden)return;return withReviewScope(refreshStatusesScoped)}
  function refreshStatusesScoped() {
    const plants = new Map(plantData.map(plant=>[String(plant.id),plant]));
    document.querySelectorAll('[data-wd-status]').forEach(node => {
      const plant = plants.get(node.dataset.wdStatus);
      if (plant) {const html=statusHtml(plant);if(node.innerHTML!==html)node.innerHTML=html;}
    });
    document.querySelectorAll('[data-wd-detail-review]').forEach(node=>{
      const plant=plants.get(node.dataset.wdDetailReview);
      if(plant){const html=detailBadge(plant);if(node.innerHTML!==html)node.innerHTML=html;}
    });
    document.querySelectorAll('[data-wd-review]').forEach(node => {
      const plant = plants.get(node.dataset.wdReview);
      if (plant) { const html=reviewButtonHtml(plant);if(node.outerHTML!==html)node.outerHTML=html; }
    });
  }
  function onSaved(state, sent) {
    // Adopt merged server reviews, while retaining any review changed during the request.
    Object.entries(state.overrides || {}).forEach(([key, value]) => {
      if (key.startsWith('@review:') && reviews[key] === sent.overrides?.[key]) reviews[key] = value;
    });
    if (activeTab==='summary') calculateAndRender(); else refreshStatuses();
  }
  function beginEdit(id) {
    const plant = findPlant(id);
    if (!plant || !SolarCloud.roleCanEdit()) return;
    const changed = editing?.projectKey !== projectStableKey(plant) || editing?.month !== month();
    editing = {projectKey:projectStableKey(plant),month:month(),lastActivity:Date.now()};
    if (changed) SolarCloud.refreshPresence();
  }
  function endEdit() { if (editing) { editing=null;SolarCloud.refreshPresence(); } }
  function presenceContext() {
    if (!editing || document.hidden || editing.month !== month() || Date.now()-editing.lastActivity > 90000) return null;
    return {projectKey:editing.projectKey,month:editing.month};
  }
  function onPresence(next, online) { users=next;connected=online;refreshStatuses(); }
  function setTab(tab) {
    activeTab = tab === 'summary' ? 'summary' : 'details';
    endEdit();calculateAndRender();
  }
  // Open after the completed click; a pointer-down dialog can be dismissed by that same click.
  ['click','keydown','beforeinput','change'].forEach(type=>document.addEventListener(type,guardReviewedEdit,true));
  function setReviewFilter(value) { reviewFilter=['all','done','new','changed'].includes(value)?value:'all';calculateAndRender(); }
  function clearSearch() { $('searchInput').value='';$('projectPopupSearch').value='';calculateAndRender(); }
  let reviewScope=null;
  function withReviewScope(fn){
    const previous=reviewScope;reviewScope=new Map();
    try{return fn()}finally{reviewScope=previous}
  }
  function render(filtered,context){return withReviewScope(()=>renderScoped(filtered,context))}
  function renderScoped(filtered, context) {
    const summary = activeTab === 'summary';
    if($('wdCheckingHeader'))$('wdCheckingHeader').textContent=text('ตรวจ','Check');
    $('wdDetailsTab').querySelector('span').textContent=text('คำนวณ','Calculate');
    $('wdSummaryTab').querySelector('span').textContent=text('สรุปวันทำงาน','Working day summary');
    $('wdDetailsTab').setAttribute('aria-selected',String(!summary));
    $('wdSummaryTab').setAttribute('aria-selected',String(summary));
    $('wdSummaryPanel').hidden=!summary;
    $('wdReviewFilterToolbar').hidden=false;
    $('tableScrollContainer').hidden=summary;

    const query=$('searchInput').value.trim(),status=$('wdSearchStatus');
    status.hidden=!query;
    status.innerHTML=`${text('ค้นหา','Search')}: <b>${escapeHtml(query)}</b> · ${filtered.length} ${text('โครงการ','projects')} <button onclick="WDReview.clearSearch()">${text('ล้างคำค้น','Clear search')}</button>`;
    const changed=plantData.filter(plant=>review(plant)?.done&&!reviewed(plant));
    const warning=$('wdReviewWarning');
    warning.hidden=!changed.length;
    if(changed.length) warning.innerHTML=`<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>${text('ข้อมูลเปลี่ยนหลังตรวจแล้ว','Data changed after review')} · ${changed.length} ${text('โครงการ','projects')}${changed.length===1?' · '+escapeHtml(changed[0].name):''} — ${text('ตรวจผลอีกครั้งก่อนกดตรวจเสร็จ','Check the results before marking reviewed again')}</span>`;
    const baseCounts={all:filtered.length,done:0,new:0,changed:0};
    filtered.forEach(p=>baseCounts[reviewState(p)]++);
    const options=[['all',text('ทั้งหมด','All')],['done',text('ตรวจแล้ว','Reviewed')],['new',text('ยังไม่ตรวจ','Not reviewed')],['changed',text('ต้องตรวจซ้ำ','Review again')]];
    $('wdReviewFilterToolbar').innerHTML=`<label for="wdReviewFilter">${text('สถานะตรวจ','Review')}</label><select id="wdReviewFilter" onchange="WDReview.setReviewFilter(this.value)">${options.map(([v,l])=>`<option value="${v}" ${reviewFilter===v?'selected':''}>${l} (${baseCounts[v]})</option>`).join('')}</select>`;
    if (!summary) return;
    const sourceLabel = method => (context.targetMethod==='m1'&&method===2)||(context.targetMethod==='m2'&&method===1)
      ? text('ค่ากำหนดเอง','Custom value')
      : ({custom:text('ค่ากำหนดเอง','Custom value'),monthlyAvg:text('Specific เฉลี่ยทั้งเดือน','Monthly average Specific'),nonLossAvg:text('Specific เฉพาะวันไม่มี Loss','Non-loss-day Specific')}[context.mode]||context.mode);
    const reviewCounts={all:filtered.length,done:0,new:0,changed:0};
    filtered.forEach(plant=>reviewCounts[reviewState(plant)]++);
    const summaryPlants=reviewFilter==='all'?filtered:filtered.filter(plant=>reviewState(plant)===reviewFilter);
    const rows=summaryPlants.map(plant=>{
      const m=calculatePlantMetrics(plant,context);
      return `<tr data-wd-plant="${plant.id}"><th scope="row">${escapeHtml(plant.name)}</th><td>${m.valid?number(m.shM1):'—'}</td><td class="wd-result ${plant.calculationMethod==='m1'?'wd-selected-m1':''}">${m.valid?number(m.method1Days):'—'}</td><td>${m.valid?number(m.shM2):'—'}</td><td class="wd-result ${plant.calculationMethod==='m2'?'wd-selected-m2':''}">${m.valid?number(m.method2Days):'—'}</td><td><small class="wd-project-status" data-wd-status="${plant.id}">${statusHtml(plant)}</small>${reviewButtonHtml(plant)}</td></tr>`;
    }).join('');
    const choices=[['all',text('ทั้งหมด','All')],['done',text('ตรวจแล้ว','Reviewed')],['new',text('ยังไม่ตรวจ','Not reviewed')],['changed',text('ต้องตรวจซ้ำ','Review again')]];
    $('wdReviewFilterToolbar').innerHTML=`<label for="wdReviewFilter">${text('สถานะตรวจ','Review')}</label><select id="wdReviewFilter" onchange="WDReview.setReviewFilter(this.value)">${choices.map(([value,label])=>`<option value="${value}" ${reviewFilter===value?'selected':''}>${label} (${reviewCounts[value]})</option>`).join('')}</select>`;
    $('wdSummaryPanel').innerHTML=`<div class="wd-summary-scroll"><table><caption class="sr-only">${text('ข้อมูลเดือนที่เลือกคำนวณด้วยพารามิเตอร์ปัจจุบัน','Selected month calculated with current parameters')}</caption><colgroup><col class="wd-col-project"><col class="wd-col-metric"><col class="wd-col-metric"><col class="wd-col-metric"><col class="wd-col-metric"><col class="wd-col-status"></colgroup><thead><tr><th rowspan="2" scope="col">${text('โครงการ','Project')}</th><th colspan="2" scope="colgroup">${text('วิธี 1','Method 1')}<small>${escapeHtml(sourceLabel(1))}</small></th><th colspan="2" scope="colgroup">${text('วิธี 2','Method 2')}<small>${escapeHtml(sourceLabel(2))}</small></th><th rowspan="2" scope="col">${text('สถานะงานเดือนนี้','Review status for this month')}</th></tr><tr><th>Sun Hours</th><th>${text('วันทำงาน','Working days')}</th><th>Sun Hours</th><th>${text('วันทำงาน','Working days')}</th></tr></thead><tbody>${rows||`<tr><td colspan="6">${text('ไม่มีข้อมูลตรงกับเดือนและตัวกรองที่เลือก','No data for the selected month and filters')}</td></tr>`}</tbody></table></div>`;
  }
  document.addEventListener('focusin',event=>{
    const row=event.target.closest('[data-wd-plant]');
    if(row&&event.target.matches('input:not([type=checkbox]),select,textarea'))beginEdit(row.dataset.wdPlant);
  });
  document.addEventListener('input',event=>{
    const row=event.target.closest('[data-wd-plant]');
    if(row&&event.target.matches('input:not([type=checkbox]),select,textarea'))beginEdit(row.dataset.wdPlant);
    else if(editing&&event.target.closest('#lossModal,#noteModal'))editing.lastActivity=Date.now();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)endEdit()});
  setInterval(()=>{if(editing){if(!presenceContext())endEdit();else SolarCloud.refreshPresence()}refreshStatuses()},30000);
  function filterPlants(plants){return reviewFilter==='all'?plants:plants.filter(p=>reviewState(p)===reviewFilter)}
  return {filterPlants,isSummary:()=>activeTab==='summary',render,setTab,setReviewFilter,clearSearch,statusHtml,detailBadge,reviewLabel,toggleReview,refreshStatuses,beginEdit,endEdit,presenceContext,onPresence,onSaved,
    captureReviews:()=>({...reviews}),restoreReviews:overrides=>{reviews=Object.fromEntries(Object.entries(overrides).filter(([key])=>key.startsWith('@review:')))}};
})();

