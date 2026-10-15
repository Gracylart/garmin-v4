/* Tutorial study: null-controlled paths, tapered strokes, spatial turns and Echo.
 * Coordinates are authored for this reconstruction, not extracted Olympic assets.
 * Pure functions allow browser scrubbing and editable AE frame export from one rig. */
(function(root){
 'use strict';
 const duration=5.6, clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const mix=(a,b,u)=>a+(b-a)*u, ease=u=>u*u*(3-2*u);
 const point=(x,y,z=0)=>[x,y,z];
 // The shoulder and waist act as parent nulls; limbs retain their own path points.
 const poses=[
  {t:0, yaw:-1.16, roll:-.24, lift:25, head:point(33,-92), a:[point(4,-40),point(-30,2,12),point(-63,35,15)], b:[point(79,-40),point(114,-7,-9),point(95,38,-20)], paddle:-.9},
  {t:.92,yaw:-.05,roll:0,lift:0,head:point(34,-94),a:[point(5,-40),point(-68,-6,8),point(-148,-12,12)],b:[point(79,-44),point(151,-16,-10),point(121,48,-15)],paddle:0},
  {t:1.4,yaw:-.05,roll:0,lift:0,head:point(34,-94),a:[point(5,-40),point(-68,-6,8),point(-148,-12,12)],b:[point(79,-44),point(151,-16,-10),point(121,48,-15)],paddle:0},
  {t:2.04,yaw:.76,roll:.065,lift:5,head:point(44,-87),a:[point(12,-36),point(45,8,50),point(92,-22,83)],b:[point(83,-39),point(148,-7,-30),point(102,51,-45)],paddle:.85},
  {t:2.4,yaw:-.12,roll:-.035,lift:-1,head:point(28,-96),a:[point(0,-43),point(-52,-18,23),point(-89,-23,13)],b:[point(77,-46),point(136,-13,-23),point(115,47,-25)],paddle:-.14},
  {t:2.78,yaw:-.68,roll:-.09,lift:-4,head:point(21,-95),a:[point(-3,-45),point(-92,-43,20),point(-167,-69,38)],b:[point(69,-48),point(119,-14,-15),point(103,50,-30)],paddle:-.52},
  {t:3.46,yaw:-.05,roll:0,lift:0,head:point(34,-94),a:[point(5,-40),point(-68,-6,8),point(-148,-12,12)],b:[point(79,-44),point(151,-16,-10),point(121,48,-15)],paddle:0},
  {t:4.35,yaw:-.05,roll:0,lift:0,head:point(34,-94),a:[point(5,-40),point(-68,-6,8),point(-148,-12,12)],b:[point(79,-44),point(151,-16,-10),point(121,48,-15)],paddle:0},
  {t:5.12,yaw:-1.22,roll:.2,lift:-24,head:point(32,-92),a:[point(4,-40),point(-30,2,12),point(-63,35,15)],b:[point(79,-40),point(114,-7,-9),point(95,38,-20)],paddle:-.9},
  {t:5.6,yaw:-1.22,roll:.2,lift:-24,head:point(32,-92),a:[point(4,-40),point(-30,2,12),point(-63,35,15)],b:[point(79,-40),point(114,-7,-9),point(95,38,-20)],paddle:-.9}
 ];
 function sample(t){
  t=clamp(t,0,duration);let i=0;while(i<poses.length-2&&t>poses[i+1].t)i++;
  const a=poses[i],b=poses[i+1],u=ease(clamp((t-a.t)/(b.t-a.t)));
  const p={};for(const k of ['yaw','roll','lift','paddle'])p[k]=mix(a[k],b[k],u);
  p.head=a.head.map((v,j)=>mix(v,b.head[j],u));
  for(const k of ['a','b'])p[k]=a[k].map((v,j)=>v.map((q,n)=>mix(q,b[k][j][n],u)));
  return p;
 }
 function project(v,p){
  const x=v[0]-37,z=v[2],c=Math.cos(p.yaw),s=Math.sin(p.yaw);
  const xx=x*c+z*s+37,zz=-x*s+z*c,scale=560/(560-zz);
  const y=v[1]+p.lift,cr=Math.cos(p.roll),sr=Math.sin(p.roll);
  return {x:(xx*cr-y*sr)*scale,y:(xx*sr+y*cr)*scale,z:zz,scale};
 }
 function partial(points,f){
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  let remaining=lengths.reduce((a,b)=>a+b,0)*clamp(f),out=[points[0]];
  for(let i=0;i<lengths.length;i++){
   if(remaining>=lengths[i]){out.push(points[i+1]);remaining-=lengths[i];}
   else {const u=remaining/(lengths[i]||1),a=points[i],b=points[i+1];out.push({x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),w:mix(a.w,b.w,u)});break;}
  }return out;
 }
 function ball(t){
  const k=[{t:1.65,x:-237,y:-39},{t:1.98,x:-165,y:62.5},{t:2.4,x:-143,y:-25},{t:2.72,x:-180,y:62.5},{t:3.08,x:-259,y:-35}];
  if(t<k[0].t||t>k[k.length-1].t)return null;
  let i=0;while(i<k.length-2&&t>k[i+1].t)i++;
  const a=k[i],b=k[i+1],u=(t-a.t)/(b.t-a.t);
  return {x:mix(a.x,b.x,u),y:mix(a.y,b.y,u)-Math.sin(Math.PI*u)*14,r:7};
 }
 function at(t){
  t=clamp(t,0,duration);const p=sample(t);
  const growth=ease(clamp((t-.12)/.7))*(1-ease(clamp((t-4.58)/.52)));
  const tail=ease(clamp(t/.55))*(1-ease(clamp((t-4.86)/.35)));
  const head=project(p.head,p);head.r=29*head.scale*ease(clamp((t-.32)/.45))*(1-ease(clamp((t-4.48)/.42)));
  const arms=['b','a'].map(k=>{
   const widths=k==='a'?[43,27,13]:[43,30,19];
   const points=p[k].map((v,i)=>{const q=project(v,p);return {...q,w:widths[i]*q.scale*Math.sqrt(growth)};});
   return {id:k==='a'?'racket-arm':'free-arm',points:partial(points,growth),full:points};
  });
  const wrist=arms[1].full[2],elbow=arms[1].full[1];
  const angle=Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x);
  const racketGrowth=ease(clamp((growth-.58)/.42));
  const racket={x:wrist.x+Math.cos(angle)*23,y:wrist.y+Math.sin(angle)*23,
   rx:25*Math.max(.3,Math.abs(Math.cos(p.yaw+p.paddle)))*wrist.scale*racketGrowth,ry:25*wrist.scale*racketGrowth,
   angle:p.roll+p.paddle*.28,visible:racketGrowth>.001};
  return {t,head,arms,racket,ball:ball(t),growth,table:{x1:-212*tail,x2:165*tail,y:75,width:11*tail,angle:(1-tail)*-.7},phase:phase(t),pose:p};
 }
 function phase(t){return t<.92?'线条入场':t<1.4?'预备姿态':t<2.22?'转身蓄力':t<2.53?'挥拍击球':t<3.2?'随挥与回弹':t<4.35?'回到预备':t<5.12?'收束退场':'循环留白';}
 function ribbon(ctx,points,color){
  if(points.length<2||points[0].w<.05)return;
  ctx.fillStyle=color;
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1],d=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/d,ny=(b.x-a.x)/d;
   ctx.beginPath();ctx.moveTo(a.x+nx*a.w/2,a.y+ny*a.w/2);ctx.lineTo(b.x+nx*b.w/2,b.y+ny*b.w/2);
   ctx.lineTo(b.x-nx*b.w/2,b.y-ny*b.w/2);ctx.lineTo(a.x-nx*a.w/2,a.y-ny*a.w/2);ctx.closePath();ctx.fill();
  }
  for(const p of points){ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0,p.w/2),0,Math.PI*2);ctx.fill();}
 }
 function render(ctx,t,{color='#101e62',background='#ffffff',watch=false,guides=false,trails=true,clear=true,table=true}={}){
  const size=ctx.canvas.width;if(clear)ctx.clearRect(0,0,size,size);ctx.save();
  if(clear){ctx.fillStyle=watch?'#000':background;ctx.fillRect(0,0,size,size);}
  ctx.translate(size/2,size/2);ctx.scale(size/454,size/454);
  if(watch){ctx.beginPath();ctx.arc(0,0,226,0,Math.PI*2);ctx.clip();ctx.scale(.86,.86);ctx.translate(10,4);}
  else {ctx.scale(.86,.86);ctx.translate(10,4);}
  const s=at(t);ctx.fillStyle=color;
  if(table&&s.table.width>0){ctx.save();ctx.rotate(s.table.angle);ctx.beginPath();ctx.roundRect(s.table.x1,s.table.y-s.table.width/2,s.table.x2-s.table.x1,s.table.width,s.table.width/2);ctx.fill();ctx.restore();}
  for(const arm of s.arms)ribbon(ctx,arm.points,color);
  if(s.head.r>.05){ctx.beginPath();ctx.arc(s.head.x,s.head.y,s.head.r,0,Math.PI*2);ctx.fill();}
  if(s.racket.visible){ctx.save();ctx.translate(s.racket.x,s.racket.y);ctx.rotate(s.racket.angle);ctx.beginPath();ctx.ellipse(0,0,s.racket.rx,s.racket.ry,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(trails&&s.ball){
   // Opaque overlapping echoes reproduce the tutorial's solid Echo silhouette.
   const b=s.ball,old=ball(Math.max(1.65,t-.065));
   if(old){ctx.lineCap='round';ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(old.x,old.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
   for(let i=9;i>0;i--){const b=ball(t-i*.007);if(b){ctx.beginPath();ctx.arc(b.x,b.y,Math.max(1,b.r*(1-i*.078)),0,Math.PI*2);ctx.fill();}}
  }
  if(s.ball){ctx.beginPath();ctx.arc(s.ball.x,s.ball.y,s.ball.r,0,Math.PI*2);ctx.fill();}
  if(guides){
   ctx.save();ctx.lineWidth=1;ctx.strokeStyle=watch?'#eec97d':'#cd8d32';ctx.fillStyle=ctx.strokeStyle;
   for(const a of s.arms){ctx.beginPath();a.full.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();for(const q of a.full){ctx.strokeRect(q.x-4,q.y-4,8,8);}}
   ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(37,-45);ctx.lineTo(37,75);ctx.stroke();ctx.restore();
  }ctx.restore();return s;
 }
 const transitionDuration=.5;
 const transitionEase=u=>{u=clamp(u);return u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;};
 function eyePoints(side){
  // Neutral eyes from play-preview.js: 184 radius / .27 split / 49×82 / ±.06 rad.
  const scale=454/390,cx=227+side*184*Math.sin(.27)*scale,cy=227-18*scale;
  const angle=side*.06,depth=Math.cos(.27),w=49*depth*scale,h=82*scale,half=(h-w)/2;
  return [-half,0,half].map(y=>({x:cx-y*Math.sin(angle),y:cy+y*Math.cos(angle),w}));
 }
 function transitionAt(seconds,{reverse=false,motionTime=1.4}={}){
  const normalized=clamp(seconds/transitionDuration),p=reverse?1-normalized:normalized,u=transitionEase(p),s=at(motionTime);
  const toScreen=q=>({x:227+.86*(q.x+10),y:227+.86*(q.y+4),w:q.w*.86});
  const arms=s.arms.map(a=>{
   const initial=eyePoints(a.id==='racket-arm'?-1:1),target=a.full.map(toScreen);
   return {id:a.id,points:target.map((q,i)=>({x:mix(initial[i].x,q.x,u),y:mix(initial[i].y,q.y,u),w:mix(initial[i].w,q.w,u)}))};
  });
  const headAnchor=arms.find(a=>a.id==='racket-arm').points[0];
  const headU=transitionEase(clamp((p-.08)/.88)),headTarget=toScreen(s.head);
  const head={x:mix(headAnchor.x,headTarget.x,headU),y:mix(headAnchor.y,headTarget.y,headU),r:s.head.r*.86*headU};
  const paddleU=transitionEase(clamp((p-.22)/.76)),paddleTarget=toScreen(s.racket);
  const wrist=arms.find(a=>a.id==='racket-arm').points[2];
  const racket={x:mix(wrist.x,paddleTarget.x,paddleU),y:mix(wrist.y,paddleTarget.y,paddleU),rx:s.racket.rx*.86*paddleU,ry:s.racket.ry*.86*paddleU,angle:s.racket.angle*paddleU};
  const tableU=transitionEase(clamp((p-.24)/.7));
  const table={x1:mix(227,227+.86*(s.table.x1+10),tableU),x2:mix(227,227+.86*(s.table.x2+10),tableU),y:mix(250,227+.86*(s.table.y+4),tableU),width:s.table.width*.86*tableU};
  return {normalized,p,u,arms,head,racket,table};
 }
 function drawNeutralEyes(ctx,color){
  ctx.fillStyle=color;
  for(const side of [-1,1]){
   ctx.save();ctx.translate(227+side*184*Math.sin(.27)*454/390,227-18*454/390);ctx.scale(454/390,454/390);ctx.scale(Math.cos(.27),1);ctx.rotate(side*.06);
   const w=49,h=82,r=w*.48,l=-w/2,right=w/2,top=-h/2,bottom=h/2,flat=w-2*r;
   ctx.beginPath();ctx.moveTo(l+r,top);ctx.bezierCurveTo(l+r+flat/3,top,right-r-flat/3,top,right-r,top);
   ctx.bezierCurveTo(right-r*.45,top,right,top+r*.45,right,top+r);ctx.lineTo(right,bottom-r);
   ctx.bezierCurveTo(right,bottom-r*.45,right-r*.45,bottom,right-r,bottom);
   ctx.bezierCurveTo(right-r-flat/3,bottom,l+r+flat/3,bottom,l+r,bottom);
   ctx.bezierCurveTo(l+r*.45,bottom,l,bottom-r*.45,l,bottom-r);ctx.lineTo(l,top+r);
   ctx.bezierCurveTo(l,top+r*.45,l+r*.45,top,l+r,top);ctx.closePath();ctx.fill();ctx.restore();
  }
 }
 function renderTransition(ctx,seconds,options={}){
  const {watch=false,color='#101e62',background='#ffffff',guides=false,reverse=false,motionTime=1.4}=options;
  const s=transitionAt(seconds,{reverse,motionTime});
  // The fully formed endpoint uses the sports renderer itself: no pose discontinuity.
  if(s.p>=1)return render(ctx,motionTime,options);
  const size=ctx.canvas.width;ctx.clearRect(0,0,size,size);ctx.save();ctx.scale(size/454,size/454);
  ctx.fillStyle=watch?'#000':background;ctx.fillRect(0,0,454,454);
  if(watch){ctx.beginPath();ctx.arc(227,227,226,0,Math.PI*2);ctx.clip();}
  if(s.p<=0){drawNeutralEyes(ctx,color);ctx.restore();return s;}
  ctx.fillStyle=color;ctx.fillRect(s.table.x1,s.table.y-s.table.width/2,s.table.x2-s.table.x1,s.table.width);
  s.arms.forEach(a=>ribbon(ctx,a.points,color));
  if(s.head.r>.01){ctx.beginPath();ctx.arc(s.head.x,s.head.y,s.head.r,0,Math.PI*2);ctx.fill();}
  if(s.racket.rx>.01){ctx.save();ctx.translate(s.racket.x,s.racket.y);ctx.rotate(s.racket.angle);ctx.beginPath();ctx.ellipse(0,0,s.racket.rx,s.racket.ry,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(guides){ctx.strokeStyle=watch?'#eec97d':'#cd8d32';ctx.lineWidth=1;for(const a of s.arms){ctx.beginPath();a.points.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();a.points.forEach(q=>ctx.strokeRect(q.x-3,q.y-3,6,6));}}
  ctx.restore();return s;
 }
 const api={duration,poses,at,ball,render,phase,transitionDuration,transitionEase,transitionAt,renderTransition};root.SportsMotion=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
