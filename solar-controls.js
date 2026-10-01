/* Presentation only: native language, theme and export handlers remain authoritative. */
(()=>{
  const root=document.documentElement;
  const isAlarm=location.pathname.includes('OM_Alarm');
  const language=()=>isAlarm&&typeof lang==='string'?lang.toLowerCase():root.lang==='en'?'en':'th';
  const theme=()=>root.dataset.theme||root.dataset.fsTheme||(root.classList.contains('dark')?'dark':'light');
  const set=(node,key,value)=>{if(node.getAttribute(key)!==value)node.setAttribute(key,value)};
  function mountSwitch(original,kind,choose,container=original){
    if(!original||original.dataset.solarSwitchMounted)return;
    original.dataset.solarSwitchMounted='true';
    const group=document.createElement('div');group.className='solar-switch-group';
    const labels=kind==='language'?['EN','TH']:['☀ Light','☾ Dark'];
    group.innerHTML=`<span class="solar-switch-label">${labels[0]}</span><button type="button" class="solar-toggle" role="switch"><i class="solar-switch-sentinel" aria-hidden="true"></i><span class="solar-toggle-thumb"></span></button><span class="solar-switch-label">${labels[1]}</span>`;
    container.before(group);container.classList.add('solar-native-control');
    const button=group.querySelector('button'),left=group.firstElementChild,right=group.lastElementChild;
    const sync=()=>{
      const checked=kind==='language'?language()==='th':theme()==='dark';
      set(button,'aria-checked',String(checked));
      set(button,'aria-label',kind==='language'?'Language: '+(checked?'TH':'EN'):'Theme: '+(checked?'Dark':'Light'));
      left.classList.toggle('selected',!checked);right.classList.toggle('selected',checked);
    };
    button.addEventListener('click',()=>{choose();sync()});
    sync();
    new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['lang','class','data-theme','data-fs-theme']});
    // Some standalone pages keep language outside document.lang.
    new MutationObserver(sync).observe(original,{childList:true,subtree:true,characterData:true});
  }
  function mount(){
    const spare=document.getElementById('langTH');
    if(spare){
      mountSwitch(spare,'language',()=>document.getElementById(language()==='th'?'langEN':'langTH').click(),spare.parentElement);
      const light=document.getElementById('lightBtn');
      if(light)mountSwitch(light,'theme',()=>document.getElementById(theme()==='dark'?'lightBtn':'darkBtn').click(),light.parentElement);
    }else{
      const languages=[...document.querySelectorAll('#languageButton,#langBtn,[data-fs-lang],#giHeaderActions button[onclick*="toggleGiLanguage"]')];
      languages.forEach(b=>mountSwitch(b,'language',()=>{b.click();if(b.id==='languageButton'&&window.FusionUI)window.FusionUI.setLanguage(root.lang)}));
      const themes=[...document.querySelectorAll('#themeButton,#themeBtn,[data-fs-theme],#giHeaderActions button[onclick*="setTheme"]')];
      themes.forEach(b=>mountSwitch(b,'theme',()=>b.click()));
    }
    document.querySelectorAll('#exportExcelButton,#exportBtn,#saveBtn,header button[onclick*="export"],.topbar button[onclick*="export"]').forEach(b=>b.classList.add('solar-export-control'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
