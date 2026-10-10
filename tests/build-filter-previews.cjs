const fs=require('node:fs');
for(const [source,target] of [['global-irradiance-analysis.html','gi-ui-test.html'],['working-day-analysis.html','working-day-ui-test.html'],['pr-report-r4.html','pr-report-ui-test.html'],['inverter-report.html','inverter-ui-test.html']]){
 const prior=fs.readFileSync(target,'utf8');
 const fixture=source==='inverter-report.html'?prior.match(/<script>state\.daily=SolarUITest[\s\S]*?<\/script>/)?.[0]||'':'';
 let html=fs.readFileSync(source,'utf8').replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="connect-src 'none'; form-action 'none'; base-uri 'self'"><script src="solar-test-sandbox.js"></script>`);
 html=html.replace(/<script\b[^>]*src=["'][^"']*(?:cloud-core\.js|@supabase\/supabase-js)[^"']*["'][^>]*>\s*<\/script>/g,'');
 html=html.replace('</body>',fixture+'<script src="solar-test-controls.js"></script></body>');
 fs.writeFileSync(target,html);
}
console.log('Built isolated synthetic previews; production API blocked by CSP and sandbox.');
