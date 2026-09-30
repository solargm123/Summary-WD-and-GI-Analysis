const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
(async()=>{
 const pure={};vm.runInNewContext(fs.readFileSync('gi-review.js','utf8'),pure);const g=pure.GiReview;
 assert.equal(g.confirmed({confirmed:true,valueKey:'2'},2),true);assert.equal(g.confirmed({confirmed:true,valueKey:'2'},3),false);
 for(const x of [undefined,null,'',NaN,-1])assert.equal(g.valid(x),false);
 const html=fs.readFileSync('global-irradiance-analysis.html','utf8'),dom=new JSDOM(html,{url:'http://gi.test/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.HTMLCanvasElement.prototype.getContext=()=>({});w.Chart=class{destroy(){}};w.lucide={createIcons(){}};
 let canEdit=true;const saves=[];
 w.SolarCloud={getLanguage:()=> 'th',session:async()=>null,roleCanEdit:()=>canEdit,collaborationActor:()=>({userId:'test-user',name:'Test reviewer'}),confirmDialog:async()=>true,notice:()=>{},scheduleSave:r=>saves.push(r),initAnalysis:(type,adapter)=>w.testAdapter=adapter};
 vm.runInContext(fs.readFileSync('gi-review.js','utf8'),dom.getInternalVMContext());
 vm.runInContext([...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),dom.getInternalVMContext());
 const base={plants:{A:{capacity:100,province:'กรุงเทพมหานคร',dates:{'2026-09-01':2,'2026-09-02':5}},B:{capacity:50,province:'กรุงเทพมหานคร',dates:{'2026-09-01':null,'2026-09-02':4}}},dates:['2026-09-01','2026-09-02'],loadedMonth:'2026-09'};
 const q=s=>d.querySelector(s),qa=s=>d.querySelectorAll(s),average=()=>q('#tableBody tr .col-avg').textContent;
 await w.testAdapter.restore(base,{minIrr:3.5,maxIrr:7});assert.equal(qa('#tableBody tr').length,2);assert.equal(average(),'5.000');
 // Exercise the same button handlers that a real click invokes.
 await q('.gi-review-btn[data-plant="A"]').onclick();assert.equal(q('.gi-review-btn[data-plant="A"]').className,'gi-review-btn reviewed');
 assert.equal(qa('#tableBody tr:first-child .anomaly-cell').length,1);assert.equal(average(),'5.000');
 await q('.gi-day-btn[data-plant="A"]').onclick();assert.equal(average(),'3.500');
 const saved=w.testAdapter.capture().userState;assert.equal(saved.overrides.A.giReview.days['2026-09-01'].userId,'test-user');
 await w.testAdapter.restore(base,saved);assert.equal(q('.gi-day-btn[data-plant="A"]').className,'gi-day-btn accepted');
 w.updateCellData('A','2026-09-01','2.1');assert.equal(q('.gi-review-btn[data-plant="A"]').className,'gi-review-btn recheck');assert.equal(average(),'5.000');
 w.updateCellData('A','2026-09-01','2');assert.equal(q('.gi-review-btn[data-plant="A"]').className,'gi-review-btn recheck');assert.equal(q('.gi-day-btn[data-plant="A"]').className,'gi-day-btn ');
 q('#giReviewFilter').value='recheck';w.Function(q('#giReviewFilter').getAttribute('onchange')).call(q('#giReviewFilter'));assert.equal(qa('#tableBody tr').length,1);
 const september=w.testAdapter.capture().userState;
 const october={plants:{A:{capacity:100,province:'กรุงเทพมหานคร',dates:{'2026-10-01':5}}},dates:['2026-10-01'],loadedMonth:'2026-10'};
 await w.testAdapter.restore(october,september);const next=w.testAdapter.capture().userState;assert.deepEqual(next.overrides.A.giReview,september.overrides.A.giReview);
 // Unseen plants and prior-month edits survive partial loads.
 const prior=JSON.parse(JSON.stringify(saved));prior.overrides.A.dates={'2026-08-01':4};prior.overrides.Z={dates:{'2026-08-01':5}};
 await w.testAdapter.restore(october,prior);assert.equal(w.testAdapter.capture().userState.overrides.A.dates['2026-08-01'],4);assert.equal(w.testAdapter.capture().userState.overrides.Z.dates['2026-08-01'],5);
 canEdit=false;await w.testAdapter.restore(base,{minIrr:3.5,maxIrr:7});await w.confirmGiDay('A','2026-09-01');await w.confirmGiMonth('A');assert.equal(q('.gi-day-btn[data-plant="A"]').disabled,true);assert.equal(Object.keys(w.testAdapter.capture().userState.overrides).length,0);
 dom.window.close();
 const pr=fs.readFileSync('pr-report-r4.html','utf8'),fn=pr.match(/function passes\(r\)\{[^\n]+/)[0],pctx={state:{settings:{minGi:3.5,minSpecific:2.5}},effectiveGi:r=>r.gi,effectiveSpecific:r=>r.specific};vm.runInNewContext(fn,pctx);
 assert.equal(pctx.passes({gi:2,specific:4,confirmed:true}),false);assert.equal(pctx.passes({gi:5,specific:2,confirmed:true}),false);assert.equal(pctx.passes({gi:5,specific:3,confirmed:true}),true);
 console.log('PASS: daily acceptance, independent monthly review, edit/revert invalidation, filter, restore, partial-month preservation, viewer guard, PR thresholds');
})().catch(e=>{console.error(e);process.exit(1)});
