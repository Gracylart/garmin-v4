'use strict';
const $=id=>document.getElementById(id),face=new Emote.Face(),canvas=$('face'),ctx=canvas.getContext('2d');
const input={bpm:68,activity:0,night:0},reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,last=null,lastDraw=0,targetFps=60,windowStart=0,drawCount=0,lastSample=0;
let gesture=null,suppressClick=false,releaseAt=0,lastContact={x:0,y:0},rubHistory=[];
const costs=new Float64Array(120);let costIndex=0,costCount=0;
function selection(){document.querySelectorAll('[data-expression]').forEach(b=>b.setAttribute('aria-pressed',String(!face.auto&&b.dataset.expression===face.state)));$('auto').setAttribute('aria-pressed',String(face.auto));$('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'继续':'暂停';}
for(const [name,value] of Object.entries(Emote.states)){const b=document.createElement('button');b.dataset.expression=name;b.textContent=value.label;b.onclick=()=>{face.setState(name);selection();};$('expressions').append(b);}
document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{if(b.dataset.event==='tickle')face.tickleAt(.7,0);else face.trigger(b.dataset.event);if(paused)render();});
$('wake').onclick=()=>{releaseAt=0;gesture=null;face.raiseWrist();if(paused){paused=false;resetClock();selection();}};
$('touch').onclick=e=>{if(suppressClick&&e.detail!==0){suppressClick=false;return;}if(face.tickleActive){face.dodge(lastContact.x,lastContact.y);$('status').textContent='挠痒痒 · 躲开触碰';return;}const result=face.tap(performance.now());$('status').textContent=result==='rage'?'连续触碰 · 气鼓鼓！':'单次触碰 · '+Emote.states[result].label;if(paused){face.snap();render();}selection();};
function pointerLook(e){const r=$('touch').getBoundingClientRect(),x=(e.clientX-r.left)/r.width*2-1,y=(e.clientY-r.top)/r.height*2-1;lastContact={x,y};face.look(x,y);}
function trackTurn(g,axis,value){const dir='dir'+axis,ext='ext'+axis;if(g[dir]===0){if(Math.abs(value-g[ext])>=12){g[dir]=Math.sign(value-g[ext]);g[ext]=value;}}else if(g[dir]>0){if(value>g[ext])g[ext]=value;else if(g[ext]-value>=12){g[dir]=-1;g[ext]=value;g.reversals++;}}else if(value<g[ext])g[ext]=value;else if(value-g[ext]>=12){g[dir]=1;g[ext]=value;g.reversals++;}}
$('touch').onpointerdown=e=>{if(e.isPrimary===false)return;suppressClick=false;releaseAt=0;gesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,minX:e.clientX,maxX:e.clientX,minY:e.clientY,maxY:e.clientY,extX:e.clientX,extY:e.clientY,dirX:0,dirY:0,path:0,reversals:0,startTime:performance.now(),moved:false,large:false,tickled:false};$('touch').setPointerCapture?.(e.pointerId);pointerLook(e);};
$('touch').onpointermove=e=>{
 if(gesture&&e.pointerId===gesture.id){
  const g=gesture,stepX=e.clientX-g.lastX,stepY=e.clientY-g.lastY,step=Math.hypot(stepX,stepY);
  g.path+=step;trackTurn(g,'X',e.clientX);trackTurn(g,'Y',e.clientY);
  g.lastX=e.clientX;g.lastY=e.clientY;g.minX=Math.min(g.minX,e.clientX);g.maxX=Math.max(g.maxX,e.clientX);g.minY=Math.min(g.minY,e.clientY);g.maxY=Math.max(g.maxY,e.clientY);
  const distance=Math.hypot(e.clientX-g.startX,e.clientY-g.startY);if(distance>9)g.moved=true;
  pointerLook(e);
  if(!g.tickled&&!g.large&&g.path>120&&g.reversals>=2&&g.maxX-g.minX<100&&g.maxY-g.minY<100&&performance.now()-g.startTime<1800){g.tickled=true;if(!paused)face.tickleAt(lastContact.x,lastContact.y);$('status').textContent='小范围来回滑动 · 挠痒痒！';}
  if(g.tickled&&face.tickleActive)face.dodge(lastContact.x,lastContact.y);
  if(distance>95)g.large=true;
  if(g.large&&!g.tickled)$('status').textContent='大幅滑动 · 视线跟随';
 }else if(!gesture&&e.pointerType==='mouse')pointerLook(e);
};
$('touch').onpointerup=e=>{if(!gesture||e.pointerId!==gesture.id)return;const g=gesture,now=performance.now();if(g.moved&&!g.large&&!g.tickled&&g.path>18&&g.path<115){rubHistory=rubHistory.filter(r=>now-r.at<1600&&Math.hypot(r.x-lastContact.x,r.y-lastContact.y)<.55);rubHistory.push({at:now,x:lastContact.x,y:lastContact.y});if(rubHistory.length>=3){if(!paused)face.tickleAt(lastContact.x,lastContact.y);rubHistory=[];$('status').textContent='连续小范围滑动 · 挠痒痒！';}}else if(g.large)rubHistory=[];suppressClick=g.moved;releaseAt=g.moved?now+300:0;gesture=null;if(!releaseAt)face.look(0,0,false);};
$('touch').onpointercancel=()=>{gesture=null;face.look(0,0,false);};
$('touch').onpointerleave=()=>{if(!gesture&&!releaseAt)face.look(0,0,false);};
$('pause').onclick=()=>{paused=!paused;resetClock();selection();};
$('auto').onclick=()=>{face.auto=!face.auto;selection();};
function inputs(){for(const k of ['bpm','activity','night']){const v=k==='bpm'?input[k]:Math.round(input[k]*100);$(k).value=v;$(k+'Value').textContent=v+(k==='bpm'?' BPM':'%');}}
for(const k of ['bpm','activity','night'])$(k).oninput=()=>{input[k]=Number($(k).value)/(k==='bpm'?1:100);inputs();};
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{const night=b.dataset.scene==='night';Object.assign(input,{bpm:night?58:150,activity:night?0:1,night:night?1:0});face.auto=true;inputs();selection();});
function resetClock(){last=null;lastDraw=0;windowStart=0;drawCount=0;costCount=0;costIndex=0;}
$('fps').onchange=()=>{targetFps=Number($('fps').value);resetClock();};
$('size').onchange=()=>{canvas.width=canvas.height=Number($('size').value);face.draw(ctx,canvas.width);resetClock();};
reduced.onchange=e=>{if(e.matches){paused=true;resetClock();selection();}};
document.addEventListener('visibilitychange',()=>{resetClock();gesture=null;rubHistory=[];releaseAt=0;face.look(0,0,false);});
function render(){const start=performance.now();face.draw(ctx,canvas.width);costs[costIndex]=performance.now()-start;costIndex=(costIndex+1)%costs.length;costCount=Math.min(costCount+1,costs.length);drawCount++;}
function frame(now){
 requestAnimationFrame(frame);if(document.hidden){last=null;return;}
 if(releaseAt&&now>=releaseAt){face.look(0,0,false);releaseAt=0;}
 if(last===null){last=now;windowStart=now;lastDraw=now;render();}
 const dt=(now-last)/1000;last=now;
 if(!paused){face.update(dt,input);const next=Emote.frameDeadline(now,lastDraw,targetFps);if(next!==lastDraw){render();lastDraw=next;}}
 if(now-lastSample>500){
  $('status').textContent=paused?'已暂停 · 点击切换静态表情':gesture?.tickled?'小范围来回滑动 · 挠痒痒！':gesture?.large?'大幅滑动 · 视线跟随':face.event?({wake:face.wakeExplore?'抬腕 · 在随机方向附近观察':'抬腕 · 凝视随机方向',poke:'戳一下',tickle:'挠痒痒 · 躲开触碰',cheer:'达标庆祝 · 摇头晃脑',startle:'吓一跳',peekLeft:'向西张望',peekRight:'向东张望',peekUp:'向北张望',peekDown:'向南张望',peekNW:'向西北张望',peekNE:'向东北张望',peekSW:'向西南张望',peekSE:'向东南张望',rage:'气鼓鼓 · 瞪眼颤动'}[face.event])+' · 表演中':'点一下换表情 · 连点三下惹它生气；拖动可连续控制方向';
  selection();lastSample=now;
 }
 if(now-windowStart>=2000){
  const fps=drawCount*1000/(now-windowStart),sorted=Array.from(costs.slice(0,costCount)).sort((a,b)=>a-b),p95=sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]||0;
  $('metrics').textContent=paused?'已暂停 · 本机浏览器测量暂停':`本机浏览器 ${fps.toFixed(1)} FPS · 绘制 P95 ${p95.toFixed(2)} ms（不含屏幕合成）`;
  windowStart=now;drawCount=0;
 }
}
selection();inputs();if(!paused)face.raiseWrist();face.draw(ctx,canvas.width);requestAnimationFrame(frame);
