'use strict';
// Experimental adapter only; not loaded by the production application.
const FIELDS = ['capacity','yield','totalYield','specific','peakAC','gridDuration'];
const DIGITS = [3,2,2,3,3,3];
function encodeDecimal(value, digits) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value);
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new Error('Unsupported decimal: ' + text);
  let fraction = match[3] || '';
  if (fraction.length > digits && /[1-9]/.test(fraction.slice(digits))) throw new Error('Precision exceeds storage scale: ' + text);
  fraction = fraction.slice(0,digits).padEnd(digits,'0');
  const scaled = BigInt((match[1] || '') + match[2] + fraction);
  if (scaled < -9223372036854775808n || scaled > 9223372036854775807n) throw new Error('BIGINT overflow');
  return scaled.toString(); // JSON-safe; no unsafe integer conversion.
}
function decodeDecimal(value, digits) {
  if (value === null) return null;
  const number = BigInt(value), sign = number < 0n ? '-' : '';
  const text = (number < 0n ? -number : number).toString().padStart(digits+1,'0');
  const result = Number(sign + text.slice(0,-digits) + '.' + text.slice(-digits));
  if (!Number.isFinite(result)) throw new Error('Invalid restored number');
  return result;
}
function packDaily(records) {
  const devices=[],sources=[],deviceIndex=new Map(),sourceIndex=new Map();
  const rows=records.map(r=>{
    const key=JSON.stringify([r.project,r.device]);
    if(!deviceIndex.has(key)){deviceIndex.set(key,devices.length);devices.push([r.project,r.device]);}
    const source=r.sourceFile || '';
    if(!sourceIndex.has(source)){sourceIndex.set(source,sources.length);sources.push(source);}
    return [deviceIndex.get(key),r.date,...FIELDS.map((f,i)=>encodeDecimal(r[f],DIGITS[i])),sourceIndex.get(source),r.sourceRow ?? null];
  });
  return {format:'InverterCompactTest',version:1,digits:DIGITS,devices,sources,rows};
}
function unpackDaily(packed) {
  if(packed.format!=='InverterCompactTest'||packed.version!==1) throw new Error('Unsupported compact format');
  return packed.rows.map(a=>{
    if(!packed.devices[a[0]]||packed.sources[a[8]]===undefined) throw new Error('Invalid dictionary reference');
    const [project,device]=packed.devices[a[0]];
    const r={project,device,date:a[1],sourceFile:packed.sources[a[8]],sourceRow:a[9]};
    FIELDS.forEach((f,i)=>r[f]=decodeDecimal(a[i+2],DIGITS[i]));
    return r;
  });
}
module.exports={packDaily,unpackDaily,encodeDecimal,decodeDecimal};
