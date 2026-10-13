const assert=require('node:assert/strict');
const {handsAt,segment,ease}=require('./clock-lab.js');
const settings=[
 {arc:0,bend:0,anticipation:0,rotationLag:0,lengthLag:0,thickness:0,easing:'balanced'},
 {arc:24,bend:11,anticipation:6,rotationLag:.12,lengthLag:.2,thickness:2,easing:'balanced'},
 {arc:56,bend:24,anticipation:16,rotationLag:.35,lengthLag:.35,thickness:5,easing:'poised'}
];
const noon=handsAt(720);
assert(segment(noon[0],.53,settings[1]).cx<-20);
assert(segment(noon[1],.48,settings[1]).cx>20);
for(const mode of ['balanced','quick','poised']){
 assert.equal(ease(0,mode),0);assert.equal(ease(1,mode),1);
 let previous=0;for(let i=1;i<=100;i++){const value=ease(i/100,mode);assert(value>=previous);previous=value;}
}
for(let minute=0;minute<1440;minute++)for(const hand of handsAt(minute))for(const config of [null,...settings]){
 const start=segment(hand,0,config),end=segment(hand,1,config);
 assert(Math.abs(start.x1)<1e-8&&Math.abs(start.y1)<1e-8,'start at clock center');
 assert(Math.abs(start.x2-Math.cos(hand.angle)*hand.length)<1e-8);
 assert(Math.abs(start.y2-Math.sin(hand.angle)*hand.length)<1e-8);
 assert(Math.abs(end.cx-hand.side*49)<1e-8&&Math.abs(end.cy+18)<1e-8,'eye center');
 assert(Math.abs(end.y1-end.y2)<1e-8&&Math.abs(Math.abs(end.x2-end.x1)-42)<1e-8,'horizontal eye line');
 assert(Math.abs(end.width-7)<1e-8);
 for(let frame=0;frame<=20;frame++){
  const pose=segment(hand,frame/20,config);
  for(const value of Object.values(pose))assert(Number.isFinite(value));
 }
}
console.log('PASS: 1,440 times, both hands, four motion settings, finite curves and exact endpoints');
