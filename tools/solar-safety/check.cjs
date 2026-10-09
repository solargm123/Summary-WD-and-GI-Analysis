#!/usr/bin/env node
'use strict';
// Read-only baseline check. No network, installs, DB calls, or code execution.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.argv[2]||process.cwd());
const pages=['index.html','solar-center.html','working-day-analysis.html','global-irradiance-analysis.html','pr-report-r4.html','inverter-report.html'];
const scripts=['cloud-core.js','solar-shell.js','working-day-summary.js','working-day-period.js','inverter-shared-preferences.js'];
const findings=[],files=[];let compiled=0;
function add(level,file,code,detail){findings.push({level,file,code,detail});}
function compile(source,file){try{new vm.Script(source,{filename:file});compiled++;}catch(error){add('error',file,'syntax',error.name+': '+error.message);}}
for(const file of [...pages,...scripts]){
 const full=path.join(root,file);if(!fs.existsSync(full)){add('error',file,'missing','Required current app file is absent; coverage incomplete');continue;}
 const text=fs.readFileSync(full,'utf8');files.push({file,bytes:Buffer.byteLength(text)});
 if(file.endsWith('.js'))compile(text,file);
 else{
  let i=0;for(const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   const attrs=match[1],body=match[2];i++;
   if(!/\bsrc\s*=/.test(attrs)&&body.trim()&&!/type\s*=\s*["'](?:application\/ld\+json|application\/json|importmap)["']/i.test(attrs))compile(body,file+'#script'+i);
  }
  const markup=text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<!--[\s\S]*?-->/g,''),ids=new Set();
  for(const match of markup.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)){if(ids.has(match[2]))add('error',file,'duplicate-id',match[2]);ids.add(match[2]);}
  for(const match of text.matchAll(/<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi)){
   const src=match[2];if(/supabase-js@2(?:[\/"'?]|$)/.test(src))add('warn',file,'floating-cdn','Supabase CDN major version is not pinned to a specific release');
  }
 }
 if(/\bsb_secret_[A-Za-z0-9_-]{16,}\b/.test(text))add('error',file,'private-key','A secret-key-shaped value is present; value redacted');
 for(const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){
  try{const payload=JSON.parse(Buffer.from(match[0].split('.')[1],'base64url').toString());if(payload.role==='service_role')add('error',file,'service-role','Service-role JWT in frontend; value redacted');}catch{}
 }
}
const report={kind:'static-baseline-only',root,files,compiledScripts:compiled,findings,errors:findings.filter(x=>x.level==='error').length,warnings:findings.filter(x=>x.level==='warn').length,
 notTested:['Authenticated browser workflows','Database RLS enforcement','Engineering formula correctness','Real Excel import/export','Concurrency under real users','Measured browser RAM/CPU']};
console.log(JSON.stringify(report,null,2));process.exitCode=report.errors?1:0;
