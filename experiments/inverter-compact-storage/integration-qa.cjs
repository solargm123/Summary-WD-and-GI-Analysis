'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.JSDOM_PATH || 'jsdom');
const errors=[],downloads=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/navigation/.test(e.message))errors.push(e.message);});vc.on('error',e=>errors.push(String(e)));
const dom=new JSDOM(fs.readFileSync((process.env.INVERTER_PREVIEW_HTML || __dirname+'/../../inverter-analysis-compact-test.html'),'utf8'),{runScripts:'dangerously',url:'https://example.test/inverter-analysis-test.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.setImmediate=setImmediate;w.clearImmediate=clearImmediate;w.alert=x=>errors.push(String(x));w.confirm=()=>true;w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};w.ResizeObserver=class{observe(){}disconnect(){}};}});
async function blobBytes(blob){return new Promise((resolve,reject)=>{const r=new dom.window.FileReader();r.onload=()=>resolve(Buffer.from(r.result));r.onerror=reject;r.readAsArrayBuffer(blob);});}
(async()=>{
 const w=dom.window;if(w.document.readyState==='loading')await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));console.log('QA starting');
 const bytes=fs.readFileSync(process.argv[2]);w.__input=new w.Uint8Array(bytes);
 await w.eval('openCompressedWorkspaceFile(__input)');
 const baseline=w.eval('JSON.stringify(state.daily.map(({date,project,device,capacity,yield:y,totalYield,specific,peakAC,gridDuration,sourceFile,sourceRow})=>({date,project,device,capacity,yield:y,totalYield,specific,peakAC,gridDuration,sourceFile,sourceRow})))');
 function graph(){w.eval("ui.page='daily';ui.dailyProject='Yong Thai Rubber';setupDailySelection(true);ui.selectedMonths=new Set(['2026-09']);ui.selectedDevices=new Set(dailyDevices(ui.dailyProject));ui.hiddenDevices=new Set();renderDaily();");return w.document.getElementById('dailySvg').innerHTML;}
 const graphBefore=graph();assert(graphBefore.includes('daily-pt'));
 const monthlyBefore=w.eval('JSON.stringify(derivedMonthlyPeriods().flatMap(p=>monthlyAnalysis(p)))');
 // Metadata regression: stored notes and imported monthly rows stay separate.
 w.eval("state.monthlyNotes['2026-09|Yong Thai Rubber|INVERTER-01']='QA note';state.comments.push({text:'QA comment',project:'Yong Thai Rubber',date:'2026-09-04'});");
 const meta=w.eval('JSON.stringify({notes:state.monthlyNotes,comments:state.comments,settings:state.settings,monthly:state.monthly})');
 const payload=await w.InverterCompactPreview.pack();const serialized=JSON.stringify(payload);const zip=new w.JSZip();zip.file('compact.json',serialized);const packedBytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
 await w.InverterCompactPreview.open(packedBytes);
 assert.equal(w.eval('JSON.stringify(state.daily.map(({date,project,device,capacity,yield:y,totalYield,specific,peakAC,gridDuration,sourceFile,sourceRow})=>({date,project,device,capacity,yield:y,totalYield,specific,peakAC,gridDuration,sourceFile,sourceRow})))'),baseline);
 assert.equal(w.eval('JSON.stringify({notes:state.monthlyNotes,comments:state.comments,settings:state.settings,monthly:state.monthly})'),meta);
 w.eval("delete state.monthlyNotes['2026-09|Yong Thai Rubber|INVERTER-01'];");
 assert.equal(w.eval('JSON.stringify(derivedMonthlyPeriods().flatMap(p=>monthlyAnalysis(p)))'),monthlyBefore);
 assert.equal(graph(),graphBefore);
 // Render a real monthly table and chart through the application's original functions.
 w.eval("ui.page='monthly';ui.monthlySelectedPeriods=new Set(['2026-09']);$('monthlyProject').value='all';renderMonthly();");
 const monthlyRender=w.document.getElementById('page-monthly').innerHTML;
 assert(monthlyRender.includes('Yong Thai Rubber'));
 // Save and reopen the legacy .iaw using the application's original writer/reader.
 await w.eval('saveCompressedWorkspace({quiet:true})');const iaw=await blobBytes(downloads.at(-1));
 w.__saved=new w.Uint8Array(iaw);await w.eval('openCompressedWorkspaceFile(__saved)');
 assert.equal(w.eval('state.daily.length'),346182);
 assert.equal(w.eval('JSON.stringify(state.daily.map(({date,project,device,capacity,yield:y,totalYield,specific,peakAC,gridDuration,sourceFile,sourceRow})=>({date,project,device,capacity,yield:y,totalYield,specific,peakAC,gridDuration,sourceFile,sourceRow})))'),baseline);
 // Generate the presentation XLSX using the original report export path.
 w.eval("document.querySelector('input[name=reviewDataMode][value=monthly]').checked=true;document.querySelector('input[name=reviewScope][value=all]').checked=true;$('reviewExportYear').innerHTML='<option value=2026>2026</option>';$('reviewExportMonth').innerHTML='<option value=09>09</option>';$('reviewReportStyle').value='simple';");
 await w.eval('exportReviewExcel()');assert.equal(errors.length,0,errors.join('\n'));
 const xlsx=await blobBytes(downloads.at(-1));fs.writeFileSync('/tmp/inverter-compact-qa.xlsx',xlsx);
 console.log(JSON.stringify({rows:346182,rawFieldsIdentical:true,monthlyAnalysisIdentical:true,metadataPreserved:true,monthlyTableRendered:true,dailyGraphIdentical:true,legacyIawFieldsIdentical:true,legacyIawSavedAndReopened:true,xlsxGeneratedBytes:xlsx.length,compactTestZipBytes:packedBytes.length,errors}));w.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
