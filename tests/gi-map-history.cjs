const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=dom.window;
vm.runInContext(fs.readFileSync('map-release/gi-map-data.js','utf8'),dom.getInternalVMContext());
const full={plants:{A:{capacity:100,dates:{'2023-03-21':5,'2026-09-01':4}},B:{dates:{'2026-09-01':null}}},dates:['2023-03-21','2026-09-01']};
const central=[{id:'a',standard_name:'A'},{id:'b',standard_name:'B'},{id:'c',standard_name:'C'}];
const rows=[{project_id:'a',ordinal:1,latitude:13,longitude:100},{project_id:'a',ordinal:2,latitude:13.01,longitude:100.01}];
const data=w.GIMapData.build(full,central,[],rows,{A:{dates:{'2026-09-01':6}}},{},{});
assert.equal(data.length,3);assert.equal(data[0].irradiance['2023']['03'],5);assert.equal(data[0].irradiance['2026']['09'],6);assert.equal(data[0].meta.points.length,2);assert.equal(data[1].latitude,null);assert.equal(data[1].irradiance['2026']['09'],null);assert.equal(data[2].projectName,'C');assert.equal(full.plants.A.dates['2026-09-01'],4);
dom.window.close();console.log('PASS: independent full history, missing projects retained, current edits overlaid, multiple points and source unchanged.');
