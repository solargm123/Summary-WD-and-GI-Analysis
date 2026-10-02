const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
async function boot(project,remembered){
 const dom=new JSDOM('<button onclick="GIMapLauncher.open(this)">Map overview</button>',{url:'https://example.test/global?project='+project,runScripts:'outside-only'}),w=dom.window;
 if(remembered)w.sessionStorage.setItem('gi-map-open:p1','1');let loads=0;w.GIMapData={load:async()=>{loads++;return {projects:[]}}};
 vm.runInContext(fs.readFileSync('map-release/gi-map-launcher.js','utf8'),dom.getInternalVMContext());
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await Promise.resolve();await Promise.resolve();
 return {dom,w,loads};
}
(async()=>{let r=await boot('p1',true);assert.equal(r.loads,1);assert.ok(r.w.document.querySelector('iframe'));r.w.GIMapLauncher.back();assert.equal(r.w.sessionStorage.getItem('gi-map-open:p1'),null);assert.equal(r.w.document.querySelector('iframe'),null);r.dom.window.close();r=await boot('p2',true);assert.equal(r.loads,0);assert.equal(r.w.document.querySelector('iframe'),null);r.dom.window.close();r=await boot('p1',false);assert.equal(r.loads,0);r.dom.window.close();console.log('PASS: refresh restores Map once, Back clears restore, another project and normal Global opening remain unchanged.');})().catch(e=>{console.error(e);process.exitCode=1});
