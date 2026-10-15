'use strict';
(async()=>{
 const $=id=>document.getElementById(id),bounce=SportsBounce,disciplines=SportsDisciplines;
 await SportsExact.load();
 let sport='tabletennis',motion=SportsExact.get(sport);
 let sportRequest=0;
 const sportName=id=>SportsExact.catalog[id]?.name||disciplines.names[id]||id;
 const reference=$('reference').getContext('2d'),watch=$('watch').getContext('2d');
 const keyframes={
  sequence:[{t:0,name:'常规双眼'},{t:.865,name:'跳起'},{t:.985,name:'下坠融合'},{t:1.105,name:'沿边绕圈'},{t:1.265,name:'球桌成形'},{t:1.62,name:'击球'},{t:2.0,name:'回位'}],
  enter:[{t:0,name:'当前双眼'},{t:.075,name:'跳起'},{t:.16,name:'下坠'},{t:.2,name:'融合线段'},{t:.306,name:'绕圈'},{t:.456,name:'落成球桌'},{t:.5,name:'人物就位'}],
  exit:[{t:0,name:'运动图形'},{t:.044,name:'收束'},{t:.194,name:'绕圈'},{t:.3,name:'落底'},{t:.34,name:'分开'},{t:.425,name:'弹起'},{t:.5,name:'回到眼睛'}],
  study:[{t:0,name:'预备'},{t:.2,name:'蓄力'},{t:.3,name:'挥拍'},{t:.333,name:'击球'},{t:.4,name:'随挥'},{t:.57,name:'回弹'},{t:.7,name:'回位'}]
 };
 let mode='sequence',t=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,last=0,raf,node,lastPresented=-1;
 let lengthKeys=bounce.defaultLengthKeys.map((k,i)=>({...k,id:i})),nextKeyId=lengthKeys.length;
 const ringMax=2*Math.PI*bounce.R;
 const speedChoices=['.1','.25','.5','.75','1','1.5','2'];
 try{const saved=JSON.parse(localStorage.getItem('emote-bounce-edit-v1')||'null');if(saved){
  if(['blob','paddle','assemble'].includes(saved.transitionKind))$('transition-kind').value=saved.transitionKind;
  if(speedChoices.includes(saved.speed))$('speed').value=saved.speed;
  if(['original','2','3','5'].includes(saved.motionDuration))$('motion-duration').value=saved.motionDuration;
  if(SportsExact.catalog[saved.sport]){sport=saved.sport;motion=SportsExact.get(sport);}
  const keys=saved.lengthKeys;
  if(Array.isArray(keys)&&keys.length>=2&&keys.length<=24&&keys.every((k,i)=>Number.isFinite(k.t)&&Number.isFinite(k.length)&&k.length>=24&&k.length<=ringMax&&(!i||k.t>keys[i-1].t))&&keys[0].t===.2&&keys[0].length===96&&keys.at(-1).t===.5&&keys.at(-1).length===324.22){lengthKeys=keys.map((k,i)=>({...k,id:i}));nextKeyId=keys.length;}
 }}catch{}
 try{await SportsExact.ensure(sport);}catch{sport='tabletennis';motion=SportsExact.get(sport);}
 $('assembly-line-length').value=bounce.lengthAt(.412,lengthKeys).toFixed(2);
 function saveEdits(){try{localStorage.setItem('emote-bounce-edit-v1',JSON.stringify({sport,assemblyRingLength:Number($('assembly-line-length').value),transitionKind:$('transition-kind').value,motionDuration:$('motion-duration').value,speed:$('speed').value,lengthKeys:lengthKeys.map(({t,length})=>({t,length}))}));}catch{}}
 function sourceTime(){return Number($('source-phase').value);}
 function rebuildNode(){if(node)SportsTransitions.invalidate(node);node=bounce.create(bounce.capture($('source').value,sourceTime()+.8),{lengthKeys});node.sport=sport;node.assemblyLineLength=Number($('assembly-line-length').value)||454;}
 // Timeline retains the original 0.5× transition cadence; speed applies only to sports.
 function initialHold(){return transitionKind()==='assemble'?.2:.1;}
 function actionDuration(){const frames=$('motion-duration').value==='original'?SportsExact.actionFrameDuration(sport):Math.max(.01,Number($('motion-duration').value)-initialHold()*2);return initialHold()+frames*.5/Number($('speed').value);}
 function transitionKind(){return $('transition-kind').value;}
 function transitionDuration(){return SportsTransitions.duration(transitionKind());}
 function exitDuration(){return SportsTransitions.exitDuration(transitionKind());}
 function timing(){const motionStart=.8+transitionDuration(),motionEnd=motionStart+actionDuration(),readyEnd=motionEnd+.35,exitEnd=readyEnd+exitDuration();return {motionStart,motionEnd,readyEnd,exitEnd,total:exitEnd+.45};}
 function duration(){return mode==='study'?actionDuration():mode==='sequence'?timing().total:mode==='exit'?exitDuration():transitionDuration();}
 function renderScene(ctx,time,options={}){
  options={color:'#101e62',...options,kind:transitionKind(),sportMotion:motion,motionDuration:actionDuration(),initialHold:initialHold()};const times=timing();
  if(mode==='study')return motion.renderPlayback(ctx,time,options);
  if(mode==='enter')return SportsTransitions.render(ctx,node,time,options);
  if(mode==='exit')return SportsTransitions.renderExit(ctx,node,time,options);
  if(time<.8)return bounce.renderEyes(ctx,bounce.eyesAt($('source').value,time+sourceTime()),options);
  if(time<times.motionStart)return SportsTransitions.render(ctx,node,time-.8,options);
  if(time<times.motionEnd)return motion.renderPlayback(ctx,time-times.motionStart,options);
  if(time<times.readyEnd)return motion.render(ctx,1.4,options);
  if(time<times.exitEnd)return SportsTransitions.renderExit(ctx,node,time-times.readyEnd,options);
  return bounce.renderEyes(ctx,node.eyes,options);
 }
 function sceneName(){return {tabletennis:'球桌',running:'跑道',swimming:'水面',cycling:'地面'}[sport]||sportName(sport)+'轮廓';}
 function phase(){
  if(mode==='study')return motion.phasePlayback(t,actionDuration(),initialHold());
  if(mode==='enter')return SportsTransitions.phase(transitionKind(),t,node);
  if(mode==='exit')return SportsTransitions.exitPhase(transitionKind(),t,node);
  const times=timing();return t<.8?'常规双眼 · 当前动作':t<times.motionStart?SportsTransitions.phase(transitionKind(),t-.8,node):t<times.motionEnd?motion.phasePlayback(t-times.motionStart,actionDuration(),initialHold()):t<times.readyEnd?'完整动作结束 · 静态停留':t<times.exitEnd?SportsTransitions.exitPhase(transitionKind(),t-times.readyEnd,node):'常规双眼';
 }
 function render(){
  const options={trails:$('trails').checked,guides:$('guides').checked};
  renderScene(reference,t,options);renderScene(watch,t,{...options,watch:true,color:'#e8f3ec'});
  const speed=Number($('speed').value);
  $('time').value=t.toFixed(2)+' / '+duration().toFixed(2)+' s';$('scrub').value=t;if(document.activeElement!==$('seek-time'))$('seek-time').value=t.toFixed(2);$('phase').textContent=phase();
  $('duration-summary').textContent='转场 '+(transitionDuration()*2).toFixed(2)+' s · 初帧静置 '+(initialHold()*2).toFixed(2)+' s · 运动 '+(actionDuration()*2).toFixed(2)+' s · 运动 '+speed+'× · '+($('preview-fps').value==='0'?'屏幕刷新率':$('preview-fps').value+' fps 预览');
  document.querySelectorAll('.pose').forEach((b,i)=>b.classList.toggle('active',Math.abs(t-keyframes[mode][i].t)<(mode==='enter'||mode==='exit'?.024:.1)));
 }
 function updateSportUI(){
  $('sport-select').value=sport;
  document.querySelectorAll('[data-sport]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sport===sport)));
  $('reference').setAttribute('aria-label',sportName(sport)+'运动动画，白底蓝色图形');
  $('assembly-controls').hidden=transitionKind()!=='assemble';
  $('scene-note').textContent=transitionKind()==='assemble'?'固定圆环 · 歪斜抛入 · 静置0.5秒 · 振动0.5秒再归位':transitionKind()==='paddle'?(sport==='tabletennis'?'连续脱轨汇拍 · 桌面滑入 · 身体原位生长':'连续脱轨 · 对接原始轮廓 · 初始帧原位显露'):'绕圆一圈 · 融球铺屏停留 0.4 秒 · 中心收缩';$('trails').closest('label').hidden=true;saveEdits();
 }
 async function setSport(id){
  if(!SportsExact.catalog[id])return false;
  const request=++sportRequest;
  // Keep the current sport and timeline intact until the requested source is ready.
  $('sport-select').value=sport;$('sport-select').setAttribute('aria-busy','true');
  $('sport-load-state').textContent='正在读取'+sportName(id)+'完整动作…';
  try{
   await SportsExact.ensure(id);if(request!==sportRequest)return false;
   sport=id;motion=SportsExact.get(id);updateSportUI();setMode(mode);
   $('sport-load-state').textContent=sportName(id)+' · '+SportsExact.database[id].frames.length+' 张源帧 · 共 '+Object.keys(SportsExact.catalog).length+' 项运动';
   return true;
  }catch(error){
   if(request!==sportRequest)return false;
   $('sport-select').value=sport;$('sport-load-state').textContent=error.message+'，当前运动保持播放。';return false;
  }finally{if(request===sportRequest)$('sport-select').setAttribute('aria-busy','false');}
 }
 function refreshKeyframes(){
  const d=actionDuration(),times=timing();
  keyframes.study=Array.from({length:7},(_,i)=>{const at=d*i/6;return {t:at,name:'源帧 '+SportsExact.playbackIndex(sport,at,d,initialHold())};});
  keyframes.enter=SportsTransitions.marks(transitionKind(),node);
  keyframes.exit=SportsTransitions.exitMarks(transitionKind(),node);
  keyframes.sequence=[{t:0,name:'常规双眼'},...keyframes.enter.slice(1).map(k=>({t:.8+k.t,name:k.name})),{t:times.motionStart+d*.4,name:'完整运动播放'},{t:times.motionEnd,name:'同姿态结束'},...keyframes.exit.slice(1).map(k=>({t:times.readyEnd+k.t,name:k.name}))];
 }
 function buildSports(){
  const summaries={running:'摆臂 · 腾空 · 换腿',swimming:'入水 · 划水 · 回臂',cycling:'交替踩踏 · 车轮滚动',tabletennis:'蓄力 · 击球 · 随挥'};
  for(const id of ['running','swimming','cycling','tabletennis']){const b=document.createElement('button');b.className='sport-choice';b.dataset.sport=id;b.setAttribute('aria-label','选择'+sportName(id));b.setAttribute('aria-pressed',String(id===sport));const c=document.createElement('canvas');c.width=c.height=160;SportsExact.get(id).render(c.getContext('2d'),id==='tabletennis'?1.4:1.84,{watch:true,color:'#e8f3ec'});const s=document.createElement('span');s.textContent=sportName(id);const small=document.createElement('small');small.textContent='原片轮廓 · 逐帧重建';s.append(small);b.append(c,s);b.onclick=()=>setSport(id);$('sports').append(b);}
 }
 function buildSportSelect(){
  $('sport-select').replaceChildren();
  for(const [category,label] of [['common','常用运动 · 15 项'],['extended','拓展运动 · 5 项']]){
   const group=document.createElement('optgroup');group.label=label;
   for(const item of Object.values(SportsExact.catalog).filter(item=>item.category===category)){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;group.append(option);}
   if(group.children.length)$('sport-select').append(group);
  }
  $('sport-select').value=sport;$('sport-select').onchange=()=>setSport($('sport-select').value);
 }
 function playLabel(){$('play').textContent=playing?'Ⅱ 暂停':'▶ 播放';$('play').setAttribute('aria-label',playing?'暂停':'播放');}
 function seek(value){t=Math.max(0,Math.min(duration(),value));playing=false;playLabel();render();}
 function animate(now){
  const dt=last?Math.min(.08,(now-last)/1000):0;last=now;
  if(playing&&!document.hidden){
   t+=dt*.5;
   if(t>=duration()){if($('loop').checked&&mode!=='enter'&&mode!=='exit'){t%=duration();if(transitionKind()==='assemble'){SportsTransitions.invalidate(node);buildFilmstrip();}}else{t=duration();playing=false;playLabel();}}
   const fps=Number($('preview-fps').value),slot=fps?Math.floor(now*fps/1000):now;
   if(slot!==lastPresented){lastPresented=slot;render();}
  }
  raf=requestAnimationFrame(animate);
 }
 function buildFilmstrip(){
  $('poses').replaceChildren();
  for(const k of keyframes[mode]){const b=document.createElement('button');b.className='pose';b.setAttribute('aria-label',k.name+'，'+k.t+'秒');const canvas=document.createElement('canvas');canvas.width=canvas.height=240;renderScene(canvas.getContext('2d'),k.t,{background:'#fafbf7'});const caption=document.createElement('div');caption.className='pose-caption';const name=document.createElement('span');name.textContent=k.name;const time=document.createElement('em');time.textContent=k.t.toFixed(2)+' s';caption.append(name,time);b.append(canvas,caption);b.onclick=()=>seek(k.t);$('poses').append(b);}
 }
 function updateLengths(){$('assembly-line-length').value=bounce.lengthAt(.412,lengthKeys).toFixed(2);SportsTransitions.invalidate(node);node.lengthKeys=lengthKeys.map(k=>({...k}));saveEdits();buildFilmstrip();render();}
 function jumpToLengthKey(key){if(mode==='study')setMode('enter');seek(mode==='sequence'?.8+key.t:mode==='exit'?exitDuration()-key.t:key.t);}
 function buildLengthEditor(){
  const target=$('length-keys');target.replaceChildren();
  lengthKeys.forEach((key,index)=>{
   const locked=index===0||index===lengthKeys.length-1,row=document.createElement('div');row.className='length-key';
   const time=document.createElement('input');time.type='number';time.step='.001';time.min=index?lengthKeys[index-1].t+.001:.2;time.max=index<lengthKeys.length-1?lengthKeys[index+1].t-.001:.5;time.value=key.t;time.disabled=locked;time.setAttribute('aria-label','关键帧 '+(index+1)+' 时间');
   time.onchange=()=>{const value=Number(time.value);if(Number.isFinite(value)&&time.value!==''){key.t=Math.max(Number(time.min),Math.min(Number(time.max),value));updateLengths();}buildLengthEditor();};
   time.oninput=()=>{const value=Number(time.value);if(time.value!==''&&Number.isFinite(value)&&value>=Number(time.min)&&value<=Number(time.max)){key.t=value;updateLengths();}};
   const group=document.createElement('div');group.className='key-length';
   const value=document.createElement('input');value.type='number';value.min=24;value.max=ringMax;value.step='any';value.value=key.length;value.disabled=locked;value.setAttribute('aria-label','关键帧 '+(index+1)+' 长度');
   const slider=document.createElement('input');slider.type='range';slider.min=24;slider.max=ringMax;slider.step='.01';slider.value=key.length;slider.disabled=locked;slider.setAttribute('aria-label','关键帧 '+(index+1)+' 长度滑块');
   function changeLength(input){if(input.value==='')return;const v=Number(input.value);if(!Number.isFinite(v))return;key.length=Math.max(24,Math.min(ringMax,v));value.value=key.length;slider.value=key.length;updateLengths();}
   value.oninput=()=>changeLength(value);slider.oninput=()=>changeLength(slider);group.append(value,slider);
   const buttons=document.createElement('div');buttons.className='key-buttons';const jump=document.createElement('button');jump.textContent='定位';jump.setAttribute('aria-label','定位关键帧 '+(index+1));jump.onclick=()=>jumpToLengthKey(key);buttons.append(jump);
   if(!locked){const remove=document.createElement('button');remove.textContent='删除';remove.setAttribute('aria-label','删除关键帧 '+(index+1));remove.onclick=()=>{lengthKeys=lengthKeys.filter(k=>k.id!==key.id);updateLengths();buildLengthEditor();};buttons.append(remove);}else{const fixed=document.createElement('span');fixed.textContent='固定';fixed.style.cssText='font-size:9px;color:#a0a899';buttons.append(fixed);}
   row.append(time,group,buttons);target.append(row);
  });
 }
 $('add-length-key').onclick=()=>{
  if(lengthKeys.length>=24){$('key-notice').textContent='最多 24 个关键帧。';return;}
  let a=lengthKeys[0],b=lengthKeys[1];for(let i=1;i<lengthKeys.length-1;i++)if(lengthKeys[i+1].t-lengthKeys[i].t>b.t-a.t){a=lengthKeys[i];b=lengthKeys[i+1];}
  const time=Math.round((a.t+b.t)*500)/1000;if(time<=a.t||time>=b.t)return;
  lengthKeys.push({t:time,length:Math.round(bounce.lengthAt(time,lengthKeys)),id:nextKeyId++});lengthKeys.sort((a,b)=>a.t-b.t);updateLengths();buildLengthEditor();$('key-notice').textContent='已添加 '+time.toFixed(3)+' s 关键帧。';
 };
 $('reset-length-keys').onclick=()=>{lengthKeys=bounce.defaultLengthKeys.map((k,i)=>({...k,id:i}));nextKeyId=lengthKeys.length;updateLengths();buildLengthEditor();$('key-notice').textContent='已恢复默认长度关键帧。';};
 function setRingLength(value){const length=Math.max(24,Math.min(ringMax,value));let key=lengthKeys.find(k=>Math.abs(k.t-.412)<.000001);if(key)key.length=length;else{lengthKeys.push({id:nextKeyId++,t:.412,length});lengthKeys.sort((a,b)=>a.t-b.t);}updateLengths();buildLengthEditor();}
 $('assembly-line-length').onchange=()=>{const value=Number($('assembly-line-length').value);if(Number.isFinite(value))setRingLength(value);};
 $('assembly-fit').onclick=()=>{setRingLength(ringMax);if(mode==='study'||mode==='exit')setMode('enter');seek(mode==='sequence'?1.212:.412);};
 $('transition-kind').onchange=()=>{updateSportUI();setMode(mode);};
 $('speed').onchange=()=>{saveEdits();setMode(mode);};
 $('preview-fps').onchange=()=>{lastPresented=-1;render();};
 $('motion-duration').onchange=()=>{saveEdits();setMode(mode);};
 function setMode(next){rebuildNode();refreshKeyframes();mode=next;t=0;last=0;playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;$('scrub').max=duration();$('seek-time').max=duration();$('loop').checked=mode==='sequence'||mode==='study';$('loop').disabled=mode==='enter'||mode==='exit';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));$('ruler').replaceChildren();for(let i=0;i<=5;i++){const s=document.createElement('span');s.textContent=(duration()*i/5).toFixed(mode==='enter'||mode==='exit'?1:2)+' s';$('ruler').append(s);}buildFilmstrip();playLabel();render();}
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
 $('play').onclick=()=>{if(t>=duration())t=0;playing=!playing;last=0;playLabel();render();};
 $('replay').onclick=()=>{if(transitionKind()==='assemble'){SportsTransitions.invalidate(node);buildFilmstrip();}t=0;last=0;playing=true;playLabel();render();};
 $('seek-time').oninput=()=>{if($('seek-time').value!=='')seek(Number($('seek-time').value));};
 $('scrub').oninput=()=>seek(Number($('scrub').value));
 for(const id of ['guides','trails'])$(id).onchange=render;
 function downloadFrame(isWatch){const c=document.createElement('canvas');c.width=c.height=isWatch?454:908;renderScene(c.getContext('2d'),t,{watch:isWatch,color:isWatch?'#e8f3ec':'#101e62',trails:$('trails').checked});if(isWatch){const ctx=c.getContext('2d');ctx.globalCompositeOperation='destination-in';ctx.beginPath();ctx.arc(227,227,227,0,Math.PI*2);ctx.fill();}c.toBlob(blob=>{const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=`emote-${sport}-${mode}-${isWatch?'454':'908'}-${t.toFixed(2)}s.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});}
 $('export-reference').onclick=()=>downloadFrame(false);$('export-watch').onclick=()=>downloadFrame(true);
 $('source').onchange=()=>setMode(mode);$('source-phase').oninput=()=>setMode(mode);
 document.addEventListener('visibilitychange',()=>{last=0;});
 window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
 buildSports();buildSportSelect();if(!await setSport(sport))await setSport('tabletennis');buildLengthEditor();raf=requestAnimationFrame(animate);
})();
