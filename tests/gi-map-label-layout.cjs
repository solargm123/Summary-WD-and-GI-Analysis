const assert=require('node:assert/strict');
require('../gi-map-label-layout.js');
const layout=GIMapLabelLayout.create({x:1366,y:768});
for(let i=0;i<130;i++)layout.place({x:683,y:384},[150,54],[10,19]);
assert.ok(layout.rectangles.length>20);
const rows=layout.rectangles;
for(let i=0;i<rows.length;i++){
 const a=rows[i];assert.ok(a.x>=8&&a.y>=8&&a.x+a.w<=1358&&a.y+a.h<=760);
 for(let j=i+1;j<rows.length;j++){const b=rows[j];assert.ok(a.x+a.w+6<=b.x||b.x+b.w+6<=a.x||a.y+a.h+6<=b.y||b.y+b.h+6<=a.y);}
}
assert.equal(layout.place({x:-200,y:300},[150,54],[10,19]),null);
const small=GIMapLabelLayout.create({x:100,y:40});assert.equal(small.place({x:50,y:20},[150,54],[10,19]),null);
console.log('PASS: 130 colocated projects, bounded labels without overlap, safe overflow and offscreen fallback.');
