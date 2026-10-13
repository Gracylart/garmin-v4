'use strict';
const canvas=document.getElementById('face'),ctx=canvas.getContext('2d'),status=document.getElementById('status');
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=n=>{const x=clamp(n);return x*x*(3-2*x);};
const idle={h1:82,h2:82,w1:49,w2:49,a1:-.06,a2:.06,arch1:0,arch2:0};
const moods=[
 {id:'calm',label:'平静',shape:idle,gaze:[0,0],bend:[0,0],duration:.72,omega:13,blink:5},
 {id:'curious',label:'好奇',shape:{h1:104,h2:52,w1:43,w2:38,a1:-.16,a2:.20,arch1:0,arch2:0},gaze:[.52,-.20],bend:[.12,-.24],duration:.72,omega:17,blink:3},
 {id:'joy',label:'高兴',shape:{h1:42,h2:42,w1:69,w2:69,a1:-.16,a2:.16,arch1:0,arch2:0},gaze:[0,-.18],bend:[-.12,-.22],duration:.42,omega:22,blink:5},
 {id:'surprised',label:'惊讶',shape:{h1:112,h2:112,w1:91,w2:91,a1:-.04,a2:.04,arch1:0,arch2:0},gaze:[0,-.22],bend:[.08,-.08],duration:.30,omega:27,blink:8},
 {id:'skeptical',label:'怀疑',shape:{h1:92,h2:13,w1:49,w2:68,a1:-.13,a2:-.10,arch1:0,arch2:0},gaze:[-.42,.04],bend:[-.20,.09],duration:.72,omega:15,blink:7},
 {id:'sleepy',label:'困倦',shape:{h1:7,h2:7,w1:60,w2:60,a1:-.06,a2:.06,arch1:0,arch2:0},gaze:[0,.20],bend:[.02,.08],duration:1.15,omega:8,blink:99},
 {id:'excited',label:'兴奋',shape:{h1:116,h2:116,w1:70,w2:70,a1:-.08,a2:.08,arch1:0,arch2:0},gaze:[.12,-.28],bend:[-.20,-.30],duration:.30,omega:27,blink:3},
 {id:'bored',label:'无聊',shape:{h1:24,h2:24,w1:76,w2:76,a1:.04,a2:-.04,arch1:4,arch2:4},gaze:[-.36,.10],bend:[-.06,.04],duration:1.25,omega:8,blink:11},
 {id:'resigned',label:'无奈',shape:{h1:20,h2:20,w1:82,w2:82,a1:-.28,a2:.28,arch1:-7,arch2:-7},gaze:[-.18,.12],bend:[-.10,.12],duration:.82,omega:12,blink:7},
 {id:'proud',label:'得意',shape:{h1:20,h2:20,w1:83,w2:83,a1:.22,a2:-.22,arch1:-6,arch2:-6},gaze:[0,-.20],bend:[-.13,-.19],duration:.48,omega:21,blink:5},
 {id:'fear',label:'害怕',shape:{h1:125,h2:93,w1:95,w2:73,a1:-.18,a2:.15,arch1:0,arch2:0},gaze:[.47,.10],bend:[.24,-.20],duration:.31,omega:25,blink:4},
 {id:'playful',label:'调皮',shape:{h1:8,h2:92,w1:64,w2:48,a1:-.12,a2:.23,arch1:0,arch2:0},gaze:[.38,.10],bend:[-.28,.12],duration:.46,omega:22,blink:5}
];
const pose={...idle};
let clock=0,last=0,kind='idle',start=0,until=0,lookX=0,lookY=0,gazeX=0,gazeY=0,hold=0;
let mood=moods[0],moodStart=0,moodFromX=0,moodFromY=0;
let spinX=1,spinY=0,spinHoldX=0,spinHoldY=0;
let gazeVX=0,gazeVY=0;
let taps=0,tapStart=0,lastTap=0,gesture=null,blink=-1,nextBlink=3;
let clockActive=false,clockRelease=0,clockHour=0,clockMinute=0,clockHourSide=-1;
function wakeClock(){
 if(locked())return;
 const now=new Date(),chosen=document.getElementById('clock-time').value;
 let minutes=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
 if(chosen){const parts=chosen.split(':');minutes=Number(parts[0])*60+Number(parts[1]);}
 clockHour=(minutes%720)/720*Math.PI*2-Math.PI/2;
 clockMinute=(minutes%60)/60*Math.PI*2-Math.PI/2;
 clockHourSide=Math.cos(clockHour)*87<=Math.cos(clockMinute)*124?-1:1;
 clockActive=true;clockRelease=clock+1.4;kind='idle';mood=moods[0];
 Object.assign(pose,idle);gazeX=0;gazeY=0;gazeVX=0;gazeVY=0;
 lookX=0;lookY=0;hold=clock+3;blink=-1;moodStart=clock;moodFromX=0;moodFromY=0;
 status.textContent='当前时间的两根指针 · 轻触可提前睁眼（表盘真机为自动切换）';
}
function releaseClock(){if(clockActive&&clock<clockRelease)clockRelease=clock;}

function locked(){return clock<until&&(kind==='cheer'||kind==='rage'||kind==='spin');}
function selectMood(next,p){
 if(locked())return;
 mood=next;kind='idle';until=0;moodStart=clock;moodFromX=gazeX;moodFromY=gazeY;
 if(p)gaze(p);else{lookX=next.gaze[0];lookY=next.gaze[1];hold=clock+2.8;}
 nextBlink=clock+next.blink;
 status.textContent=next.label+' · 眼形、路径与节奏联动';
}
function play(name,haptic=false){
 if(locked())return;
 kind=name;start=clock;until=clock+({cheer:2.2,rage:1.5,spin:1.12,tickle:2}[name]||0);
 if(name!=='spin')blink=-1;
 nextBlink=clock+2.5;
 status.textContent={cheer:'摇头晃脑庆祝',rage:'气鼓鼓 · 瞪眼颤动',spin:'双眼沿隐形球面转圈',tickle:'挠痒痒 · 躲开手指'}[name]+(haptic?' · 真机将震动':'');
}
function captureOrbit(){
 spinHoldX=gazeX;spinHoldY=gazeY;
}
function orbit(dx,dy){
 const len=Math.hypot(dx,dy);if(len<1)return;
 spinX=dx/len;spinY=dy/len;
 captureOrbit();
 lookX=0;lookY=0;play('spin');
}
function point(e,r=canvas.getBoundingClientRect()){return {x:(e.clientX-r.left)/r.width*454,y:(e.clientY-r.top)/r.height*454};}
function segmentRadius(x1,y1,x2,y2){
 const dx=x2-x1,dy=y2-y1,length2=dx*dx+dy*dy;
 const t=length2?clamp(-((x1-227)*dx+(y1-227)*dy)/length2):0;
 return Math.hypot(x1+dx*t-227,y1+dy*t-227);
}
function straightCross(g,p){
 const dx=p.x-g.sx,dy=p.y-g.sy,travel=Math.hypot(dx,dy);
 const sx=g.sx-227,sy=g.sy-227,ex=p.x-227,ey=p.y-227;
 return travel>454*.55&&g.path<travel*1.22&&g.reversals<=1&&g.minRadius<454*.24
  &&Math.hypot(sx,sy)>454*.34&&Math.hypot(ex,ey)>454*.34
  &&sx*ex+sy*ey<-454*454*.035;
}
function gaze(p){
 lookX=clamp((p.x-227)/227,-1,1);lookY=clamp((p.y-227)/227,-1,1);
 const len=Math.hypot(lookX,lookY);if(len>1){lookX/=len;lookY/=len;}
 hold=clock+2.5;
}
function tap(p){
 if(locked())return;
 const now=performance.now();if(now-lastTap>450||now-tapStart>850){taps=0;tapStart=now;}
 lastTap=now;taps++;
 if(taps>=3){taps=0;play('rage');return;}
 const choices=moods.filter(item=>item!==mood);
 selectMood(choices[Math.floor(Math.random()*choices.length)],p);
}
canvas.addEventListener('pointerdown',e=>{
 if(clockActive){releaseClock();return;}
 if(locked())return;
 const rect=canvas.getBoundingClientRect(),p=point(e,rect);
 gesture={id:e.pointerId,rect,sx:p.x,sy:p.y,lx:p.x,ly:p.y,minX:p.x,maxX:p.x,minY:p.y,maxY:p.y,minRadius:Math.hypot(p.x-227,p.y-227),path:0,winding:0,angle:Math.atan2(p.y-227,p.x-227),valid:Math.hypot(p.x-227,p.y-227)>90,lastDir:0,reversals:0};
 canvas.setPointerCapture(e.pointerId);gaze(p);
});
canvas.addEventListener('pointermove',e=>{
 if(clockActive)return;
 const g=gesture;if(!g||g.id!==e.pointerId||locked())return;
 const p=point(e,g.rect),dx=p.x-g.lx,dy=p.y-g.ly;g.path+=Math.hypot(dx,dy);g.minRadius=Math.min(g.minRadius,segmentRadius(g.lx,g.ly,p.x,p.y));
 if(Math.abs(dx)>4){const dir=Math.sign(dx);if(g.lastDir&&dir!==g.lastDir)g.reversals++;g.lastDir=dir;}
 const radius=Math.hypot(p.x-227,p.y-227);
 if(radius>90){
  const a=Math.atan2(p.y-227,p.x-227);
  if(g.valid){let turn=a-g.angle;if(turn>Math.PI)turn-=2*Math.PI;if(turn<-Math.PI)turn+=2*Math.PI;g.winding+=turn;}
  g.angle=a;g.valid=true;
 }else g.valid=false;
 g.lx=p.x;g.ly=p.y;g.minX=Math.min(g.minX,p.x);g.maxX=Math.max(g.maxX,p.x);g.minY=Math.min(g.minY,p.y);g.maxY=Math.max(g.maxY,p.y);
 gaze(p);
 if(straightCross(g,p)){gesture=null;orbit(p.x-g.sx,p.y-g.sy);}
});
canvas.addEventListener('pointerup',e=>{
 if(clockActive)return;
 const g=gesture;if(!g||g.id!==e.pointerId)return;
 const p=point(e,g.rect),travel=Math.hypot(p.x-g.sx,p.y-g.sy);
 g.path+=Math.hypot(p.x-g.lx,p.y-g.ly);g.minRadius=Math.min(g.minRadius,segmentRadius(g.lx,g.ly,p.x,p.y));
 gesture=null;
 if(locked())return;
 if(Math.abs(g.winding)>5.2&&g.maxX-g.minX>204&&g.maxY-g.minY>204&&travel<145){play('cheer',true);return;}
 if(straightCross(g,p)){gaze(p);orbit(p.x-g.sx,p.y-g.sy);return;}
 if(g.path>100&&g.reversals>=2&&g.maxX-g.minX<110&&g.maxY-g.minY<110){play('tickle');lookX=-lookX;lookY=-lookY;return;}
 if(travel<12)tap(p);
});
canvas.addEventListener('pointercancel',()=>{gesture=null;});
document.getElementById('wake').onclick=()=>{if(locked())return;if(Math.random()<.5)play('cheer');else{kind='look';const a=Math.random()*Math.PI*2;lookX=Math.cos(a);lookY=Math.sin(a);hold=clock+5;status.textContent='抬腕 · 随机角度张望';}};
document.getElementById('clock').onclick=wakeClock;
document.getElementById('steps').onclick=()=>play('cheer',true);
document.getElementById('workout').onclick=()=>play('cheer',true);
document.getElementById('move').onclick=()=>play('rage');
for(const button of document.querySelectorAll('[data-mood]')){
 button.onclick=()=>button.dataset.mood==='rage'?play('rage'):selectMood(moods.find(item=>item.id===button.dataset.mood));
}
function eye(x,y,w,h,angle,arch=0,a=1,b=0,c=0,d=1,screenTilt=0){
 if(w<2||h<2)return;
 ctx.save();
 ctx.translate(x,y);ctx.rotate(screenTilt);
 if(h<16){h=Math.max(5,h);arch=0;}
 else{ctx.transform(a,b,c,d,0,0);ctx.rotate(angle);}
 const r=Math.min(w,h)*.48,left=-w/2,right=w/2,top=-h/2,bottom=h/2,flat=w-2*r;
 ctx.beginPath();ctx.moveTo(left+r,top);
 ctx.bezierCurveTo(left+r+flat/3,top+arch,right-r-flat/3,top+arch,right-r,top);
 ctx.bezierCurveTo(right-r*.45,top,right,top+r*.45,right,top+r);
 ctx.lineTo(right,bottom-r);
 ctx.bezierCurveTo(right,bottom-r*.45,right-r*.45,bottom,right-r,bottom);
 ctx.bezierCurveTo(right-r-flat/3,bottom+arch,left+r+flat/3,bottom+arch,left+r,bottom);
 ctx.bezierCurveTo(left+r*.45,bottom,left,bottom-r*.45,left,bottom-r);
 ctx.lineTo(left,top+r);
 ctx.bezierCurveTo(left,top+r*.45,left+r*.45,top,left+r,top);
 ctx.closePath();
 ctx.fill();ctx.restore();
}
function spinVector(v,spin,dx,dy){
 if(!spin)return v;
 const ax=-dy,ay=dx,cs=Math.cos(spin),sn=Math.sin(spin),one=1-cs;
 const dot=ax*v[0]+ay*v[1];
 return [
  v[0]*cs+ay*v[2]*sn+ax*dot*one,
  v[1]*cs-ax*v[2]*sn+ay*dot*one,
  v[2]*cs+(ax*v[1]-ay*v[0])*sn
 ];
}
function orbitEye(side,w,h,a,arch,yaw,pitch,baseY,spin,dx,dy){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 let f=[sy*cp,sp,cy*cp],right=[cy,0,-sy],down=[-sy*sp,cp,-cy*sp];
 if(spin){
  f=spinVector(f,spin,dx,dy);right=spinVector(right,spin,dx,dy);down=spinVector(down,spin,dx,dy);
 }
 const split=side*.27,co=Math.cos(split),si=Math.sin(split);
 const ex=f[0]*co+right[0]*si,ey=f[1]*co+right[1]*si,depth=f[2]*co+right[2]*si;
 if(depth<=.015)return;
 const edge=spin?smooth((.98-depth)/.55):0;
 eye(184*ex+(mood.id==='proud'?side*12:0),baseY+184*ey,w*(1-.14*edge),h*(1-.18*edge),a,arch,right[0]*co-f[0]*si,right[1]*co-f[1]*si,down[0],down[1],edge*(-.24*dx+.14*dy));
}
function spinAt(t){
 const x=clamp(t);
 const ease=x<.5?4*x*x*x:1-Math.pow(2-2*x,3)/2;
 return 2*Math.PI*(ease+.4*x*Math.pow(1-x,3));
}
function bezier(a,b,c,d,t){const q=1-t;return q*q*q*a+3*q*q*t*b+3*q*t*t*c+t*t*t*d;}
function clockSegment(handAngle,length,side,t){
 const k=smooth(t),ux=Math.cos(handAngle),uy=Math.sin(handAngle);
 const sx=ux*length/2,sy=uy*length/2,tx=side*49,ty=-18;
 const cx=bezier(sx,sx+ux*26+side*8,tx-side*22,tx,k);
 const cy=bezier(sy,sy+uy*26,ty-24,ty,k);
 let turn=Math.atan2(Math.sin(-handAngle),Math.cos(-handAngle));
 if(turn>Math.PI/2)turn-=Math.PI;else if(turn<-Math.PI/2)turn+=Math.PI;
 const angle=handAngle+turn*k,half=(length+(42-length)*k)/2;
 const dx=Math.cos(angle)*half,dy=Math.sin(angle)*half;
 return [cx-dx,cy-dy,cx+dx,cy+dy];
}
function drawClockHands(t){
 for(const [handAngle,length,side] of [[clockHour,87,clockHourSide],[clockMinute,124,-clockHourSide]]){
  const [x1,y1,x2,y2]=clockSegment(handAngle,length,side,t);
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
  ctx.lineWidth=7;ctx.lineCap='round';ctx.strokeStyle='#e8f3ec';ctx.stroke();
 }
}
function draw(){
 const p=pose,age=clock-start;
 ctx.fillStyle='#000';ctx.fillRect(0,0,454,454);
 ctx.save();ctx.translate(227,227);ctx.scale(454/390,454/390);ctx.fillStyle='#e8f3ec';
 let shiftX=0,shiftY=0,angle=0;
 if(kind==='rage'){
  const pulse=smooth((age-.14)/.2)*(1-smooth((age-1.13)/.37));
  shiftX=Math.sin(age*25)*3.2*pulse;
  shiftY=Math.sin(age*9)*3*pulse-4*smooth(age/.32);
  angle=Math.sin(age*11)*.055*pulse;
 }
 if(kind==='cheer'){const swell=smooth(age/.22)*(1-smooth((age-1.75)/.45));shiftX=Math.sin(age*8)*15*swell;shiftY=Math.sin(age*13)*8*swell;angle=Math.sin(age*16)*.14*swell;}
 ctx.translate(shiftX,shiftY);ctx.rotate(angle);
 if(clockActive&&clock<clockRelease+.55){
  drawClockHands((clock-clockRelease)/.55);
  ctx.restore();return;
 }
 ctx.save();ctx.beginPath();ctx.arc(0,-18,184,0,2*Math.PI);ctx.clip();
 let lid=1;if(blink>=0){const t=blink/.18;lid=t<.43?1-.94*smooth(t/.43):.06+.94*smooth((t-.43)/.57);}
 if(kind==='spin'){
  const turn=spinAt(age/1.12);
  const baseY=-18*(1-Math.abs(gazeY));
  orbitEye(-1,p.w1,p.h1*lid,p.a1,0,gazeX*1.16,gazeY*1.02,baseY,turn,spinX,spinY);
  orbitEye(1,p.w2,p.h2*lid,p.a2,0,gazeX*1.16,gazeY*1.02,baseY,turn,spinX,spinY);
 }else{
  const yaw=gazeX*1.16,pitch=gazeY*1.02,baseY=-18*(1-Math.abs(gazeY));
  orbitEye(-1,p.w1,p.h1*lid,p.a1,p.arch1,yaw,pitch,baseY,0,1,0);
  orbitEye(1,p.w2,p.h2*lid,p.a2,p.arch2,yaw,pitch,baseY,0,1,0);
 }
 ctx.restore();
 ctx.restore();
}
function frame(now){
 requestAnimationFrame(frame);
 if(!last)last=now;
 const dt=clamp((now-last)/1000,0,.1);last=now;
 advance(dt);
}
function advance(dt){
 clock+=dt;
 if(clockActive&&clock>clockRelease+.85){clockActive=false;status.textContent='指针已睁眼 · 进入表情系统';}
 if(until&&clock>=until){kind='idle';until=0;mood=moods[0];moodStart=clock;hold=clock+.35;}
 const age=clock-start,moodAge=clock-moodStart;let target={...mood.shape};
 if(kind==='rage'){
  target={...idle,h1:104,h2:104,w1:54,w2:54,a1:.35,a2:-.35};
  if(age<.16){target.h1=26;target.h2=26;target.w1=76;target.w2=76;}
  else if(age<.44){target.h1=128;target.h2=128;target.w1=80;target.w2=80;}
  else if(age>1.18){const release=smooth((age-1.18)/.32);target.h1-=22*release;target.h2-=22*release;target.w1+=4*release;target.w2+=4*release;}
 }
 else if(kind==='cheer')target=age<.22?{...idle,h1:104,h2:52}:age<.8?{...idle,h1:112,h2:112,w1:91,w2:91}:{...idle,h1:7,h2:7,w1:72,w2:72};
 else if(kind==='tickle')target={...idle,h1:7,h2:7,w1:72,w2:72};
 else if(kind==='idle'){
  if(mood.id==='surprised'&&moodAge<.10){target.h1=26;target.h2=26;}
  if(mood.id==='excited'){const bounce=Math.sin(moodAge*16)*8*(1-smooth((moodAge-1.4)/.7));target.h1+=bounce;target.h2+=bounce;}
  if(mood.id==='joy'){const bounce=Math.sin(moodAge*9)*3*(1-smooth((moodAge-1.2)/.5));target.h1+=bounce;target.h2+=bounce;}
  if(mood.id==='playful'&&moodAge<.3)target.h1=24;
 }
 const omega=kind==='idle'?mood.omega:18;
 for(const k of Object.keys(pose))pose[k]+=(target[k]-pose[k])*(1-Math.exp(-omega*dt));
 if(clockActive){const opening=smooth((clock-clockRelease-.55)/.3);pose.h1=7+(idle.h1-7)*opening;pose.h2=pose.h1;}
 if(clock>hold&&!gesture&&kind!=='spin'){lookX*=Math.exp(-5*dt);lookY*=Math.exp(-5*dt);}
 const returnEase=kind==='spin'?smooth((age-.48)/.45):0;
 let tx=kind==='spin'?spinHoldX*(1-returnEase):lookX,ty=kind==='spin'?spinHoldY*(1-returnEase):lookY;
 if(kind==='idle'&&!gesture&&moodAge<mood.duration&&clock<hold){
  const t=smooth(moodAge/mood.duration),bx=mood.bend[0],by=mood.bend[1];
  tx=bezier(moodFromX,moodFromX+bx,lookX+bx*.5,lookX,t);
  ty=bezier(moodFromY,moodFromY+by,lookY+by*.5,lookY,t);
 }
 if(kind==='idle'&&!gesture){
  if(mood.id==='excited'){tx+=Math.sin(moodAge*8)*.055;ty+=Math.sin(moodAge*11)*.05;}
  else if(mood.id==='bored')tx+=Math.sin(moodAge*1.1)*.035;
  else if(mood.id==='fear')tx+=Math.sin(moodAge*18)*.028;
 }
 const spring=(value,velocity,target,omega)=>{
  const decay=Math.exp(-omega*dt),delta=value-target,k=(velocity+omega*delta)*dt;
  return [target+(delta+k)*decay,(velocity-omega*k)*decay];
 };
 [gazeX,gazeVX]=spring(gazeX,gazeVX,tx,gesture?22:(kind==='spin'?16:Math.min(mood.omega,18)));
 [gazeY,gazeVY]=spring(gazeY,gazeVY,ty,gesture?22:18);
 if(blink>=0){blink+=dt;if(blink>.18)blink=-1;}else if(clock>nextBlink&&!locked()&&mood.id!=='sleepy'){blink=0;nextBlink=clock+mood.blink+Math.random()*2;}
 draw();
}
// The studio uses the same renderer and gesture handlers, with an external transport.
globalThis.EmotePreview={
 moods:moods.map(m=>({id:m.id,label:m.label})),
 tick:advance,
 reset(){
  clock=0;start=0;until=0;kind='idle';mood=moods[0];moodStart=0;
  lookX=lookY=gazeX=gazeY=gazeVX=gazeVY=moodFromX=moodFromY=0;
  hold=0;gesture=null;blink=-1;nextBlink=99;clockActive=false;taps=0;
  Object.assign(pose,idle);draw();
 },
 trigger(id){
  const next=moods.find(m=>m.id===id);
  if(next)selectMood(next);else if(id==='spin')orbit(1,0);else play(id);
 },
 draw,
 snapshot(){return {kind,mood:mood.id,clock,locked:locked()};}
};
if(!globalThis.EMOTE_STUDIO)requestAnimationFrame(frame);
