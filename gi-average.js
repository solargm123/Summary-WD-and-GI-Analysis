(function(root){
'use strict';
function calculate(values,dates,options={}){
 let sum=0,count=0,available=0;
 const min=Number(options.min??1),max=Number(options.max??7);
 for(const day of dates){const raw=values?.[day];if(raw===null||raw===undefined||raw===''||!Number.isFinite(Number(raw))||Number(raw)<0)continue;
  available++;const value=Number(raw),entry=options.acceptances?.[day];
  const accepted=entry?.confirmed===true&&entry.valueKey===String(value);
  if((value>=min&&value<=max)||accepted){sum+=value;count++;}
 }
 return {average:count?sum/count:available?0:null,sum,count,available};
}
root.GiAverage={calculate};
})(typeof window==='undefined'?globalThis:window);
