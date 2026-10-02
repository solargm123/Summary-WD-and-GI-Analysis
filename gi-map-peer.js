(function(root){
  'use strict';
  const median=values=>{const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length?(a.length%2?a[m]:(a[m-1]+a[m])/2):null};
  const site=p=>p.points?.length?p.points[0].lat.toFixed(6)+','+p.points[0].lng.toFixed(6):null;
  function distance(a,b){const rad=x=>x*Math.PI/180,dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng);const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)))}
  function compare(target,pool,dates){
    if(!site(target))return {level:'insufficient',difference:null,days:0,sites:0};
    const neighbors=new Map();
    for(const p of pool){const key=site(p);if(!key||key===site(target)||distance(target.points[0],p.points[0])>20)continue;if(!neighbors.has(key))neighbors.set(key,[]);neighbors.get(key).push(p)}
    let targetSum=0,referenceSum=0,days=0,minSites=Infinity;
    for(const day of dates){const own=target.dates[day];if(typeof own!=='number'||!Number.isFinite(own)||own<0)continue;const values=[];for(const group of neighbors.values()){const readings=group.map(p=>p.dates[day]).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);if(readings.length)values.push(median(readings))}if(values.length<3)continue;const baseline=median(values);if(!(baseline>0))continue;targetSum+=own;referenceSum+=baseline;days++;minSites=Math.min(minSites,values.length)}
    if(!days)return {level:'insufficient',difference:null,days:0,sites:neighbors.size};
    const difference=(targetSum/referenceSum-1)*100,epsilon=1e-8;
    const level=difference< -20-epsilon?'low':difference<= -10+epsilon?'watch':difference>20+epsilon?'high':'normal';
    return {level,difference,days,sites:minSites,targetAverage:targetSum/days,referenceAverage:referenceSum/days};
  }
  root.GiMapPeer={compare,distance,median};
})(typeof window==='undefined'?globalThis:window);
