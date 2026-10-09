const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'solar-check-'));
const pages=['index.html','solar-center.html','working-day-analysis.html','global-irradiance-analysis.html','pr-report-r4.html','inverter-report.html'],scripts=['cloud-core.js','solar-shell.js','working-day-summary.js','working-day-period.js','inverter-shared-preferences.js'];
const run=()=>{const result=spawnSync(process.execPath,[path.join(__dirname,'check.cjs'),root],{encoding:'utf8'});return{...result,report:JSON.parse(result.stdout)}};
try{
 for(const file of pages)fs.writeFileSync(path.join(root,file),'<html><body><div id="once"></div><script>const valid=1;</script></body></html>');for(const file of scripts)fs.writeFileSync(path.join(root,file),'const valid=1;');
 assert.equal(run().status,0);
 fs.writeFileSync(path.join(root,'index.html'),'<div id="twice"></div><div id="twice"></div><script>const =;</script><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
 let result=run();assert.equal(result.status,1);for(const code of ['duplicate-id','syntax','floating-cdn'])assert(result.report.findings.some(x=>x.code===code));
 const secret='sb_secret_'+('dummy'.repeat(8));fs.writeFileSync(path.join(root,'cloud-core.js'),'const key="'+secret+'";');result=run();assert(result.report.findings.some(x=>x.code==='private-key'));assert(!result.stdout.includes(secret));
 fs.unlinkSync(path.join(root,'solar-shell.js'));assert(run().report.findings.some(x=>x.code==='missing'));
 console.log('Checker self-test: clean input, syntax error, duplicate ID, floating CDN, redacted secret, missing coverage passed');
}finally{fs.rmSync(root,{recursive:true,force:true});}
