const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../solar-shell.js'),'utf8');
function run(saved,hash=''){
 const memory=new Map(saved?[['solar-shell-route-v1',saved]]:[]),events={};
 const frame={contentWindow:{location:{href:'https://app.solargm123.workers.dev/working-day-analysis?project=p1'},SolarCloud:{CONFIG:{siteRoot:'old'}}},contentDocument:{title:'Working Days'},addEventListener(k,fn){events[k]=fn}};
 const window={addEventListener(){}};window.top=window;window.self=window;
 const ctx={URL,window,document:{baseURI:'https://app.solargm123.workers.dev/',getElementById:()=>frame},location:{search:'',hash},sessionStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},history:{replaceState(_a,_b,url){assert.equal(url,'/')}}};
 vm.runInNewContext(source,ctx);return{frame,events,memory};
}
for(const route of ['pr-report-r4.html?project=p2','working-day-analysis.html?project=p2','inverter-report.html?month=2026-09']){
 const r=run(route),url=new URL(r.frame.src),requested=new URL(route,'https://app.solargm123.workers.dev/');assert.equal(url.pathname,requested.pathname);for(const [key,value] of requested.searchParams)assert.equal(url.searchParams.get(key),value);assert(url.searchParams.get('v'));r.events.load();assert.equal(r.memory.get('solar-shell-route-v1'),'working-day-analysis.html?project=p1');assert.equal(r.frame.contentWindow.SolarCloud.CONFIG.siteRoot,'https://app.solargm123.workers.dev/solar-center.html');
}
for(const route of ['https://evil.example/pr-report-r4.html','javascript:alert(1)','unknown.html'])assert.equal(new URL(run(route).frame.src).pathname,'/solar-center.html');
assert.equal(new URL(run('inverter-analysis-compact-test.html').frame.src).pathname,'/inverter-report.html');
assert.equal(new URL(run('pr-report-r4.html','#main').frame.src).pathname,'/solar-center.html');
console.log('Current shell: route restore, query preservation, same-origin allowlist, legacy migration, and child sync passed');
