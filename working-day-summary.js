/* Working Day presentation and collaboration only; metrics come from the existing calculator. */
const WDReview = (() => {
  let activeTab = 'details', reviews = {}, users = [], connected = false, editing = null;
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
  function review(plant) {
    try { return JSON.parse(reviews[reviewKey(plant)] || 'null'); } catch { return null; }
  }
  function reviewed(plant) {
    const value = review(plant);
    return value?.done === true && value.fingerprint === fingerprint(plant);
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
    const label = done ? text('ตรวจแล้ว', 'Reviewed') : value?.done ? text('ข้อมูลเปลี่ยน — ตรวจอีกครั้ง', 'Changed — review again') : text('ยังไม่ระบุว่าตรวจแล้ว', 'Not marked reviewed');
    let html = `<span class="wd-status ${done?'wd-status-done':''}">${label}</span>`;
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
  function reviewButtonHtml(plant) { const done=reviewed(plant);return `<button type="button" class="wd-review-button" data-wd-review="${plant.id}" data-review-state="${reviewState(plant)}" aria-pressed="${done}" onclick="WDReview.toggleReview(${plant.id})" ${SolarCloud.roleCanEdit()?'':'disabled'}><i class="fa-solid ${reviewIcon(plant)}" aria-hidden="true"></i><span>${reviewLabel(plant)}</span></button>`; }
  function toggleReview(id) {
    const plant = findPlant(id), actor = SolarCloud.collaborationActor();
    if (!plant || !month() || !actor || !SolarCloud.roleCanEdit()) return;
    const metrics = calculatePlantMetrics(plant);
    if (!metrics.valid) { SolarCloud.notice(text('ยังตรวจเสร็จไม่ได้','Cannot mark reviewed'),text('กรุณาตรวจค่าคำนวณที่ไม่ถูกต้องก่อน','Please correct invalid calculation inputs first'));return; }
    reviews[reviewKey(plant)] = JSON.stringify({done:!reviewed(plant),by:actor.name,userId:actor.userId,at:new Date().toISOString(),fingerprint:fingerprint(plant)});
    SolarCloud.scheduleSave('working_day_review');
    calculateAndRender();
  }
  function refreshStatuses() {
    const plants = new Map(plantData.map(plant=>[String(plant.id),plant]));
    document.querySelectorAll('[data-wd-status]').forEach(node => {
      const plant = plants.get(node.dataset.wdStatus);
      if (plant) node.innerHTML = statusHtml(plant);
    });
    document.querySelectorAll('[data-wd-review]').forEach(node => {
      const plant = plants.get(node.dataset.wdReview);
      if (plant) { node.dataset.reviewState=reviewState(plant);node.setAttribute('aria-pressed',String(reviewed(plant)));node.querySelector('i').className='fa-solid '+reviewIcon(plant);node.querySelector('span').textContent=reviewLabel(plant);node.disabled=!SolarCloud.roleCanEdit(); }
    });
  }
  function onSaved(state, sent) {
    // Adopt merged server reviews, while retaining any review changed during the request.
    Object.entries(state.overrides || {}).forEach(([key, value]) => {
      if (key.startsWith('@review:') && reviews[key] === sent.overrides?.[key]) reviews[key] = value;
    });
    refreshStatuses();
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
  function clearSearch() { $('searchInput').value='';$('projectPopupSearch').value='';calculateAndRender(); }
  function render(filtered, context) {
    const summary = activeTab === 'summary';
    $('wdDetailsTab').querySelector('span').textContent=text('รายละเอียดและคำนวณ','Details and calculations');
    $('wdSummaryTab').querySelector('span').textContent=text('สรุปวันทำงาน','Working day summary');
    $('wdDetailsTab').setAttribute('aria-selected',String(!summary));
    $('wdSummaryTab').setAttribute('aria-selected',String(summary));
    $('wdSummaryPanel').hidden=!summary;
    $('tableScrollContainer').hidden=summary;
    $('topTableScroll').hidden=summary;
    const query=$('searchInput').value.trim(),status=$('wdSearchStatus');
    status.hidden=!query;
    status.innerHTML=`${text('ค้นหา','Search')}: <b>${escapeHtml(query)}</b> · ${filtered.length} ${text('โครงการ','projects')} <button onclick="WDReview.clearSearch()">${text('ล้างคำค้น','Clear search')}</button>`;
    if (!summary) return;
    const sourceLabel = method => (context.targetMethod==='m1'&&method===2)||(context.targetMethod==='m2'&&method===1)
      ? text('ค่ากำหนดเอง','Custom value')
      : ({custom:text('ค่ากำหนดเอง','Custom value'),monthlyAvg:text('Specific เฉลี่ยทั้งเดือน','Monthly average Specific'),nonLossAvg:text('Specific เฉพาะวันไม่มี Loss','Non-loss-day Specific')}[context.mode]||context.mode);
    const rows=filtered.map(plant=>{
      const m=calculatePlantMetrics(plant,context);
      return `<tr data-wd-plant="${plant.id}"><th scope="row">${escapeHtml(plant.name)}</th><td>${m.valid?number(m.shM1):'—'}</td><td class="wd-result">${m.valid?number(m.method1Days):'—'}</td><td>${m.valid?number(m.shM2):'—'}</td><td class="wd-result">${m.valid?number(m.method2Days):'—'}</td><td><small class="wd-project-status" data-wd-status="${plant.id}">${statusHtml(plant)}</small>${reviewButtonHtml(plant)}</td></tr>`;
    }).join('');
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
  return {render,setTab,clearSearch,statusHtml,reviewLabel,toggleReview,refreshStatuses,beginEdit,endEdit,presenceContext,onPresence,onSaved,
    captureReviews:()=>({...reviews}),restoreReviews:overrides=>{reviews=Object.fromEntries(Object.entries(overrides).filter(([key])=>key.startsWith('@review:')))}};
})();
