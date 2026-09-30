/* GI acceptance and monthly review are independent; records live in GI overrides. */
(function(root){
  'use strict';
  const valid=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0;
  const valueKey=value=>valid(value)?String(Number(value)):'missing';
  function confirmed(entry,value){return valid(value)&&entry?.confirmed===true&&entry.valueKey===valueKey(value)}
  function monthSnapshot(values,dates,month){
    const keys=[...new Set([...dates,...Object.keys(values||{})])].filter(date=>date.startsWith(month+'-')).sort();
    return keys.map(date=>`${date}:${valueKey(values?.[date])}`).join('|');
  }
  function monthStatus(entry,snapshot){return !entry?.reviewed?'unreviewed':!entry.needsRecheck&&entry.snapshot===snapshot?'reviewed':'recheck'}
  root.GiReview={valid,valueKey,confirmed,monthSnapshot,monthStatus};
})(typeof window==='undefined'?globalThis:window);
