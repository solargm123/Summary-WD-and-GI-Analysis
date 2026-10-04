const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('route-release/solar-shell.js','utf8');
function run(saved,child='https://app.solargm123.workers.dev/working-day-analysis?project=p1'){
 const memory=new Map(saved?[['solar-shell-route-v1',saved]]:[]),events={},frame={contentWindow:{location:{href:child},SolarCloud:{CONFIG:{siteRoot:'https://solargm123.github.io/'}}},contentDocument:{title:'Working Days'},addEventListener(k,fn){events[k]=fn}},loading={hidden:false};
 const window={addEventListener(){}};window.top=window;window.self=window;
 const context={URL,window,document:{baseURI:'https://app.solargm123.workers.dev/',getElementById:id=>id==='solarWorkspaceFrame'?frame:loading},location:{search:'',hash:''},sessionStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},history:{replaceState(a,b,url){assert.equal(url,'/')}}};
 vm.runInNewContext(source,context);events.load();return {frame,loading,memory};
}
let r=run('pr-report-r4.html?project=p2');assert.equal(r.frame.src,'https://app.solargm123.workers.dev/pr-report-r4.html?project=p2');assert.equal(r.memory.get('solar-shell-route-v1'),'working-day-analysis.html?project=p1');assert.equal(r.frame.contentWindow.SolarCloud.CONFIG.siteRoot,'https://app.solargm123.workers.dev/');assert.ok(!source.includes('solarShellLoading'));
r=run('https://evil.test/working-day-analysis.html');assert.equal(r.frame.src,'https://app.solargm123.workers.dev/solar-center.html');
r=run(null,'https://app.solargm123.workers.dev/solar-center');assert.equal(r.memory.get('solar-shell-route-v1'),'solar-center.html');
const {JSDOM}=require('jsdom');for(const url of ['https://app.solargm123.workers.dev/working-day-analysis','https://solargm123.github.io/Summary-WD-and-GI-Analysis/working-day-analysis.html']){const d=new JSDOM('',{url,runScripts:'outside-only'});vm.runInContext(fs.readFileSync('route-release/cloud-core.js','utf8'),d.getInternalVMContext());assert.equal(d.window.SolarCloud.CONFIG.siteRoot,new URL('./',url).href);d.window.close();}
console.log('PASS: refresh route restoration, clean Cloudflare paths, same-origin center, unsafe route rejected, GitHub subdirectory compatibility.');
