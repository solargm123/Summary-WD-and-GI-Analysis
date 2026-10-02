const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('map-release/global-irradiance-analysis.html','utf8'),dom=new JSDOM(html,{url:'https://example.test/global?project=p1',runScripts:'outside-only'}),w=dom.window,ctx=dom.getInternalVMContext();
w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};let saves=0;w.structuredClone=structuredClone;w.lucide={createIcons(){}};w.Chart=function(){return {destroy(){},update(){},data:{datasets:[]}}};
w.SolarCloud={session:async()=>null,initAnalysis(type,a){w.adapter=a},roleCanEdit:()=>true,roleCanAdmin:()=>true,scheduleSave(){saves++}};
for(const path of ['gi-average.js','../solar-ui-pr-sept29/gi-review.js'])vm.runInContext(fs.readFileSync('map-release/'+path,'utf8'),ctx);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){new vm.Script(m[1]);if(m[1].trim())vm.runInContext(m[1],ctx);}
const dates={'2026-09-01':4.137,'2026-09-02':2.537},base={plants:{Capsule:{capacity:100,province:'ชลบุรี',note:'legacy',dates}},dates:Object.keys(dates),loadedMonth:'2026-09'};
const state={minIrr:3,maxIrr:7,filters:{years:['2026'],months:['09'],days:[]},selectedPlants:['Capsule']};
(async()=>{
 await w.adapter.restore(base,state);assert.equal(w.document.querySelector('td.col-avg').textContent,'4.137');
 const input=w.document.querySelector('.data-note-input');input.value='September note';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.ok(saves>0);
 const saved=w.adapter.capture().userState;assert.equal(saved.overrides.Capsule.monthlyNotes['2026-09'],'September note');
 await w.adapter.restore({...base,loadedMonth:'2026-10',dates:['2026-10-01'],plants:{Capsule:{capacity:100,province:'ชลบุรี',note:'legacy',dates:{'2026-10-01':5}}}},{...saved,filters:{years:['2026'],months:['10'],days:[]}});
 assert.equal(w.document.querySelector('.data-note-input').value,'');
 await w.adapter.restore(base,saved);assert.equal(w.document.querySelector('.data-note-input').value,'September note');assert.ok(w.document.querySelector('.data-note-input').title.includes('legacy'));
 vm.runInContext(fs.readFileSync('map-release/gi-map-data.js','utf8'),ctx);
 const options={min:3,max:7,selectedDates:Object.keys(dates),reviews:{}};
 let data=w.GIMapData.build({plants:base.plants,dates:base.dates},[{id:'a',standard_name:'Capsule'}],[],[],{}, {},{},options);
 assert.equal(data[0].irradiance['2026']['09'],4.137);
 options.reviews={Capsule:{days:{'2026-09-02':{confirmed:true,valueKey:'2.537'}}}};
 data=w.GIMapData.build({plants:base.plants,dates:base.dates},[{id:'a',standard_name:'Capsule'}],[],[],{}, {},{},options);assert.equal(data[0].irradiance['2026']['09'].toFixed(3),'3.337');
 dom.window.close();console.log('PASS: table and Map share Average, accepted low-GI included, note captures on input, persists through reload/month change, legacy note retained.');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
