const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('pr-report-r4.html','utf8'),dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.invalid/pr-report-r4.html'}),w=dom.window;
w.SolarCloud={getLanguage:()=> 'th',setLanguage(){},roleCanEdit:()=>false,membership:async()=>null};w.Chart=function(){};w.Chart.defaults={font:{}};w.requestAnimationFrame=f=>f();w.matchMedia=()=>({matches:false});
let main=[...w.document.querySelectorAll('script:not([src])')].find(s=>s.textContent.includes('function effectivePv')).textContent;
main=main.split('\n').filter(l=>!l.startsWith("document.addEventListener('DOMContentLoaded'")).join('\n');vm.runInContext(main,dom.getInternalVMContext());
const run=code=>vm.runInContext(code,dom.getInternalVMContext());
(async()=>{
run(`renderAll=function(){};selectedProject='Alpha';compareProjects=new Set(['Alpha','Beta']);detailMonths=['2026-08','2026-09'];recordFilterApplied={projects:['Beta'],status:'pass'};$('detailPeriod').value='months';$('compareMetric').value='prLoss';`);
const saved=JSON.parse(JSON.stringify(run('adapter.captureViewState()')));w.saved=saved;
run(`selectedProject='';compareProjects.clear();detailMonths=[];recordFilterApplied={project:'',status:''};detailSelectionMade=false;`);
await run('adapter.restore({pr_report:{records:[]}},saved)');
assert.deepEqual([...run('compareProjects')],['Alpha','Beta']);assert.deepEqual([...run('detailMonths')],['2026-08','2026-09']);assert.equal(run('recordFilterApplied.status'),'pass');assert.deepEqual([...run('recordFilterApplied.projects')],['Beta']);assert.equal(run('selectedProject'),'Alpha');
run(`compareProjects=new Set(['Beta']);recordFilterApplied={projects:['Beta'],status:'fail'}`);
await run('adapter.restore({pr_report:{records:[]}},saved)');assert.deepEqual([...run('compareProjects')],['Beta']);assert.equal(run('recordFilterApplied.status'),'fail');
// Exercise actual core storage helpers with separate users and analysis projects.
const source=fs.readFileSync('cloud-core.js','utf8');function fn(name){const m=new RegExp('function '+name+'\\(').exec(source);assert(m,name);for(let i=source.indexOf('}',m.index);i>=0;i=source.indexOf('}',i+1)){const code=source.slice(m.index,i+1);try{new vm.Script(code);return code}catch{}}throw Error(name)}
const context=vm.createContext({console,saved});vm.runInContext(`let currentProject={id:'project-a',analysis_type:'pr_report'},localUserId='user-a',adapter={captureViewState:()=>saved};const cache=new Map();const localStorage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)};const cloneJson=value=>JSON.parse(JSON.stringify(value??{}));`+source.split('\n').find(l=>l.includes('const localViewStorageKey='))+['localKeys','selectState','saveLocalViewState','loadLocalViewState'].map(fn).join('\n'),context);
const core=c=>vm.runInContext(c,context);core('saveLocalViewState()');assert.equal(core('loadLocalViewState().prDetailFilters.records.status'),'pass');assert.equal(core('loadLocalViewState().dailyNotes'),undefined);core("localUserId='user-b'");assert.equal(core('Object.keys(loadLocalViewState()).length'),0);core("localUserId='user-a';currentProject.id='project-b'");assert.equal(core('Object.keys(loadLocalViewState()).length'),0);
console.log('PASS: PR adapter restores multi-project/month/status filters, preserves live choices during reload, and actual core storage isolates users/projects without saving shared notes. Synthetic DOM/VM; no browser/auth/DB.');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close()});
