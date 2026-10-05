'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {packDaily,unpackDaily,encodeDecimal}=require('./inverter-compact-codec.cjs');
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const packed=packDaily(input),restored=unpackDaily(JSON.parse(JSON.stringify(packed)));
assert.equal(restored.length,input.length);
for(let i=0;i<input.length;i++) assert.deepEqual(restored[i],input[i]);
function monthly(rows){const result=new Map();for(const r of rows){const k=JSON.stringify([r.project,r.device,r.date.slice(0,7)]);const a=result.get(k)||{pv:0,grid:0,count:0};a.pv+=r.yield??0;a.grid+=r.gridDuration??0;a.count++;result.set(k,a);}return result;}
assert.deepEqual(monthly(restored),monthly(input));
assert.equal(encodeDecimal(0,2),'0');
assert.equal(encodeDecimal(null,2),null);
assert.equal(encodeDecimal('42931110.82',2),'4293111082');
assert.throws(()=>encodeDecimal('1.234',2),/Precision/);
assert.throws(()=>encodeDecimal('99999999999999999999',2),/overflow/);
console.log(JSON.stringify({version:'compact-adapter-test-v1',rows:input.length,devices:packed.devices.length,sources:packed.sources.length,monthlyGroups:monthly(input).size,allFieldsIdentical:true,monthlyTotalsIdentical:true,zeroNullAndLargeNumbers:true,extraPrecisionRejected:true}));
