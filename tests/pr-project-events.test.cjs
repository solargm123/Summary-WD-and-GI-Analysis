const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(process.argv[2]||path.join(__dirname,'../pr-report-r4.html')),'utf8');
const decode=s=>s.replace(/&(?:amp|lt|gt|quot|#39);/g,e=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[e]));
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const names=['ACE','โรงงาน A & B',"O'Brien",'Project "quoted"',"demo');globalThis.syntheticMarker=1;//",'\"><img src=x onerror=globalThis.syntheticMarker=2>'];
const elements={plantSearch:{value:''},compareSearch:{value:''},plantPicker:{},comparePicker:{},plantCount:{},displayMode:{value:'all'}};
const ctx={$:id=>elements[id],norm:v=>v.toLowerCase(),allProjectNames:()=>names,mainPlantDraft:new Set(),compareDraft:new Set(),mainPlantTouched:false,esc,tr:(_a,b)=>b,SolarCloud:{notice(){ctx.notices++}},notices:0};
vm.createContext(ctx);
for(const name of ['renderPlantPicker','togglePlant','renderComparePicker','toggleCompare']){
 const line=source.split('\n').find(l=>l.startsWith(`function ${name}(`));assert(line,name);vm.runInContext(line,ctx);
}
function inputs(html){return [...html.matchAll(/<input\b([^>]+)>/g)].map(m=>{const a={};for(const t of m[1].matchAll(/([\w-]+)="([^"]*)"/g))a[t[1]]=decode(t[2]);return {dataset:{project:a['data-project']},handler:a.onchange,checked:false};});}
function change(input,checked){input.checked=checked;vm.runInContext('(function(){'+input.handler+'}).call(currentInput)',Object.assign(ctx,{currentInput:input}));}
vm.runInContext('renderPlantPicker();renderComparePicker()',ctx);
const plants=inputs(elements.plantPicker.innerHTML),compare=inputs(elements.comparePicker.innerHTML);
assert.equal(plants.length,names.length);assert.equal(compare.length,names.length);
for(let i=0;i<names.length;i++){change(plants[i],true);assert(ctx.mainPlantDraft.has(names[i]));assert.equal(plants[i].dataset.project,names[i]);change(plants[i],false);assert(!ctx.mainPlantDraft.has(names[i]));change(compare[i],true);assert(ctx.compareDraft.has(names[i]));change(compare[i],false);}
assert.equal(ctx.syntheticMarker,undefined,'Project text must never execute');
elements.compareSearch.value='ACE';vm.runInContext('renderComparePicker()',ctx);change(inputs(elements.comparePicker.innerHTML)[0],true);
elements.compareSearch.value="O'Brien";vm.runInContext('renderComparePicker()',ctx);change(inputs(elements.comparePicker.innerHTML)[0],true);
assert(ctx.compareDraft.has('ACE'));assert(ctx.compareDraft.has("O'Brien"));assert.equal(elements.compareSearch.value,"O'Brien");
ctx.compareDraft.clear();for(let i=0;i<5;i++)change(compare[i],true);assert.equal(ctx.compareDraft.size,4);assert.equal(compare[4].checked,false);assert.equal(ctx.notices,1);
const note=source.match(/<button class="btn"[^>]*openTableNote[^>]*>/)[0];
const rendered=vm.runInContext('`'+note+'`',Object.assign(ctx,{x:{project:names[4]}}));
const attrs={};for(const a of rendered.matchAll(/([\w-]+)="([^"]*)"/g))attrs[a[1]]=decode(a[2]);
ctx.currentInput={dataset:{noteProject:attrs['data-note-project']}};ctx.event={stopPropagation(){}};ctx.openTableNote=p=>ctx.noteProject=p;
vm.runInContext('(function(){'+attrs.onclick+'}).call(currentInput)',ctx);assert.equal(ctx.noteProject,names[4]);assert.equal(ctx.syntheticMarker,undefined);
console.log('PASS: exact project names, injection fixture, multiple search selections, four-project limit, and note target (synthetic VM; no API/DB)');
