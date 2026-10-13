const assert = require('node:assert/strict');
const motion = require('./clock-transition.js');
const near = (a,b,tolerance=1e-7) => assert(Math.abs(a-b)<tolerance, `${a} != ${b}`);
const variants = [undefined, {arc:0,turn:0,shrink:0,stagger:0,tempo:0,elastic:0},
 {arc:.24,turn:.6,shrink:.6,stagger:.06,tempo:.7,elastic:1}];
for (const options of variants) {
 for (let minutes=0;minutes<1440;minutes++) {
  const nodes=motion.forTime(minutes,options);
  if(Math.abs(nodes[0].start.x-nodes[1].start.x)>.001){
   assert((nodes[0].start.x-nodes[1].start.x)*(nodes[0].target.x-nodes[1].target.x)>0,'hands trade sides');
  }
  for (const node of nodes) {
   const start=motion.at(node,0), closed=motion.at(node,.75), end=motion.at(node,1);
   near(start.x,node.start.x);near(start.y,node.start.y);near(start.angle,node.start.angle);
   near(start.width,node.start.width);near(start.height,7);
   near(closed.x,node.target.x);near(closed.y,node.target.y);near(closed.width,49);near(closed.height,7);
   near(Math.sin(closed.angle),0);assert(Math.abs(node.delta)<=Math.PI/2+1e-9);
   near(end.width,49);near(end.height,82);near(end.radius,24.5);
   near(end.bend,0);
   if(node.turnDuration===.2 && node.options.elastic===0)near(Math.sin(motion.at(node,.2).angle),0);
   assert.deepEqual(motion.at(node,10),end);
   let previousProgress=0;
   for (let frame=0;frame<=60;frame++) {
    const state=motion.at(node,frame/60);
    assert(Object.values(state).every(Number.isFinite));
    assert(state.progress>=previousProgress-1e-9,'path reverses');
    previousProgress=state.progress;
    assert(state.width>=49-1e-7 && state.height>=7-1e-7);
    assert(Math.hypot(state.x,state.y)+Math.hypot(state.width,state.height)/2+Math.abs(state.bend)<195,'shape leaves circular screen');
   }
   // The same shape crosses the motion/opening boundary with no position, size or angle jump.
   const before=motion.at(node,.75-1e-6),after=motion.at(node,.75+1e-6);
   for(const key of ['x','y','angle','width','height','bend'])near(before[key],after[key],1e-6);
  }
 }
}
function centerline(state){
 return Array.from({length:41},(_,i)=>{
  const u=i/40,x=(state.width-state.height)*(u-.5),y=-state.bend/2+4*state.bend*u*(1-u);
  return [state.x+x*Math.cos(state.angle)-y*Math.sin(state.angle),state.y+x*Math.sin(state.angle)+y*Math.cos(state.angle)];
 });
}
for(const options of variants){
 const nodes=motion.forTime(610,options);
 assert(nodes[0].target.x<0 && nodes[1].target.x>0,'10:10 must stay on its original sides');
 for(let frame=24;frame<=90;frame++){
  const a=centerline(motion.at(nodes[0],frame/120)),b=centerline(motion.at(nodes[1],frame/120));
  for(const p of a)for(const q of b)assert(Math.hypot(p[0]-q[0],p[1]-q[1])>9,'10:10 curves merge after the quick turn');
 }
}
// Default micro motion is below one design pixel at the rendered centerline, not a large bounce.
for(const minutes of [0,195,390,610,885]){
 const active=motion.forTime(minutes),off=motion.forTime(minutes,{elastic:0});
 for(let frame=0;frame<=300;frame++)for(let i=0;i<2;i++){
  const a=centerline(motion.at(active[i],frame/300)),b=centerline(motion.at(off[i],frame/300));
  a.forEach((p,j)=>assert(Math.hypot(p[0]-b[j][0],p[1]-b[j][1])<1,'default elasticity is too large'));
 }
}
console.log('PASS: all 1,440 times and parameter bounds; 10:10 side-preserving clearance; 0.2-second turn; subpixel elasticity; continuous 1-second finish.');
