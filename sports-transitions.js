(function(root){
 'use strict';
 const B=root.SportsBounce,E=root.SportsExact,cache=new Map();
 const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,u)=>a+(b-a)*u,S=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
 const PADDLE={start:.2,arrival:.46,finish:.54,ramp:.12};
 const duration=kind=>kind==='paddle'?PADDLE.finish:kind==='assemble'?1.26:1.02;
 function begin(ctx,o){const size=ctx.canvas.width;ctx.clearRect(0,0,size,size);ctx.save();ctx.scale(size/454,size/454);ctx.fillStyle=o.watch?'#000':o.background||'#fff';ctx.fillRect(0,0,454,454);if(o.watch){ctx.beginPath();ctx.arc(227,227,226,0,Math.PI*2);ctx.clip();}ctx.fillStyle=ctx.strokeStyle=o.color||'#101e62';return size;}
 function circle(ctx,x,y,r){if(r<=0)return;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 function segment(ctx,s){ctx.beginPath();ctx.moveTo(s.start.x,s.start.y);ctx.quadraticCurveTo(s.control.x,s.control.y,s.end.x,s.end.y);ctx.lineWidth=s.width;ctx.lineCap='round';ctx.stroke();}
 function renderBlob(ctx,node,t,o){
  if(t<=.412)return B.render(ctx,node,Math.min(t,.411999),o);
  if(t>=1.02)return o.sportMotion.render(ctx,0,o);
  // The sports anchor is revealed behind the shrinking foreground sphere.
  if(t>=.84)o.sportMotion.render(ctx,0,o);
  const size=ctx.canvas.width;
  if(t<.84)begin(ctx,o);else{ctx.save();ctx.scale(size/454,size/454);if(o.watch){ctx.beginPath();ctx.arc(227,227,226,0,Math.PI*2);ctx.clip();}ctx.fillStyle=ctx.strokeStyle=o.color||'#101e62';}
  if(t<.47){
   const u=S((t-.412)/.058),s=B.at(node,.411999).segment,c={x:227,y:438};
   const p=a=>({x:mix(a.x,c.x,u),y:mix(a.y,c.y,u)});
   segment(ctx,{start:p(s.start),end:p(s.end),control:p(s.control),width:mix(s.width,42,u)});
  }else if(t<.64){
   const u=S((t-.47)/.17),y=mix(438,227,u),r=mix(21,330,u),neck=1-S((t-.47)/.095);
   // A narrowing curved neck joins the rising sphere to the lower rim.
   if(neck>0){const w=35*neck,cy=y+r*.45;ctx.beginPath();ctx.moveTo(227-w,466);ctx.bezierCurveTo(227-w,420,227-r*.75,cy,227-r*.7,cy);ctx.lineTo(227+r*.7,cy);ctx.bezierCurveTo(227+r*.75,cy,227+w,420,227+w,466);ctx.closePath();ctx.fill();}
   ctx.save();ctx.translate(227,y);const stretch=1+.16*Math.sin(Math.PI*u);ctx.scale(1/stretch,stretch);circle(ctx,0,0,r);ctx.restore();
  }else if(t<.84){ctx.fillRect(-2,-2,458,458);}
  else{const u=S((t-.84)/.18);circle(ctx,227,227,330*(1-u));}
  ctx.restore();
 }
 function cubic(a,b,c,d,u){const q=1-u;return{x:q*q*q*a.x+3*q*q*u*b.x+3*q*u*u*c.x+u*u*u*d.x,y:q*q*q*a.y+3*q*q*u*b.y+3*q*u*u*c.y+u*u*u*d.y};}
 function parts(){
  if(cache.has('parts'))return cache.get('parts');
  const data=E.database.tabletennis,paths=data.frames[data.anchor].path.match(/M[^z]*z/g)||[],result={body:[],ball:[],table:[]};
  for(const d of paths){const cmds=d.match(/[Mhvz][^Mhvz]*/g);let x=0,y=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const cmd of cmds){const v=cmd.slice(1).trim().split(/\s+/).map(Number);if(cmd[0]==='M'){x=v[0];y=v[1];}else if(cmd[0]==='h')x+=v[0];else if(cmd[0]==='v')y+=v[0];minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
   const key=minY>=640&&maxY<=680?'table':maxX<300&&maxY<420?'ball':'body';result[key].push(d);
  }
  for(const key of Object.keys(result))result[key]=new Path2D(result[key].join(''));cache.set('parts',result);return result;
 }
 function native(ctx,part,fn){const p=E.layout('tabletennis');ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.s,p.s);if(fn)fn(ctx);ctx.fill(parts()[part],'evenodd');ctx.restore();}
 function departureTarget(node){
  const id=node.sport||'tabletennis',placement=E.layout(id);if(id==='tabletennis')return{x:placement.x+224*placement.s,y:placement.y+479*placement.s};
  const frame=E.database[id].frames[E.database[id].anchor],loops=(frame.path.match(/M[^z]*z/g)||[]).map(decodeContour);
  // Land inside an actual filled part of the anchor, rather than in a bounding-box gap.
  const candidates=[];
  for(let y=frame.bbox[1]+4;y<frame.bbox[3]-4;y+=4){
   const xs=[];for(const loop of loops)for(let i=0;i<loop.points.length;i++){
    const a=loop.points[i],b=loop.points[(i+1)%loop.points.length];
    if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
   }
   xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)if(xs[i+1]-xs[i]>=28)candidates.push({x:xs[i]+14,y});
  }
  candidates.sort((a,b)=>a.x-b.x||Math.abs(a.y-(frame.bbox[1]+frame.bbox[3])/2)-Math.abs(b.y-(frame.bbox[1]+frame.bbox[3])/2));
  const p=candidates[0]||{x:(frame.bbox[0]+frame.bbox[2])/2,y:(frame.bbox[1]+frame.bbox[3])/2};
  return{x:placement.x+p.x*placement.s,y:placement.y+p.y*placement.s};
 }
 function route(node){
  const key=node;if(cache.has(key))return cache.get(key);
  const t=.33,half=B.lengthAt(t,node.lengthKeys)/(2*B.R),a=B.at(node,t).orbitAngle,entryHalf=B.lengthAt(.2,node.lengthKeys)/(2*B.R),points=[];
  // One arc-length route covers entry, orbit and departure; there is no second slow easing section.
  const startAngle=-entryHalf,endAngle=a+half;
  for(let i=0;i<=260;i++){const angle=mix(startAngle,endAngle,i/260);points.push({x:227+B.R*Math.sin(angle),y:227+B.R*Math.cos(angle)});}
  const target=departureTarget(node),front=points.at(-1),c1={x:front.x+90*Math.cos(endAngle),y:front.y-90*Math.sin(endAngle)},c2={x:target.x-24,y:target.y-65};
  const arcCount=points.length;for(let i=1;i<=140;i++)points.push(cubic(front,c1,c2,target,i/140));
  const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  const initial=2*entryHalf*B.R,data={points,distances,initial,detach:distances[arcCount-1],total:distances.at(-1),tailLength:B.lengthAt(.33,node.lengthKeys)};
  const fraction=(data.detach-initial)/(data.total-initial),u=fraction*(1-PADDLE.ramp/2)+PADDLE.ramp/2;
  data.departTime=PADDLE.start+u*(PADDLE.arrival-PADDLE.start);
  cache.set(key,data);return data;
 }
 function travelProgress(u){u=clamp(u);const r=PADDLE.ramp;return (u<r?u*u/(2*r):u-r/2)/(1-r/2);}
 function paddleState(node,t){
  const r=route(node),u=clamp((t-PADDLE.start)/(PADDLE.arrival-PADDLE.start));
  const head=mix(r.initial,r.total,travelProgress(u)),length=mix(r.initial,r.tailLength,S(u/.65));
  const tail=t<PADDLE.arrival?Math.max(0,head-length):mix(r.total-r.tailLength,r.total,clamp((t-PADDLE.arrival)/(PADDLE.finish-PADDLE.arrival)));
  return {route:r,head,tail,departTime:r.departTime,arrival:PADDLE.arrival,finish:PADDLE.finish};
 }
 function along(r,d){d=Math.max(0,Math.min(r.total,d));let i=1;while(i<r.distances.length-1&&r.distances[i]<d)i++;const u=(d-r.distances[i-1])/(r.distances[i]-r.distances[i-1]||1);return{x:mix(r.points[i-1].x,r.points[i].x,u),y:mix(r.points[i-1].y,r.points[i].y,u)};}
 function bodyMask(progress){
  const mask=new Path2D();
  // Reveal tubes follow each actual limb from its left end; the native silhouette clips their edges.
  for(const [points,radius] of [[[[275,480],[444,499],[550,461]],62],[[[634,412],[762,460],[706,593]],65],[[[490,355],[592,355]],58]]){
   const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
   const end=lengths.at(-1)*progress;for(let d=0;d<=end;d+=3){let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;const u=(d-lengths[i-1])/(lengths[i]-lengths[i-1]);const x=mix(points[i-1][0],points[i][0],u),y=mix(points[i-1][1],points[i][1],u),r=radius*Math.min(1,progress*6);mask.moveTo(x+r,y);mask.arc(x,y,r,0,Math.PI*2);}
  }return mask;
 }
 function renderPaddle(ctx,node,t,o){
  if(t<=PADDLE.start)return B.render(ctx,node,t,o);
  if(t>=PADDLE.finish)return o.sportMotion.render(ctx,0,o);
  begin(ctx,o);const state=paddleState(node,t),r=state.route,head=state.head,tail=state.tail;
  ctx.beginPath();const a=along(r,tail);ctx.moveTo(a.x,a.y);for(let d=tail+2;d<head;d+=2){const p=along(r,d);ctx.lineTo(p.x,p.y);}const h=along(r,head);ctx.lineTo(h.x,h.y);ctx.lineWidth=9.46;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  const grow=S((t-PADDLE.arrival)/(PADDLE.finish-PADDLE.arrival));
  if(t>=PADDLE.arrival){
   if(node.sport&&node.sport!=='tabletennis'){
    // Reveal the exact anchor in place. No vertical translation or body squash.
    ctx.save();ctx.beginPath();ctx.rect(0,0,h.x+5+(454-h.x-5)*grow,454);ctx.clip();
    for(const part of assemblyParts(node.sport))drawAssemblyPart(ctx,part);
    ctx.restore();
   }else{
   native(ctx,'table',c=>c.translate(-1100*(1-grow),0));
   native(ctx,'body',c=>{c.clip(bodyMask(grow));const mask=new Path2D();mask.rect(-100,-100,1200,1200);mask.rect(0,430,277,105);c.clip(mask,'evenodd');});
   // The paddle has its final size on contact; incoming line length never inflates it.
   native(ctx,'body',c=>{c.beginPath();c.rect(0,430,277,105);c.clip();});
   }
  }
  circle(ctx,h.x,h.y,4.73);ctx.restore();
 }
 const ASSEMBLY={start:.412,flight:.16,landed:.59,vibrate:.84,align:1.09,complete:1.19,finish:1.26};
 const assemblyCache=new Map(),layouts=new WeakMap();
 function decodeContour(d){let x=0,y=0;const points=[];for(const m of d.matchAll(/([Mhv])([^Mhvz]*)/g)){const v=m[2].trim().split(/\s+/).map(Number);if(m[1]==='M'){x=v[0];y=v[1];}else if(m[1]==='h')x+=v[0];else y+=v[0];points.push([x,y]);}let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {d,points,area:area/2,box:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]};}
 function assemblyParts(id){
  if(assemblyCache.has(id))return assemblyCache.get(id);
  const data=E.database[id],frame=data.frames[data.anchor],loops=(frame.path.match(/M[^z]*z/g)||[]).map(decodeContour),outer=loops.filter(p=>p.area>0).map(p=>({...p,holes:[]}));
  for(const hole of loops.filter(p=>p.area<0)){const h=hole.box,parent=outer.filter(p=>p.box[0]<=h[0]&&p.box[1]<=h[1]&&p.box[2]>=h[2]&&p.box[3]>=h[3]).sort((a,b)=>a.area-b.area)[0];if(parent)parent.holes.push(hole.d);}
  const transform=E.layout(id),result=[];
  function add(p,clip){const box=clip?[clip[0],clip[1],clip[0]+clip[2],clip[1]+clip[3]]:p.box;result.push({path:new Path2D(p.d+p.holes.join('')),clip,transform,cx:transform.x+(box[0]+box[2])/2*transform.s,cy:transform.y+(box[1]+box[3])/2*transform.s});}
  for(const p of outer){
   if(id==='tabletennis'&&p.box[0]<200&&p.box[2]>550&&p.box[1]>420&&p.box[3]<540){add(p,[p.box[0],p.box[1],277-p.box[0],p.box[3]-p.box[1]]);add(p,[277,p.box[1],p.box[2]-277,p.box[3]-p.box[1]]);}
   else if(id==='swimming'&&p.area>30000){const cut=350;add(p,[p.box[0],p.box[1],cut-p.box[0],p.box[3]-p.box[1]]);add(p,[cut,p.box[1],p.box[2]-cut,p.box[3]-p.box[1]]);}
   else if(id==='cycling'&&p.area>40000){const cut=478;add(p,[p.box[0],p.box[1],p.box[2]-p.box[0],cut-p.box[1]]);add(p,[p.box[0],cut,p.box[2]-p.box[0],p.box[3]-cut]);}
   else add(p);
  }
  if(transform.ground){const g=transform.ground;result.push({ground:g,cx:(g[0]+g[2])/2,cy:g[1]});}
  assemblyCache.set(id,result);return result;
 }
 function assemblyLayout(node){
  if(layouts.has(node))return layouts.get(node);let seed=(Math.random()*4294967296)>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const directions=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[directions[i],directions[j]]=[directions[j],directions[i]];}
  const layout=assemblyParts(node.sport||'tabletennis').map((part,i)=>{const angle=directions[i%4]*Math.PI/2+(random()-.5)*.48,distance=700+random()*90;return {...part,dx:Math.cos(angle)*distance,dy:Math.sin(angle)*distance,rotation:(random()-.5)*1.8,throwLift:60+random()*55,parkX:(random()-.5)*85,parkY:(random()-.5)*64,parkAngle:(random()<.5?-1:1)*(.16+random()*.34),delay:random()*.018,sign:random()<.5?-1:1};});layouts.set(node,layout);return layout;
 }
 function drawAssemblyPart(ctx,p){ctx.save();if(p.ground){ctx.beginPath();ctx.lineWidth=9.46;ctx.lineCap='round';ctx.moveTo(p.ground[0],p.ground[1]);ctx.lineTo(p.ground[2],p.ground[3]);ctx.stroke();}else{ctx.translate(p.transform.x,p.transform.y);ctx.scale(p.transform.s,p.transform.s);if(p.clip){ctx.beginPath();ctx.rect(...p.clip);ctx.clip();}ctx.fill(p.path,'evenodd');}ctx.restore();}
 function drawFixedRing(ctx,node,t,alpha=1){
  const time=Math.min(.412,t),angle=t<.412?B.at(node,time).orbitAngle:Math.PI*2,length=Math.min(Math.PI*2*B.R,B.lengthAt(time,node.lengthKeys)),half=length/(2*B.R);
  ctx.save();ctx.globalAlpha=alpha;ctx.lineWidth=9.46;ctx.lineCap='round';ctx.beginPath();
  if(length>=Math.PI*2*B.R-.01)ctx.arc(227,227,B.R,0,Math.PI*2);
  else ctx.arc(227,227,B.R,Math.PI/2-angle+half,Math.PI/2-angle-half,true);
  ctx.stroke();ctx.restore();
 }
 function assemblyPose(p,t){
  const elapsed=t-ASSEMBLY.start-p.delay;if(elapsed<0)return null;
  const u=clamp(elapsed/ASSEMBLY.flight),e=-.45*u*u*u+.05*u*u+1.4*u;
  if(u<1)return{x:p.dx*(1-e)+p.parkX*e,y:p.dy*(1-e)+p.parkY*e-p.throwLift*Math.sin(Math.PI*u),angle:mix(p.rotation,p.parkAngle,e)};
  const align=S((t-ASSEMBLY.align)/(ASSEMBLY.complete-ASSEMBLY.align)),v=(t-ASSEMBLY.vibrate)/(ASSEMBLY.align-ASSEMBLY.vibrate),amplitude=t<ASSEMBLY.vibrate?0:t<ASSEMBLY.align?9*S(v):9*(1-align),wave=Math.sin(v*Math.PI*8)*p.sign;
  return{x:p.parkX*(1-align)+amplitude*wave,y:p.parkY*(1-align)+amplitude*.15*Math.sin(v*Math.PI*6),angle:p.parkAngle*(1-align)+amplitude*.008*wave};
 }
 function renderAssembly(ctx,node,t,o){
  if(t<=.2)return B.render(ctx,node,t,o);
  if(t>=ASSEMBLY.complete){
   o.sportMotion.render(ctx,0,o);
   if(t<ASSEMBLY.finish){const u=(t-ASSEMBLY.complete)/(ASSEMBLY.finish-ASSEMBLY.complete),strength=Math.exp(-6*u);ctx.save();ctx.shadowColor=o.watch?'#bcffdc':'#6f88ff';ctx.shadowBlur=9*ctx.canvas.width/454*strength;ctx.globalAlpha=.5*strength;o.sportMotion.render(ctx,0,{...o,clear:false});ctx.restore();
    ctx.save();ctx.scale(ctx.canvas.width/454,ctx.canvas.width/454);ctx.strokeStyle=o.color||'#101e62';drawFixedRing(ctx,node,t,1-S(u));ctx.restore();}
   return;
  }
  begin(ctx,o);drawFixedRing(ctx,node,t);
  if(t>=ASSEMBLY.start)for(const p of assemblyLayout(node)){
   const pose=assemblyPose(p,t);if(!pose)continue;
   ctx.save();ctx.translate(p.cx+pose.x,p.cy+pose.y);ctx.rotate(pose.angle);ctx.translate(-p.cx,-p.cy);drawAssemblyPart(ctx,p);ctx.restore();
  }
  ctx.restore();
 }
 function phase(kind,t,node){if(t<.2)return '跳起下坠 · 双眼融合';if(kind==='assemble')return t<.412?'原始缓动绕圆 · 弧长可达整圆':t<.59?'圆环固定 · 屏外抛入歪斜部件':t<.84?'歪斜静置 · 0.50 s':t<1.09?'振动出现并逐渐剧烈 · 0.50 s':t<1.19?'快速归位 · 拼合初始帧':t<1.26?'拼合外发光 · 圆环原位淡出':'完整运动初始帧';if(kind==='paddle'){const depart=node?route(node).departTime:.42;return t<depart?'入轨至脱轨 · 连续快速运动':t<PADDLE.arrival?'保持速度直达运动轮廓':t<PADDLE.finish?'前端定位 · 线尾收束 · 初始帧原位显露':'完整初始帧 · 接续运动';}return t<.412?'完整绕圆一圈':t<.47?'底部线段融合为圆球':t<.64?'融球上跳 · 迅速铺满':t<.84?'全屏停留 · 0.40 s':t<1.02?'收缩回中心 · 显露运动':'运动初始帧';}
 function marks(kind,node){if(kind==='assemble')return [{t:0,name:'当前双眼'},{t:.2,name:'融合入轨'},{t:.412,name:'整圆固定 · 开始抛入'},{t:.59,name:'歪斜落定 · 静置0.5秒'},{t:.84,name:'开始振动'},{t:1.04,name:'振动逐渐剧烈'},{t:1.09,name:'0.5秒后开始归位'},{t:1.19,name:'拼合完成 · 外发光'},{t:1.26,name:'圆环原位淡出 · 开始运动'}];return kind==='paddle'?[{t:0,name:'当前双眼'},{t:.2,name:'融合入轨'},{t:node?route(node).departTime:.42,name:'快速脱轨'},{t:PADDLE.arrival,name:'前端到达 · 原位成形'},{t:.50,name:'线尾收束 · 身体生长'},{t:PADDLE.finish,name:'汇聚完成 · 完整初始帧'}]:[{t:0,name:'当前双眼'},{t:.2,name:'融合线段'},{t:.412,name:'绕圆完成'},{t:.55,name:'融球上跳'},{t:.64,name:'占满屏幕'},{t:.84,name:'停留0.4秒后收缩'},{t:1.02,name:'显露运动初始帧'}];}
 const RETURN={gather:.24,split:.28,eyes:.55,finish:.58};
 function smoothUnion(a,b,k){const h=clamp(.5+.5*(b-a)/k);return mix(b,a,h)-k*h*(1-h);}
 // Extract an isocontour from a smooth distance field, including the narrowing liquid neck.
 function liquidContour(ctx,field,bounds=[0,0,454,454]){
  const step=2,x0=Math.max(0,Math.floor(bounds[0]/step)*step),y0=Math.max(0,Math.floor(bounds[1]/step)*step),nx=Math.ceil((Math.min(454,bounds[2])-x0)/step),ny=Math.ceil((Math.min(454,bounds[3])-y0)/step),values=new Float32Array((nx+1)*(ny+1)),links=new Map(),vertices=new Map();
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)values[y*(nx+1)+x]=field(x0+x*step,y0+y*step);
  const cases={1:[[3,0]],2:[[0,1]],3:[[3,1]],4:[[1,2]],6:[[0,2]],7:[[3,2]],8:[[2,3]],9:[[0,2]],11:[[1,2]],12:[[1,3]],13:[[0,1]],14:[[3,0]]};
  function connect(a,b){if(!links.has(a))links.set(a,[]);if(!links.has(b))links.set(b,[]);links.get(a).push(b);links.get(b).push(a);}
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
   const i=y*(nx+1)+x,v=[values[i],values[i+1],values[i+nx+2],values[i+nx+1]],code=(v[0]<0?1:0)|(v[1]<0?2:0)|(v[2]<0?4:0)|(v[3]<0?8:0);if(code===0||code===15)continue;
   let pairs=cases[code];if(code===5)pairs=field(x0+(x+.5)*step,y0+(y+.5)*step)<0?[[0,1],[2,3]]:[[3,0],[1,2]];if(code===10)pairs=field(x0+(x+.5)*step,y0+(y+.5)*step)<0?[[3,0],[1,2]]:[[0,1],[2,3]];
   const edge=e=>{const key=e===0?'h'+x+':'+y:e===1?'v'+(x+1)+':'+y:e===2?'h'+x+':'+(y+1):'v'+x+':'+y;if(!vertices.has(key)){const ends=[[0,1],[1,2],[3,2],[0,3]][e],a=ends[0],b=ends[1],u=v[a]/(v[a]-v[b]),corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]];vertices.set(key,{x:x0+mix(corners[a][0],corners[b][0],u)*step,y:y0+mix(corners[a][1],corners[b][1],u)*step});}return key;};
   for(const [a,b] of pairs)connect(edge(a),edge(b));
  }
  const used=new Set();ctx.beginPath();for(const start of links.keys()){if(used.has(start))continue;let key=start,previous=null;const first=vertices.get(start);ctx.moveTo(first.x,first.y);for(let guard=0;guard<links.size;guard++){used.add(key);const next=links.get(key).find(k=>k!==previous);if(!next||next===start)break;const p=vertices.get(next);ctx.lineTo(p.x,p.y);previous=key;key=next;}ctx.closePath();}ctx.fill('evenodd');
 }
 function roundedDistance(x,y,shape){const dx=x-shape.x,dy=y-shape.y,rx=dx*shape.cos+dy*shape.sin,ry=-dx*shape.sin+dy*shape.cos,qx=Math.abs(rx)-shape.w/2+shape.r,qy=Math.abs(ry)-shape.h/2+shape.r;return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-shape.r;}
 function renderLiquidReturn(ctx,node,t,o){
  if(t<=0)return o.sportMotion.render(ctx,0,o);
  if(t>=RETURN.finish)return B.renderEyes(ctx,node.eyes,o);
  begin(ctx,o);const center={x:227,y:227},radius=46;
  if(t<RETURN.gather){
   const u=S(t/RETURN.gather),round=S((t-.025)/.105),parts=assemblyParts(node.sport||'tabletennis'),balls=[];
   for(const p of parts){const x=mix(p.cx,center.x,u),y=mix(p.cy,center.y,u);balls.push({x,y,r:mix(16,radius/Math.sqrt(parts.length),u)});
    if(round<1){ctx.save();ctx.globalAlpha=1-round;ctx.translate(x,y);ctx.scale(1-.72*u,1-.72*u);ctx.translate(-p.cx,-p.cy);drawAssemblyPart(ctx,p);ctx.restore();}
   }
   ctx.save();ctx.globalAlpha=round;const finish=S((u-.72)/.28);
   liquidContour(ctx,(x,y)=>{let d=1000;for(const b of balls)d=smoothUnion(d,Math.hypot(x-b.x,y-b.y)-b.r,24);return mix(d,Math.hypot(x-center.x,y-center.y)-radius,finish);},[Math.min(...balls.map(b=>b.x-b.r-40)),Math.min(...balls.map(b=>b.y-b.r-40)),Math.max(...balls.map(b=>b.x+b.r+40)),Math.max(...balls.map(b=>b.y+b.r+40))]);ctx.restore();
  }else if(t<RETURN.split){circle(ctx,center.x,center.y,radius);}
  else if(t<RETURN.eyes){
   const u=S((t-RETURN.split)/(RETURN.eyes-RETURN.split)),shapes=node.eyes.map(e=>{const angle=e.angle*u,w=mix(78,e.w,u),h=mix(78,e.h,u);return{x:mix(center.x,e.x,u),y:mix(center.y,e.y,u),w,h,r:mix(39,Math.min(e.w,e.h)*.48,u),cos:Math.cos(angle),sin:Math.sin(angle)};});
   liquidContour(ctx,(x,y)=>smoothUnion(roundedDistance(x,y,shapes[0]),roundedDistance(x,y,shapes[1]),28),[Math.min(...shapes.map(e=>e.x-e.w/2-28)),Math.min(...shapes.map(e=>e.y-e.h/2-28)),Math.max(...shapes.map(e=>e.x+e.w/2+28)),Math.max(...shapes.map(e=>e.y+e.h/2+28))]);
  }else{ctx.restore();return B.renderEyes(ctx,node.eyes,o);}
  ctx.restore();
 }
 function exitDuration(kind){return kind==='blob'?duration(kind):RETURN.finish;}
 function exitPhase(kind,t,node){if(kind==='blob')return '返回眼睛 · '+phase(kind,duration(kind)-t,node);return t<.24?'运动部件液化 · 向中心融合':t<.28?'融成一个圆':t<.55?'融球分裂 · 一个圆成为双眼':'双眼归位';}
 function exitMarks(kind,node){return kind!=='blob'?[{t:0,name:'完整运动初始帧'},{t:.12,name:'部件液化汇聚'},{t:.24,name:'合成一个圆'},{t:.38,name:'融球分裂'},{t:.55,name:'双眼归位'},{t:.58,name:'返回完成'}]:marks(kind,node).map(k=>({t:duration(kind)-k.t,name:k.name})).reverse();}
 root.SportsTransitions={duration,phase,marks,exitDuration,exitPhase,exitMarks,renderExit:(ctx,node,t,o)=>o.kind!=='blob'?renderLiquidReturn(ctx,node,t,o):root.SportsTransitions.render(ctx,node,duration(o.kind)-t,o),paddleState,assemblyParts,assemblyPose,render:(ctx,node,t,o)=>o.kind==='assemble'?renderAssembly(ctx,node,t,o):o.kind==='paddle'?renderPaddle(ctx,node,t,o):renderBlob(ctx,node,t,o),invalidate:node=>{cache.delete(node);layouts.delete(node);}};
})(globalThis);
