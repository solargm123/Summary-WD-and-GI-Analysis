(function(global){
'use strict';
function create(bounds){
 const placed=[],gap=6;
 function fits(r){return (!bounds||(r.x>=8&&r.y>=8&&r.x+r.w<=bounds.x-8&&r.y+r.h<=bounds.y-8))&&!placed.some(p=>r.x<p.x+p.w+gap&&r.x+r.w+gap>p.x&&r.y<p.y+p.h+gap&&r.y+r.h+gap>p.y)}
 function place(point,size,anchor){
  if(bounds&&(point.x<0||point.y<0||point.x>bounds.x||point.y>bounds.y))return null;
  const base={x:point.x-anchor[0],y:point.y-anchor[1],w:size[0],h:size[1]},candidates=[base];
  for(let ring=1;ring<=12;ring++){const dx=ring*(size[0]+gap),dy=ring*(size[1]+gap);for(let step=-ring;step<=ring;step++){const sx=step*(size[0]+gap),sy=step*(size[1]+gap);candidates.push({...base,x:base.x+sx,y:base.y-dy},{...base,x:base.x+sx,y:base.y+dy},{...base,x:base.x-dx,y:base.y+sy},{...base,x:base.x+dx,y:base.y+sy})}}
  candidates.sort((a,b)=>Math.hypot(a.x-base.x,a.y-base.y)-Math.hypot(b.x-base.x,b.y-base.y));
  const result=candidates.find(fits);if(!result)return null;placed.push(result);return {rect:result,anchor:[point.x-result.x,point.y-result.y],moved:result.x!==base.x||result.y!==base.y};
 }
 return {place,rectangles:placed};
}
global.GIMapLabelLayout={create};
})(typeof window==='undefined'?globalThis:window);
