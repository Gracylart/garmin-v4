'use strict';

const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const x = clamp(n); return x*x*(3-2*x); };
const cubic = (a,b,c,d,t) => { const q=1-t; return q*q*q*a+3*q*q*t*b+3*q*t*t*c+t*t*t*d; };
const ease = (t,mode) => {
 const x=clamp(t);
 if(mode==='quick') return 1-Math.pow(1-x,3);
 if(mode==='poised') return Math.pow(smooth(x),1.45);
 return x*x*x*(x*(x*6-15)+10);
};
function handsAt(minutes){
 const hour=(minutes%720)/720*Math.PI*2-Math.PI/2;
 const minute=(minutes%60)/60*Math.PI*2-Math.PI/2;
 const hourSide=Math.cos(hour)*87<=Math.cos(minute)*124?-1:1;
 return [{angle:hour,length:87,side:hourSide},{angle:minute,length:124,side:-hourSide}];
}
function segment(hand,t,options=null){
 const {angle,length,side}=hand,ux=Math.cos(angle),uy=Math.sin(angle);
 const u=clamp(t),k=options?ease(u,options.easing):smooth(u);
 const sx=ux*length/2,sy=uy*length/2,tx=side*49,ty=-18;
 let cx=cubic(sx,sx+ux*26+side*8,tx-side*22,tx,k);
 let cy=cubic(sy,sy+uy*26,ty-24,ty,k);
 if(options){
  const vx=tx-sx,vy=ty-sy,dist=Math.hypot(vx,vy)||1;
  const arcSign=(-vy/dist)*side<0?-1:1;
  const bulge=Math.sin(Math.PI*k)*options.arc*arcSign;
  cx+=-vy/dist*bulge;cy+=vx/dist*bulge;
  const prep=u<.22?options.anticipation*Math.pow(Math.sin(Math.PI*u/.22),2):0;
  cx-=vx/dist*prep;cy-=vy/dist*prep;
 }
 let turn=Math.atan2(Math.sin(-angle),Math.cos(-angle));
 if(turn>Math.PI/2)turn-=Math.PI;else if(turn<-Math.PI/2)turn+=Math.PI;
 const rotation=options?ease((u-options.rotationLag)/(1-options.rotationLag),options.easing):k;
 const shortening=options?ease((u-options.lengthLag)/(1-options.lengthLag),options.easing):k;
 const direction=angle+turn*rotation,half=(length+(42-length)*shortening)/2;
 const dx=Math.cos(direction)*half,dy=Math.sin(direction)*half;
 const bend=options?options.bend*Math.sin(Math.PI*u)*side:0;
 return {x1:cx-dx,y1:cy-dy,x2:cx+dx,y2:cy+dy,cx,cy,
  controlX:cx-Math.sin(direction)*bend,controlY:cy+Math.cos(direction)*bend,
  width:7+(options?options.thickness*Math.sin(Math.PI*u):0)};
}
function init(){
 const $=id=>document.getElementById(id);
 const left=$('baseline').getContext('2d'),right=$('candidate').getContext('2d');
 const ids=['arc','bend','anticipation','stagger','rotationLag','lengthLag','thickness','duration'];
 const controls=Object.fromEntries(ids.map(id=>[id,$(id)]));
 let elapsed=0,playing=!window.matchMedia('(prefers-reduced-motion: reduce)').matches,lastFrame=0;
 const hold=1.4,opening=.3,baselineDuration=.55,finalHold=.55;
 function settings(){return {
  arc:+controls.arc.value,bend:+controls.bend.value,anticipation:+controls.anticipation.value,
  stagger:+controls.stagger.value/1000,rotationLag:+controls.rotationLag.value/100,
  lengthLag:+controls.lengthLag.value/100,thickness:+controls.thickness.value,
  duration:+controls.duration.value/1000,easing:$('easing').value
 };}
 function minutes(){const [h,m]=$('clock-time').value.split(':').map(Number);return h*60+m;}
 function total(o){return hold+Math.max(baselineDuration,o.duration)+opening+finalHold;}
 function drawSegment(ctx,s){
  ctx.beginPath();ctx.moveTo(s.x1,s.y1);
  if(Math.abs(s.controlX-s.cx)+Math.abs(s.controlY-s.cy)>.01)ctx.quadraticCurveTo(s.controlX,s.controlY,s.x2,s.y2);
  else ctx.lineTo(s.x2,s.y2);
  ctx.lineWidth=s.width;ctx.lineCap='round';ctx.strokeStyle='#e8f3ec';ctx.stroke();
 }
 function drawGuides(ctx,hands,o){
  ctx.save();ctx.lineWidth=1.2;ctx.setLineDash([3,5]);ctx.strokeStyle='#82a993';
  for(const hand of hands){ctx.beginPath();for(let i=0;i<=32;i++){
   const u=i/32,local=hand===hands[0]?u:clamp((u-o.stagger/o.duration)/(1-o.stagger/o.duration));
   const s=segment(hand,local,o);if(i===0)ctx.moveTo(s.cx,s.cy);else ctx.lineTo(s.cx,s.cy);
  }ctx.stroke();}
  ctx.restore();
 }
 function drawEyes(ctx,open){
  const k=smooth(open),height=7+75*k;
  for(const side of [-1,1]){
   ctx.save();ctx.translate(side*49,-18);ctx.rotate(side*.06*k);
   ctx.fillStyle='#e8f3ec';ctx.beginPath();ctx.roundRect(-24.5,-height/2,49,height,Math.min(24.5,height/2));ctx.fill();ctx.restore();
  }
 }
 function renderWatch(ctx,hands,time,duration,o){
  ctx.fillStyle='#000';ctx.fillRect(0,0,390,390);
  ctx.save();ctx.beginPath();ctx.arc(195,195,190,0,Math.PI*2);ctx.clip();ctx.translate(195,195);
  const progress=clamp((time-hold)/duration);
  if(time<hold+duration){
   if(o&&$('guides').checked)drawGuides(ctx,hands,o);
   for(let i=0;i<2;i++){
    const local=o&&i===1?clamp(((time-hold)-o.stagger)/(duration-o.stagger)):progress;
    drawSegment(ctx,segment(hands[i],local,o));
   }
  }else drawEyes(ctx,(time-hold-duration)/opening);
  ctx.restore();
 }
 function updateLabels(){
  for(const id of ids){
   const n=+controls[id].value;
   $(id+'-value').textContent=id==='duration'?(n/1000).toFixed(2)+' 秒':
    id==='stagger'?n+' 毫秒':id==='rotationLag'||id==='lengthLag'?n+'%':n+' px';
  }
  for(const button of document.querySelectorAll('[data-time]'))button.setAttribute('aria-pressed',String(button.dataset.time===$('clock-time').value));
 }
 function render(){
  const o=settings(),hands=handsAt(minutes()),end=total(o);
  elapsed=Math.min(elapsed,end);
  renderWatch(left,hands,elapsed,baselineDuration,null);
  renderWatch(right,hands,elapsed,o.duration,o);
  $('timeline').value=Math.round(elapsed/end*1000);
  $('timeline-value').textContent=Math.round(elapsed/end*100)+'%';
  $('pause').textContent=playing?'暂停':'继续';
 }
 function frame(now){
  if(playing){if(lastFrame)elapsed+=Math.min((now-lastFrame)/1000,.1);if(elapsed>=total(settings())){elapsed=total(settings());playing=false;}}
  lastFrame=now;render();requestAnimationFrame(frame);
 }
 $('play').addEventListener('click',()=>{elapsed=0;playing=true;lastFrame=0;render();});
 $('pause').addEventListener('click',()=>{playing=!playing;lastFrame=0;render();});
 $('timeline').addEventListener('input',e=>{playing=false;elapsed=+e.target.value/1000*total(settings());render();});
 $('clock-time').addEventListener('change',()=>{elapsed=0;playing=true;lastFrame=0;updateLabels();render();});
 for(const button of document.querySelectorAll('[data-time]'))button.addEventListener('click',()=>{$('clock-time').value=button.dataset.time;elapsed=0;playing=true;lastFrame=0;updateLabels();render();});
 for(const id of [...ids,'easing','guides'])$(id).addEventListener('input',()=>{updateLabels();render();});
 updateLabels();render();
 requestAnimationFrame(frame);
}
if(typeof document!=='undefined')init();
if(typeof module!=='undefined')module.exports={handsAt,segment,ease};
