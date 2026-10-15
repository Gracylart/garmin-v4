/* Tokyo 2020-inspired motion studies, drawn from an original joint rig.
 * One complete action cycle uses the existing 0.7s transport; all endpoints match.
 * Reference: Tokyo 2020 official kinetic pictograms concept film (2020-02-26).
 */
(function(root){
 'use strict';
 const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
 const point=(x,y,w=20)=>({x,y,w});
 const names={tabletennis:'乒乓球',running:'跑步',swimming:'游泳',cycling:'骑行'};
 function joint(a,b,l1,l2,bend=-1){
  const dx=b.x-a.x,dy=b.y-a.y,raw=Math.hypot(dx,dy)||1,d=Math.min(l1+l2-.001,Math.max(Math.abs(l1-l2)+.001,raw));
  const ux=dx/raw,uy=dy/raw,k=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-k*k));
  return point(a.x+ux*k-uy*h*bend,a.y+uy*k+ux*h*bend);
 }
 function running(p){
  const theta=TAU*p,bob=-7*Math.pow(Math.cos(TAU*(p-.46)),2);
  const hip=point(216,229+bob,31),shoulder=point(245,171+bob,35);
  const paths=[];
  for(const offset of [.5,0]){
   const f=(p+offset)%1,flight=f>.42,u=flight?(f-.42)/.58:f/.42;
   const foot=flight?point(166+119*(u*u*(3-2*u)),286-59*Math.sin(Math.PI*u),15):point(285-119*u,286,15);
   const knee=joint(hip,foot,47,49,-1);knee.w=23;
   paths.push({points:[hip,knee,foot],id:'leg'});
  }
  const arms=[];
  for(const offset of [0,Math.PI]){
   const angle=.8*Math.cos(theta+offset),elbow=point(shoulder.x+45*Math.sin(angle),shoulder.y+45*Math.cos(angle),21);
   const wrist=point(elbow.x+42*Math.sin(angle+1.8),elbow.y+42*Math.cos(angle+1.8),14);
   arms.push({points:[point(shoulder.x,shoulder.y,29),elbow,wrist],id:'arm'});
  }
  return {paths:[paths[0],arms[0],{points:[shoulder,hip],id:'torso'},paths[1],arms[1]],circles:[{x:264,y:129+bob,r:23}],wheels:[],water:0,clipWater:false};
 }
 function swimming(p){
  const theta=TAU*p,roll=3*Math.sin(theta*2),shoulder=point(251,264+roll,32),hip=point(157,276,26);
  const paths=[];
  for(const offset of [Math.PI,0]){
   const phase=theta+offset,hand=point(251+91*Math.cos(phase),265-79*Math.sin(phase),13);
   const elbow=joint(shoulder,hand,52,58,Math.sin(phase)>0?-1:1);elbow.w=22;
   paths.push({points:[shoulder,elbow,hand],id:'arm'});
  }
  const kick=8*Math.sin(theta*2),legs=[{points:[hip,point(113,277+kick,19),point(75,271-kick,12)],id:'leg'},{points:[hip,point(116,280-kick,18),point(78,288+kick,11)],id:'leg'}];
  return {paths:[paths[0],...legs,{points:[hip,shoulder],id:'torso'},paths[1]],circles:[{x:291,y:242+roll,r:22}],wheels:[],water:8*Math.pow(Math.sin(Math.PI*p),2),clipWater:true};
 }
 function cycling(p){
  const theta=TAU*p,bob=-3*Math.pow(Math.sin(theta),2),hip=point(201,169+bob,30),shoulder=point(257,139+bob,34);
  const paths=[];
  const rear=point(141,243),front=point(306,243),crank=point(224,243),seat=point(201,181),stem=point(283,180);
  const frame=[[rear,seat],[seat,crank],[crank,rear],[seat,stem],[stem,front],[front,crank]];
  for(const [a,b] of frame)paths.push({points:[{...a,w:7},{...b,w:7}],id:'bicycle-frame'});
  paths.push({points:[point(194,180,9),point(211,180,9)],id:'saddle'});
  paths.push({points:[point(275,174,7),point(289,174,7),point(294,187,7)],id:'handlebar'});
  const legs=[];
  for(const offset of [Math.PI,0]){
   const phase=theta+offset,pedal=point(224+18*Math.cos(phase),243+18*Math.sin(phase),13),knee=joint(hip,pedal,48,52,-1);knee.w=24;
   legs.push({points:[hip,knee,pedal],id:'leg'});
   paths.push({points:[point(224,243,5),{...pedal,w:5}],id:'crank'});
  }
  const arm={points:[shoulder,point(276,164+bob,21),point(285,181,13)],id:'arm'};
  return {paths:[...paths,legs[0],{points:[hip,shoulder],id:'torso'},arm,legs[1]],circles:[{x:280,y:99+bob,r:22}],wheels:[{x:141,y:243,r:47,angle:theta},{x:306,y:243,r:47,angle:theta}],water:0,clipWater:false};
 }
 function at(id,p){p=clamp(p);return ({running,swimming,cycling}[id]||running)(p);}
 function ribbon(ctx,points,color){
  ctx.fillStyle=color;
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1],d=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/d,ny=(b.x-a.x)/d;
   ctx.beginPath();ctx.moveTo(a.x+nx*a.w/2,a.y+ny*a.w/2);ctx.lineTo(b.x+nx*b.w/2,b.y+ny*b.w/2);ctx.lineTo(b.x-nx*b.w/2,b.y-ny*b.w/2);ctx.lineTo(a.x-nx*a.w/2,a.y-ny*a.w/2);ctx.closePath();ctx.fill();
  }
  for(const a of points){ctx.beginPath();ctx.arc(a.x,a.y,a.w/2,0,TAU);ctx.fill();}
 }
 function render(id,ctx,time,{color='#101e62',background='#fff',watch=false,clear=true,table=true,guides=false}={}){
  const p=clamp((time-1.4)/2.2),s=at(id,p),size=ctx.canvas.width;
  if(clear)ctx.clearRect(0,0,size,size);ctx.save();ctx.scale(size/454,size/454);
  if(clear){ctx.fillStyle=watch?'#000':background;ctx.fillRect(0,0,454,454);}
  if(watch){ctx.beginPath();ctx.arc(227,227,226,0,TAU);ctx.clip();}
  ctx.strokeStyle=color;ctx.fillStyle=color;
  for(const wheel of s.wheels){
   ctx.lineWidth=10;ctx.beginPath();ctx.arc(wheel.x,wheel.y,wheel.r,0,TAU);ctx.stroke();
   ctx.lineWidth=4;for(let k=0;k<3;k++){const a=wheel.angle+k*TAU/3;ctx.beginPath();ctx.moveTo(wheel.x+29*Math.cos(a),wheel.y+29*Math.sin(a));ctx.lineTo(wheel.x+39*Math.cos(a),wheel.y+39*Math.sin(a));ctx.stroke();}
  }
  ctx.save();if(s.clipWater){ctx.beginPath();ctx.rect(0,0,454,294.94);ctx.clip();}
  for(const path of s.paths)ribbon(ctx,path.points,color);
  for(const c of s.circles){ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,TAU);ctx.fill();}
  if(guides){ctx.lineWidth=1;ctx.strokeStyle=watch?'#eec97d':'#cd8d32';for(const path of s.paths.filter(p=>p.id!=='bicycle-frame')){ctx.beginPath();path.points.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();for(const q of path.points)ctx.strokeRect(q.x-3,q.y-3,6,6);}}
  ctx.restore();
  if(table){ctx.strokeStyle=color;ctx.lineWidth=9.46;ctx.lineCap='round';ctx.beginPath();for(let i=0;i<=80;i++){const x=53.28+324.22*i/80,y=294.94+s.water*Math.sin(i/80*TAU*3-TAU*p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
   if(s.water>.05){ctx.save();ctx.globalAlpha*=.45;ctx.lineWidth=4;ctx.beginPath();for(let i=0;i<=64;i++){const x=84+264*i/64,y=312+s.water*.45*Math.sin(i/64*TAU*3-TAU*p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.restore();}}
  ctx.restore();return s;
 }
 function get(id){if(id==='tabletennis')return root.SportsMotion;return {render:(ctx,t,o)=>render(id,ctx,t,o),phase:t=>phase(id,(t-1.4)/2.2)};}
 function phase(id,p){p=clamp(p);if(id==='running')return p<.2?'前倾蹬地':p<.45?'腾空摆臂':p<.7?'交换支撑腿':'落地回位';if(id==='swimming')return p<.25?'前伸入水':p<.5?'屈肘划水':p<.75?'提肘移臂':'换臂回位';return p<.25?'前倾踩踏':p<.5?'左右交替蹬踏':p<.75?'车轮持续滚动':'完成一周踩踏';}
 const api={names,at,get,phase,render};root.SportsDisciplines=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
