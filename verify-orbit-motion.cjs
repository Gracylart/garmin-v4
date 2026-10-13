const assert=require('node:assert/strict');
const motion=require('./orbit-motion.js');
assert.equal(motion.closedAt,25/30);
assert.equal(motion.eyeOpen(0),0);
assert.equal(motion.eyeOpen(1),1);
for(let minutes=0;minutes<1440;minutes++){
 const hands=motion.handsAt(minutes);
 for(let index=0;index<2;index++){
  const hand=hands[index],start=motion.poseAt(hand,0),end=motion.poseAt(hand,motion.closedAt);
  assert.deepEqual(start.slice(0,2),[0,0]);
  assert(Math.abs(start[6]-Math.cos(hand.angle)*hand.length)<1e-9);
  assert(Math.abs(start[7]-Math.sin(hand.angle)*hand.length)<1e-9);
  const eyeX=index===0?49:-49;
  const left=eyeX-24.5,right=eyeX+24.5;
  assert.deepEqual([end[0],end[1],end[6],end[7]],[left,-18,right,-18]);
  assert(Math.abs(end[2]-(left+49/3))<1e-6);
  assert(Math.abs(end[4]-(right-49/3))<1e-6);
  for(let frame=0;frame<=50;frame++){
   const pose=motion.poseAt(hand,frame/60);
   assert(pose.every(Number.isFinite));
   assert(pose.every(n=>Math.abs(n)<190));
  }
  for(const key of hand.keys.slice(1,-1)){
   const before=motion.poseAt(hand,key[0]-1e-5),after=motion.poseAt(hand,key[0]+1e-5);
   assert(Math.max(...before.map((n,j)=>Math.abs(n-after[j])))<.1,'continuous at phase boundary');
  }
 }
}
const example=motion.handsAt(390);
assert(motion.poseAt(example[0],.5)[0]<0);
assert(motion.poseAt(example[1],.5)[0]>0);
assert(Math.abs(motion.poseAt(example[0],.76)[0]-motion.poseAt(example[1],.76)[0])<1);
console.log('PASS: 1-second path, all 1,440 times, continuous phases, swapped eye endpoints');
