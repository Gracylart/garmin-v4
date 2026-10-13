const assert=require('node:assert/strict');const {Face,states,scripts,keys,frameDeadline}=require('./engine.js');
// Sample actual transformed curves, not just their untransformed endpoints.
class Probe {
 constructor(width){this.width=width;this.m=[1,0,0,1,0,0];this.stack=[];this.point=[0,0];this.samples=0;this.maxRadius=0;this.paths=0;}
 save(){this.stack.push(this.m.slice());}restore(){this.m=this.stack.pop();assert.ok(this.m);}
 translate(x,y){const m=this.m;m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;}
 scale(x,y){this.m[0]*=x;this.m[1]*=x;this.m[2]*=y;this.m[3]*=y;}
 rotate(a){const [x,y,z,w]=this.m,c=Math.cos(a),s=Math.sin(a);this.m[0]=x*c+z*s;this.m[1]=y*c+w*s;this.m[2]=z*c-x*s;this.m[3]=w*c-y*s;}
 beginPath(){this.paths++;}fill(){}stroke(){}fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite));}
 closePath(){}clip(){}
 sample(x,y){const m=this.m,xx=m[0]*x+m[2]*y+m[4],yy=m[1]*x+m[3]*y+m[5];assert.ok(Number.isFinite(xx)&&Number.isFinite(yy));const r=Math.hypot(xx-this.width/2,yy-this.width/2);this.maxRadius=Math.max(r,this.maxRadius);assert.ok(r<this.width*.65,`bounded geometry ${r}`);this.samples++;}
 moveTo(x,y){this.point=[x,y];this.sample(x,y);}lineTo(x,y){this.sample(x,y);this.point=[x,y];}
 bezierCurveTo(a,b,c,d,x,y){const [sx,sy]=this.point;for(let i=1;i<=12;i++){const t=i/12,u=1-t;this.sample(u*u*u*sx+3*u*u*t*a+3*u*t*t*c+t*t*t*x,u*u*u*sy+3*u*u*t*b+3*u*t*t*d+t*t*t*y);}this.point=[x,y];}
}
const input={bpm:150,activity:1,night:0};let frames=0,maxRadiusRatio=0,maxPaths=0;
const eyeProbe=new Face();const onlyEyes=new Probe(390);eyeProbe.draw(onlyEyes,390);assert.equal(onlyEyes.paths,2,'only two eye paths should be drawn');
const tapped=new Face();const firstTap=tapped.tap(1000);assert.notEqual(firstTap,'calm');assert.equal(tapped.state,firstTap);assert.notEqual(tapped.tap(1300),firstTap,'single taps should change expression');assert.equal(tapped.tap(1600),'rage');assert.equal(tapped.event,'rage');assert.equal(tapped.tap(3000)!=='rage',true,'tap sequence resets after timeout');
const slowTaps=new Face();slowTaps.tap(0);slowTaps.tap(600);assert.notEqual(slowTaps.tap(1200),'rage','three slow taps must not count as one burst');const quickTaps=new Face();quickTaps.tap(0);quickTaps.tap(400);assert.equal(quickTaps.tap(800),'rage');
const shaken=new Face();shaken.trigger('rage');for(let i=0;i<19;i++)shaken.update(1/60,input);const shake=[shaken.shakeX,shaken.shakeY];assert.ok(Math.hypot(...shake)>0);shaken.setState('happy');assert.deepEqual([shaken.shakeX,shaken.shakeY],shake,'interrupting shake has no instantaneous position jump');shaken.update(1/600,input);assert.ok(Math.hypot(shaken.shakeX,shaken.shakeY)<Math.hypot(...shake));
const staticFace=new Face();staticFace.setState('sleepy');staticFace.snap();assert.equal(staticFace.pose.lh,7);staticFace.tap(100);staticFace.snap();assert.equal(staticFace.pose.lh,states[staticFace.state].pose.lh||82,'paused tap presents its static eye shape');
const streak=new Face();streak.look(1,.5);for(let i=0;i<45;i++)streak.update(1/60,input);assert.ok(streak.pose.peek>90,'drag gaze reaches the outer eye range');const streakProbe=new Probe(390);streak.draw(streakProbe,390);assert.equal(streakProbe.paths,2,'drag paints only two eyes');streak.look(0,0,false);for(let i=0;i<90;i++)streak.update(1/60,input);assert.ok(Math.abs(streak.pose.peek)<1,'released gaze returns smoothly');
const celebration=new Face();celebration.trigger('cheer');for(let i=0;i<40;i++)celebration.update(1/60,input);const partyProbe=new Probe(390);celebration.draw(partyProbe,390);assert.equal(partyProbe.paths,2,'celebration paints no fireworks');assert.ok(Math.abs(celebration.wobbleX)+Math.abs(celebration.wobbleAngle)>.01,'celebration sways the eye pair');const wobble=[celebration.wobbleX,celebration.wobbleY,celebration.wobbleAngle];celebration.trigger('cheer');celebration.update(1/600,input);assert.ok(Math.abs(celebration.wobbleX-wobble[0])<1&&Math.abs(celebration.wobbleY-wobble[1])<1&&Math.abs(celebration.wobbleAngle-wobble[2])<.01,'restarting celebration preserves the current motion');
for(const [angle,explore] of [[.37,false],[1.91,true],[4.83,true]]){const f=new Face();f.raiseWrist(angle,explore);assert.equal(f.wakeAngle,angle);for(let i=0;i<180;i++)f.update(1/60,input);assert.equal(f.event,'wake');assert.ok(Math.abs(f.pose.peek)>15||Math.abs(f.pose.rise)>.3,'arbitrary angle gaze leaves center');const held=[f.target.peek,f.target.rise];for(let i=0;i<45;i++)f.update(1/60,input);if(explore)assert.ok(Math.hypot(f.target.peek-held[0],f.target.rise-held[1])>2,'exploring gaze moves near chosen angle');else assert.deepEqual([f.target.peek,f.target.rise],held,'fixed gaze holds');for(let i=0;i<165;i++)f.update(1/60,input);assert.equal(f.event,null);assert.ok(Math.abs(f.pose.peek)<1&&Math.abs(f.pose.rise)<.01,'gaze returns to center after five seconds');}
for(const mood of ['happy','sleepy']){const f=new Face();f.setState(mood);f.snap();const path=geometry(f)[0];assert.ok(path.length>0);}
const dodger=new Face();dodger.tickleAt(.8,.2);for(let i=0;i<45;i++)dodger.update(1/60,input);assert.ok(dodger.pose.peek< -50,'tickled eyes dodge away from contact');dodger.dodge(-.8,-.2);for(let i=0;i<180;i++)dodger.update(1/60,input);assert.ok(dodger.pose.peek>50&&dodger.tickleActive,'dodging survives the two-second expression script');dodger.dodge(.8,.2);for(let i=0;i<45;i++)dodger.update(1/60,input);assert.ok(dodger.pose.peek< -50,'a later touch renews and reverses the dodge');for(let i=0;i<540;i++)dodger.update(1/60,input);assert.equal(dodger.tickleActive,false,'idle tickle mode eventually expires');
const rapid=new Face();rapid.setState('curious');for(let i=0;i<6;i++)rapid.update(1/60,input);const beforeInterrupt=rapid.blinkScale();rapid.setState('surprised');rapid.update(1/600,input);assert.ok(Math.abs(rapid.blinkScale()-beforeInterrupt)<.04,'rapid interruption must preserve blink continuity');
function check(f){for(const width of [390,454]){const p=new Probe(width);f.draw(p,width);assert.equal(p.stack.length,0);assert.ok(p.samples>20);maxRadiusRatio=Math.max(maxRadiusRatio,p.maxRadius/(width/2));maxPaths=Math.max(maxPaths,p.paths);frames++;}}
for(const from of Object.keys(states))for(const to of Object.keys(states)){
 const f=new Face();f.setState(from);for(let i=0;i<90;i++)f.update(1/60,input);
 const before={...f.pose},velocity={...f.velocity};f.setState(to);assert.deepEqual(f.pose,before);assert.deepEqual(f.velocity,velocity);
 for(let i=0;i<80;i++){f.look(i%2?1:-1,i%3?1:-1);f.update(1/60,input);check(f);for(const k of keys)assert.ok(Number.isFinite(f.pose[k]));}
}
for(const first of Object.keys(scripts))for(const next of Object.keys(scripts)){
 const f=new Face();f.trigger(first);for(let i=0;i<20;i++)f.update(1/60,input);
 const before={...f.pose};f.trigger(next);assert.deepEqual(f.pose,before);
 for(let i=0;i<240;i++){f.update(1/60,input);check(f);}assert.equal(f.event,null);
}
const a=new Face(),b=new Face();a.setState('surprised');b.setState('surprised');for(let i=0;i<60;i++)a.update(1/30,input);for(let i=0;i<120;i++)b.update(1/60,input);for(const k of keys)assert.ok(Math.abs(a.pose[k]-b.pose[k])<1e-6,'frame-rate-independent transition');
const calm=new Face(),night=new Face(),active=new Face();for(let i=0;i<300;i++){calm.update(1/60,{bpm:68,activity:0,night:0});night.update(1/60,{bpm:58,activity:0,night:1});active.update(1/60,input);}assert.ok(night.speed<calm.speed*.4);assert.ok(active.speed>calm.speed*3);
const sleepyBlink=new Face(),calmBlink=new Face(),curiousBlink=new Face();sleepyBlink.setState('sleepy');curiousBlink.setState('curious');for(let i=0;i<1200;i++){sleepyBlink.update(1/60,input);calmBlink.update(1/60,input);curiousBlink.update(1/60,input);}assert.equal(sleepyBlink.blinkCount,0,'sleepy eyes do not spontaneously blink');assert.ok(calmBlink.blinkCount>=1&&curiousBlink.blinkCount>calmBlink.blinkCount,'blink cadence depends on mood');
const frozen=JSON.stringify(active);active.update(0,input);assert.equal(JSON.stringify(active),frozen);
// Event interruption must preserve the currently visible eye geometry.
function geometry(f){const eyes=[];let path=[];const p=new Probe(390),sample=p.sample.bind(p),begin=p.beginPath.bind(p);p.beginPath=()=>{begin();path=[];};p.sample=(x,y)=>{sample(x,y);path.push([x,y,...p.m]);};p.fill=()=>eyes.push(path);f.draw(p,390);return eyes;}
for(const [event,dx,dy] of [['peekLeft',-1,0],['peekRight',1,0],['peekUp',0,-1],['peekDown',0,1],['peekNW',-1,-1],['peekNE',1,-1],['peekSW',-1,1],['peekSE',1,1]]){const f=new Face();f.trigger(event);for(let i=0;i<90;i++)f.update(1/60,input);const eyes=geometry(f),cx=eyes.reduce((n,eye)=>n+eye[0][6],0)/eyes.length,cy=eyes.reduce((n,eye)=>n+eye[0][7],0)/eyes.length;if(dx)assert.ok((cx-195)*dx>55,event+' must travel horizontally');if(dy)assert.ok((cy-195)*dy>55,event+' must travel vertically');}
const diagonalDrag=new Face();diagonalDrag.look(1,-1);assert.ok(Math.abs(diagonalDrag.lookX-.707)<.002&&Math.abs(diagonalDrag.lookY+.707)<.002,'diagonal drag is normalized inside the round screen');for(let i=0;i<90;i++)diagonalDrag.update(1/60,input);assert.ok(diagonalDrag.pose.peek>65&&diagonalDrag.pose.rise<-.65,'diagonal pointer travel reaches both axes');
for(const event of Object.keys(scripts)){const f=new Face();f.trigger('cheer');for(let i=0;i<45;i++)f.update(1/60,input);const before=geometry(f);f.trigger(event);assert.deepEqual(geometry(f),before,'interruption must not jump eye position');}
const cadences=[];for(const hz of [60,90,120,144])for(const fps of [30,60]){let last=0,count=0;for(let i=1;i<=hz*10;i++){const next=frameDeadline(i*1000/hz,last,fps);if(next!==last){count++;last=next;}}assert.ok(Math.abs(count-fps*10)<=1,'retain cadence remainder');cadences.push({hz,fps,actual:count/10});}
for(const peek of ['peekLeft','peekRight']){
 const f=new Face();f.trigger(peek);for(let i=0;i<12;i++)f.update(1/60,input);assert.ok(f.pose.lid<.2&&f.pose.peek===0,'blink centrally before travel');
 for(let i=0;i<90;i++)f.update(1/60,input);assert.ok(Math.abs(f.pose.peek)>100,'reach edge and hold');
 for(let i=0;i<200;i++)f.update(1/60,input);assert.ok(Math.abs(f.pose.peek)<.01,'return to center');
 for(const at of [.6,1.3,2.3])for(const event of Object.keys(scripts)){
  const actor=new Face();actor.trigger(peek);for(let i=0;i<Math.round(at*60);i++)actor.update(1/60,input);
  const before=geometry(actor);actor.trigger(event);assert.deepEqual(geometry(actor),before);
  for(let i=0;i<200;i++){actor.update(1/60,input);check(actor);}
 }
 for(const state of Object.keys(states)){
  const actor=new Face();actor.trigger(peek);for(let i=0;i<90;i++)actor.update(1/60,input);
  actor.setState(state);actor.look(peek==='peekLeft'?-1:1,-1);
  for(let i=0;i<150;i++){actor.update(1/60,{bpm:180,activity:1,night:1});check(actor);}
 }
}
console.log(JSON.stringify({passed:true,frames,maxRadiusRatio,maxPaths,states:Object.keys(states).length,interactions:Object.keys(scripts).length,nightSpeed:night.speed,activeSpeed:active.speed,cadences},null,2));
