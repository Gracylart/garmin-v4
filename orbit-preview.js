'use strict';
(function () {
 const $=id=>document.getElementById(id);
 const canvas=$('watch'),ctx=canvas.getContext('2d'),clock=$('clock-time');
 const scrub=$('scrub'),readout=$('readout'),pause=$('pause');
 const debug=$('debug'),guides=$('guides'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const fields=['arc','turn','shrink','stagger','tempo','elastic'];
 let nodes=[],elapsed=0,raf=0,startedAt=null,baseElapsed=0;
 function config(){return Object.fromEntries(fields.map(key=>[key,Number($(key).value)/(key==='stagger'?1000:100)]));}
 function rebuild(){
  if(!/^\d{2}:\d{2}$/.test(clock.value))return false;
  const [h,m]=clock.value.split(':').map(Number);
  nodes=ClockTransition.forTime(h*60+m,config());
  $('route-note').textContent=(nodes[0].target.x<0?'时针 → 左眼，分针 → 右眼':'时针 → 右眼，分针 → 左眼')+
   (nodes[0].turnDuration<ClockTransition.travel?' · 原侧弯曲掉头 0.20 s':' · 就近落位');
  fields.forEach(key=>$(key+'-value').value=$(key).value+(key==='stagger'?' ms':'%'));
  return true;
 }
 function stop(){cancelAnimationFrame(raf);raf=0;startedAt=null;}
 function draw(){
  ctx.setTransform(canvas.width/390,0,0,canvas.height/390,0,0);
  ctx.fillStyle='#000';ctx.fillRect(0,0,390,390);
  ctx.save();ctx.beginPath();ctx.arc(195,195,195,0,Math.PI*2);ctx.clip();ctx.translate(195,195);
  if(guides.checked){
   ctx.lineWidth=.75;ctx.setLineDash([3,4]);
   nodes.forEach((node,i)=>{
    ctx.strokeStyle=i===0?'#875d53':'#456883';
    const x=node.pathX,y=node.pathY;
    ctx.beginPath();ctx.moveTo(x[0],y[0]);ctx.bezierCurveTo(x[1],y[1],x[2],y[2],x[3],y[3]);ctx.stroke();
   });
   ctx.setLineDash([]);
  }
  nodes.forEach((node,i)=>{
   const shape=ClockTransition.at(node,elapsed);
   ctx.save();ctx.translate(shape.x,shape.y);ctx.rotate(shape.angle);
   ctx.fillStyle=debug.checked?(i===0?'#ff8b77':'#78bfff'):'#e8f3ec';
   if(shape.bend!==0){
    // Round stroke and the flat capsule have identical outlines when bend reaches zero.
    const half=(shape.width-shape.height)/2,b=shape.bend;
    ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=shape.height;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-half,-b/2);
    ctx.bezierCurveTo(-half/3,5*b/6,half/3,5*b/6,half,-b/2);ctx.stroke();
   }else{
    ctx.beginPath();ctx.roundRect(-shape.width/2,-shape.height/2,shape.width,shape.height,shape.radius);ctx.fill();
   }
   ctx.restore();
  });
  ctx.restore();scrub.value=Math.round(elapsed*1000);readout.value=elapsed.toFixed(2)+' s';
  pause.textContent=raf?'暂停':elapsed>=1?'再看一次':'继续';
 }
 function frame(now){
  if(startedAt===null)startedAt=now;
  elapsed=Math.min(1,baseElapsed+(now-startedAt)/1000);
  raf=elapsed<1?requestAnimationFrame(frame):0;draw();
 }
 function start(replay){
  stop();if(replay||elapsed>=1)elapsed=0;
  baseElapsed=elapsed;raf=requestAnimationFrame(frame);draw();
 }
 function changeTime(){if(rebuild()){stop();elapsed=0;draw();if(!reduced.matches)start(true);}}
 clock.addEventListener('change',changeTime);
 document.querySelectorAll('[data-clock]').forEach(button=>button.addEventListener('click',()=>{clock.value=button.dataset.clock;changeTime();}));
 $('play').addEventListener('click',()=>start(true));
 pause.addEventListener('click',()=>{if(raf){stop();draw();}else start(false);});
 scrub.addEventListener('input',()=>{stop();elapsed=Number(scrub.value)/1000;draw();});
 [debug,guides].forEach(field=>field.addEventListener('change',draw));
 fields.forEach(key=>{
  $(key).addEventListener('input',()=>{stop();rebuild();if(elapsed>=ClockTransition.travel)elapsed=.36;draw();});
  $(key).addEventListener('change',()=>{if(!reduced.matches)start(true);});
 });
 $('reset').addEventListener('click',()=>{
  fields.forEach(key=>$(key).value=Math.round(ClockTransition.defaults[key]*(key==='stagger'?1000:100)));
  rebuild();if(!reduced.matches)start(true);else{stop();elapsed=.36;draw();}
 });
 const query=new URLSearchParams(location.search),queryClock=query.get('clock');
 if(queryClock&&/^([01]\d|2[0-3]):[0-5]\d$/.test(queryClock))clock.value=queryClock;
 rebuild();draw();
 const sample=query.get('t');
 if(sample!==null&&Number.isFinite(Number(sample))){elapsed=Math.max(0,Math.min(1,Number(sample)));draw();}
 else if(!reduced.matches)start(true);
 reduced.addEventListener('change',()=>{if(reduced.matches){stop();draw();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){stop();draw();}});
})();
