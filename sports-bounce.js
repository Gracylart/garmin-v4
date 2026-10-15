(function(root){
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,u)=>a+(b-a)*u;
 const smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
 const scale=454/390,R=211,transitionDuration=.5,actionDuration=.7;
 function eyesAt(kind='calm',time=0){
  const gaze=kind==='look'?Math.sin(time*7)*.42:0;
  const blink=kind==='blink'?1-.94*Math.pow(Math.max(0,Math.sin(time*9)),10):1;
  const jump=kind==='bounce'?-19*Math.sin(time*10):0;
  return [-1,1].map(side=>{
   const a=gaze+side*.27,depth=Math.cos(a);
   return {x:227+184*Math.sin(a)*scale,y:227+(-18+jump)*scale,
    w:49*depth*scale,h:82*blink*scale*(kind==='bounce'?1+.04*Math.cos(time*10):1),angle:side*.06};
  });
 }
 function capture(kind,time){
  const eyes=eyesAt(kind,time),before=eyesAt(kind,time-.001),after=eyesAt(kind,time+.001);
  return eyes.map((eye,i)=>({...eye,vx:(after[i].x-before[i].x)/.002,vy:(after[i].y-before[i].y)/.002,vw:(after[i].w-before[i].w)/.002,vh:(after[i].h-before[i].h)/.002}));
 }
 const defaultLengthKeys=[{t:.2,length:96},{t:.36,length:96},{t:.412,length:96},{t:.456,length:210.11},{t:.5,length:324.22}];
 function lengthAt(t,keys=defaultLengthKeys){
  if(t<=keys[0].t)return keys[0].length;
  for(let i=1;i<keys.length;i++)if(t<=keys[i].t){const a=keys[i-1],b=keys[i];return mix(a.length,b.length,smooth((t-a.t)/(b.t-a.t)));}
  return keys[keys.length-1].length;
 }
 function create(eyes,{lengthKeys=defaultLengthKeys}={}){
  if(!Array.isArray(eyes)||eyes.length!==2)throw Error('Expected two current eye poses');
  return {eyes:eyes.map(e=>({...e})),center:{x:(eyes[0].x+eyes[1].x)/2,y:(eyes[0].y+eyes[1].y)/2},lengthKeys:lengthKeys.map(k=>({...k}))};
 }
 function bezier(a,b,c,d,u){const q=1-u;return{x:q*q*q*a.x+3*q*q*u*b.x+3*q*u*u*c.x+u*u*u*d.x,y:q*q*q*a.y+3*q*q*u*b.y+3*q*u*u*c.y+u*u*u*d.y};}
 function at(node,seconds){
  const t=Math.max(0,Math.min(transitionDuration,seconds));
  const target={x:(53.28+377.5)/2,y:294.94,length:324.22,width:9.46};
  if(t<=.2){
   let center;
   if(t<=.075){const u=t/.075;center={x:mix(node.center.x,227,smooth(u)),y:node.center.y-46*smooth(u)};}
   else {const u=(t-.075)/.125;center=bezier({x:227,y:node.center.y-46},{x:227,y:node.center.y-46},{x:198,y:227+R},{x:227,y:227+R},smooth(u));}
   const merge=smooth((t-.118)/.082),stretch=Math.sin(Math.PI*clamp((t-.075)/.125))*.11;
   const squash=.1*Math.exp(-Math.pow((t-.188)/.016,2));
   const eyes=node.eyes.map(e=>{
    const vFade=t*(1-t/.075)*(1-t/.075); // Preserves input velocity at takeover, decays by apex.
    const momentum=t<.075?vFade:0;
    return {x:center.x+(e.x-node.center.x)*(1-merge)+(e.vx||0)*momentum,y:center.y+(e.y-node.center.y)*(1-merge)+(e.vy||0)*momentum,
     w:Math.max(2,(mix(e.w,104.63,merge)+(e.vw||0)*momentum)*(1+squash)),h:Math.max(2,(mix(e.h,9.46,merge)+(e.vh||0)*momentum)*(1+stretch-squash)),angle:mix(e.angle,0,merge)};
   });
   if(t>.19){const half=96/(2*R),bend=R*(1-Math.cos(half))*smooth((t-.19)/.01);return {t,phase:'双眼融合为单线段',eyes:[],person:0,orbitAngle:0,segment:{start:{x:center.x-R*Math.sin(half),y:center.y-bend},end:{x:center.x+R*Math.sin(half),y:center.y-bend},control:{x:center.x,y:center.y+bend},width:9.46}};}
   return {t,phase:t<.075?'轻跳起步':t<.16?'拉伸下坠':'落底 · 双眼融合',eyes,person:0,orbitAngle:0,segment:null};
  }
  if(t<.412){
   const u=(t-.2)/.212,angle=2*Math.PI*smooth(u),half=lengthAt(t,node.lengthKeys)/(2*R);
   const start={x:227+R*Math.sin(angle-half),y:227+R*Math.cos(angle-half)};
   const end={x:227+R*Math.sin(angle+half),y:227+R*Math.cos(angle+half)};
   const mid={x:227+R*Math.sin(angle),y:227+R*Math.cos(angle)};
   return {t,phase:'单线段沿圆屏绕行',eyes:[],person:0,orbitAngle:angle,segment:{start,end,control:{x:2*mid.x-(start.x+end.x)/2,y:2*mid.y-(start.y+end.y)/2},width:9.46}};
  }
  const u=(t-.412)/.088,e=smooth(u),center=bezier({x:227,y:227+R},{x:248,y:227+R},{x:target.x,y:target.y+30},{x:target.x,y:target.y},e);
  const length=lengthAt(t,node.lengthKeys),bend=R*(1-Math.cos(length/(2*R)))*(1-e),half=mix(R*Math.sin(length/(2*R)),length/2,e);
  return {t,phase:'线段落成球桌 · 人物同步出现',eyes:[],person:e,orbitAngle:Math.PI*2,
   segment:{start:{x:center.x-half,y:center.y-bend},end:{x:center.x+half,y:center.y-bend},control:{x:center.x,y:center.y+bend},width:target.width}};
 }
 function drawEye(ctx,e,color){
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.fillStyle=color;
  ctx.beginPath();ctx.roundRect(-e.w/2,-e.h/2,e.w,e.h,Math.min(e.w,e.h)*.48);ctx.fill();ctx.restore();
 }
 function renderEyes(ctx,eyes,{watch=false,color='#101e62',background='#fff'}={}){
  const size=ctx.canvas.width;ctx.clearRect(0,0,size,size);ctx.save();ctx.scale(size/454,size/454);
  ctx.fillStyle=watch?'#000':background;ctx.fillRect(0,0,454,454);
  if(watch){ctx.beginPath();ctx.arc(227,227,226,0,Math.PI*2);ctx.clip();}
  eyes.forEach(e=>drawEye(ctx,e,color));ctx.restore();
 }
 function render(ctx,node,t,options={}){
  const m=options.sportMotion||root.SportsMotion,s=at(node,t),{watch=false,color='#101e62',background='#fff',guides=false}=options;
  if(t>=transitionDuration)return m.render(ctx,1.4,options);
  const size=ctx.canvas.width;ctx.clearRect(0,0,size,size);ctx.save();ctx.scale(size/454,size/454);
  ctx.fillStyle=watch?'#000':background;ctx.fillRect(0,0,454,454);
  if(watch){ctx.beginPath();ctx.arc(227,227,226,0,Math.PI*2);ctx.clip();}
  if(guides){ctx.strokeStyle=watch?'#657468':'#b3bdb0';ctx.lineWidth=.7;ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(227,227,R,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  s.eyes.forEach(e=>drawEye(ctx,e,color));
  if(s.segment){const {start,end,control,width}=s.segment;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo(control.x,control.y,end.x,end.y);ctx.stroke();}
  ctx.restore();
  if(s.person>0){
   const u=s.person;ctx.save();const x=227+.86*10,y=294.94;
   const segment=s.segment,cx=(segment.start.x+2*segment.control.x+segment.end.x)/4,cy=(segment.start.y+2*segment.control.y+segment.end.y)/4;
   ctx.translate((cx+20.21)*size/454,cy*size/454);ctx.scale(.92+.08*u,u);ctx.translate(-x*size/454,-y*size/454);
   m.render(ctx,1.4,{...options,clear:false,table:false});ctx.restore();
  }return s;
 }
 function sportsTime(t){return 1.4+2.2*smooth(t/actionDuration);}
 const api={transitionDuration,actionDuration,R,eyesAt,capture,create,at,render,renderEyes,sportsTime,defaultLengthKeys,lengthAt};
 root.SportsBounce=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
