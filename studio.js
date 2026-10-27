'use strict';
(() => {
 const $=id=>document.getElementById(id), engine=globalThis.EmotePreview, sports=globalThis.SportIcons;
 const face=$('face'), context=face.getContext('2d'), shell=document.querySelector('.shell');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const names={calm:['平静','Calm','Calme'],curious:['好奇','Curious','Curieux'],joy:['高兴','Happy','Heureux'],surprised:['惊讶','Surprised','Surpris'],skeptical:['怀疑','Skeptical','Sceptique'],sleepy:['困倦','Sleepy','Somnolent'],excited:['兴奋','Excited','Excité'],bored:['无聊','Bored','Ennuyé'],resigned:['无奈','Resigned','Résigné'],proud:['得意','Proud','Fier'],fear:['害怕','Afraid','Effrayé'],playful:['调皮','Playful','Espiègle'],rage:['生气','Angry','Fâché'],cheer:['达标庆祝','Celebrate','Célébrer'],spin:['球面转圈','Orbit','Rotation'],tickle:['挠痒痒','Tickle','Chatouilles'],clock:['指针睁眼','Clock → eyes','Horloge → yeux']};
 const copy={shape:['眼形','Eye shapes','Formes des yeux'],expression:['运动项目 · 18','Sports · 18','Sports · 18'],color:['颜色','Color','Couleur'],animation:['动画','Animations','Animations'],png:['导出 PNG','Export PNG','Exporter PNG'],hint:['点击换表情 · 连点三次生气 · 横跨拖动转圈','Tap for expressions · Triple-tap to annoy · Swipe across to orbit','Touchez pour changer · Triple toucher pour fâcher · Glissez pour tourner'],time:['指针起始时间','Starting time','Heure de départ'],simulation:['浏览器预览；震动与传感器事件为模拟，不代表真机性能。','Browser preview. Haptics and sensor events are simulated; performance is not a device benchmark.','Aperçu navigateur. Vibrations et capteurs simulés ; performances distinctes de la montre.'],sequence:['随机播放','Shuffle playback','Lecture aléatoire'],single:['单个动画','Single animation','Animation seule'],exportSequence:['导出序列 JSON','Export sequence JSON','Exporter JSON'],scrubHint:['拖动时间轴检查每一刻','Scrub to inspect each moment','Parcourez chaque instant'],zoom:['缩放','Zoom','Zoom'],loop:['循环','Loop','Boucle'],resolution:['VENU 4 · 45 mm · 454 × 454','VENU 4 · 45 mm · 454 × 454','VENU 4 · 45 mm · 454 × 454']};
 copy.sportSpeed=['运动速度','Motion speed','Vitesse'];copy.sportFps=['帧率','Frame rate','Images/s'];
 const shapes=[...engine.moods.map(m=>m.id),'cheer','rage','spin','tickle','clock'];
 const animations=['clock','spin','cheer','rage','tickle','calm','curious','joy','surprised','skeptical','sleepy','excited','proud','playful',...sports.ids];
 const palette=['#e8f3ec','#ffffff','#dedee3','#bfc2ca','#979da9','#737b8b','#8ed7c8','#a7c5ff','#c4a7ef','#f1bcce','#efcd95','#d6e8ac'];
 const durations={clock:1,spin:1.12,cheer:2.2,rage:1.5,tickle:2};
 const lang=0;
 let color=palette[0],selected='calm',page='appearance',playing=!reduced.matches,loop=true,time=0,last=0,clipIndex=-1,clockNodes=[],sequence=[];
 function randomIds(previous){const ids=[...animations];for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}if(ids[0]===previous)[ids[0],ids[1]]=[ids[1],ids[0]];return ids;}
 const thumbs=new Map();let sportRequest=0,sportSpeed=1,lastSportSlot=-1,loadingSport=null,failedSport=null;
 const clipDuration=id=>sports.ids.includes(id)?sports.duration(id,sportSpeed):(durations[id]||2);
 function label(id){return (names[id]||sports.labels[id]||[id,id,id])[lang];}
 function text(key){return copy[key][lang];}
 function save(){try{localStorage.setItem('emote-studio-v1',JSON.stringify({color,selected,time:$('studio-time').value}));}catch{}}
 try{const saved=JSON.parse(localStorage.getItem('emote-studio-v1')||'null');if(saved){if(palette.includes(saved.color))color=saved.color;const restored={run:'running',cycle:'cycling',swim:'swimming'}[saved.selected]||saved.selected;if(names[restored]||sports.ids.includes(restored))selected=restored;if(saved.category==='sport'&&sports.ids.includes(saved.selectedSport))selected=saved.selectedSport;if(/^([01]\d|2[0-3]):[0-5]\d$/.test(saved.time))$('studio-time').value=saved.time;}}catch{}
 engine.reset();
 function resetAction(id){if(sports.ids.includes(id))return;engine.reset();if(id!=='clock')engine.trigger(id);}
 function advanceTo(id,t){if(sports.ids.includes(id))return;resetAction(id);for(let n=0;n<t;n+=1/60)engine.tick(Math.min(1/60,t-n));}
 function drawClock(t){
  context.fillStyle='#000';context.fillRect(0,0,454,454);context.save();context.translate(227,227);context.scale(454/390,454/390);context.fillStyle='#e8f3ec';
  for(const node of clockNodes){const s=ClockTransition.at(node,t);context.save();context.translate(s.x,s.y);context.rotate(s.angle);context.beginPath();if(s.bend){const half=(s.width-s.height)/2;context.strokeStyle='#e8f3ec';context.lineWidth=s.height;context.lineCap='round';context.moveTo(-half,-s.bend/2);context.bezierCurveTo(-half/3,5*s.bend/6,half/3,5*s.bend/6,half,-s.bend/2);context.stroke();}else{context.roundRect(-s.width/2,-s.height/2,s.width,s.height,s.radius);context.fill();}context.restore();}context.restore();
 }
 // Recolor only illuminated pixels: the black circular watch remains black.
 function tint(){if(color===palette[0])return;context.save();context.globalCompositeOperation='multiply';context.fillStyle=color;context.fillRect(0,0,454,454);context.restore();}
 function clockSetup(){const [h,m]=$('studio-time').value.split(':').map(Number);clockNodes=ClockTransition.forTime(h*60+m);}
 function thumbnail(id){
  if(sports.ids.includes(id)){const c=document.createElement('canvas');c.width=c.height=84;sports.draw(c.getContext('2d'),id,84,color);return c;}
  if(!thumbs.has(id)){advanceTo(id,id==='rage'?.65:.85);if(id==='clock')drawClock(.3);const c=document.createElement('canvas');c.width=c.height=84;c.getContext('2d').drawImage(face,0,0,84,84);thumbs.set(id,c);}
  const c=document.createElement('canvas');c.width=c.height=84;c.getContext('2d').drawImage(thumbs.get(id),0,0);return c;
 }
 function tiles(container,ids){const target=$(container);target.replaceChildren();for(const id of ids){const b=document.createElement('button');b.className='tile';b.dataset.action=id;b.setAttribute('aria-pressed',String(selected===id));b.append(thumbnail(id));const s=document.createElement('span');s.textContent=label(id);b.append(s);b.onclick=()=>choose(id);target.append(b);}}
 async function choose(id){
  const request=++sportRequest,isSport=sports.ids.includes(id),eyes=isSport?engine.captureEyes():null;
  loadingSport=isSport&&!sports.loaded(id)?id:null;failedSport=null;
  selected=id;time=0;clipIndex=-1;lastSportSlot=-1;playing=true;
  $('notice').textContent=loadingSport?[`正在载入${label(id)}…`,`Loading ${label(id)}…`,`Chargement : ${label(id)}…`][lang]:'';
  if(page==='animation'){$('sequence').value='single';buildSequence([id]);}else resetAction(id);
  updateSelection();renderCurrent();updateTransport();save();
  if(!isSport)return;
  try{
   await sports.ensure(id);
   if(request!==sportRequest)return;
   sports.start(id,eyes);loadingSport=null;$('notice').textContent='';
   // Loaded source data refines the duration; retain the user's pause state.
   if(page==='animation'&&$('sequence').value==='single'){const resume=playing;buildSequence([id]);playing=resume;}
   updateSelection();renderCurrent();updateTransport();
  }catch{
   if(request!==sportRequest)return;
   loadingSport=null;failedSport=id;playing=false;
   $('notice').textContent=['运动素材暂时未能载入，点击图标可重试。','Unable to load this sport. Select the icon to retry.','Chargement impossible. Sélectionnez l’icône pour réessayer.'][lang];
   updateSelection();renderCurrent();updateTransport();
  }
 }
 // Random playback loads source frames as each sport becomes active.
 async function prepareSequenceSport(id){
  const request=++sportRequest,eyes=engine.captureEyes();loadingSport=id;failedSport=null;
  $('notice').textContent=`正在载入${label(id)}…`;updateSelection();
  try{await sports.ensure(id);if(request!==sportRequest||page!=='animation'||sequence[locate(time).index]?.id!==id)return;
   sports.start(id,eyes);loadingSport=null;$('notice').textContent='';
   const position=locate(time),ids=sequence.map(clip=>clip.id),at=ids.slice(0,position.index).reduce((sum,key)=>sum+clipDuration(key),0)+position.local;
   buildSequence(ids,at);updateSelection();updateTransport();
  }catch{if(request!==sportRequest)return;loadingSport=null;failedSport=id;playing=false;$('notice').textContent='运动素材暂时未能载入，点击播放可重试。';updateSelection();updateTransport();}
 }
 function updateSelection(){document.querySelectorAll('.tile').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.action===selected));b.setAttribute('aria-busy',String(b.dataset.action===loadingSport));});}
 function colors(){const target=$('colors');target.replaceChildren();palette.forEach(value=>{const b=document.createElement('button');b.className='swatch';b.setAttribute('aria-label',`${text('color')} ${value}`);b.title=value;b.setAttribute('aria-pressed',String(color===value));const chip=document.createElement('span');chip.style.cssText=`width:40px;height:40px;border-radius:50%;background:${value};border:1px solid #22253012`;b.append(chip);b.onclick=()=>{color=value;colors();tiles('expressions',sports.ids);renderCurrent();save();};target.append(b);});}
 function total(){return sequence.reduce((n,c)=>n+c.duration,0);}
 function buildSequence(ids,position=0){sequence=ids.map(id=>({id,duration:clipDuration(id)}));time=0;clipIndex=-1;const target=$('clips');target.replaceChildren();let offset=0;for(const clip of sequence){const b=document.createElement('button'),at=offset;b.style.flex=String(clip.duration);b.append(thumbnail(clip.id));const s=document.createElement('span');s.textContent=label(clip.id);b.append(s);b.title=label(clip.id)+' · '+clip.duration+' s';b.onclick=()=>seek(at);target.append(b);offset+=clip.duration;}$('scrub').max=total();$('total').textContent=total().toFixed(2)+' s';$('ruler').replaceChildren();for(let i=0;i<=8;i++){const s=document.createElement('span');s.textContent=(total()*i/8).toFixed(1);$('ruler').append(s);}seek(position,false);}
 function locate(t){let offset=0;for(let i=0;i<sequence.length;i++){if(t<offset+sequence[i].duration||i===sequence.length-1)return {index:i,local:t-offset};offset+=sequence[i].duration;}return {index:0,local:0};}
 function seek(t,pause=true){time=Math.max(0,Math.min(total(),t));if(pause)playing=false;const p=locate(time);clipIndex=p.index;advanceTo(sequence[p.index].id,p.local);renderCurrent();updateTransport();}
 function renderCurrent(){const id=page==='animation'?sequence[locate(time).index]?.id:selected;if(page==='animation'&&$('sequence').value==='random'&&sports.ids.includes(id)&&!sports.loaded(id)&&loadingSport!==id&&failedSport!==id)prepareSequenceSport(id);if(sports.ids.includes(id))sports.render(context,id,page==='animation'?locate(time).local:time,{color,speed:sportSpeed});else{if(id==='clock')drawClock(page==='animation'?locate(time).local:Math.min(time,1));else engine.draw();tint();}face.style.pointerEvents=page==='animation'||sports.ids.includes(id)?'none':'';face.tabIndex=sports.ids.includes(id)?-1:0;face.setAttribute('aria-label',sports.ids.includes(id)?`${text('expression')} · ${label(id)}`:text('hint'));
  if(sports.ids.includes(id)){const local=page==='animation'?locate(time).local:time,info=sports.info(id,local,sportSpeed);const phase={enter:['线条脱轨','Line departure','Départ du trait'],hold:['初帧停留','Initial pose','Pose initiale'],motion:['完整运动','Full motion','Mouvement complet'],ready:['动作完成','Motion complete','Mouvement terminé'],return:['融球返回','Merge to eyes','Retour aux yeux'],eyes:['双眼归位','Eyes restored','Retour des yeux']}[info.phase];$('sport-phase').textContent=failedSport===id?['载入失败 · 点击图标重试','Load failed · Select icon to retry','Échec · Sélectionnez l’icône'][lang]:loadingSport===id?['正在载入运动…','Loading sport…','Chargement du sport…'][lang]:phase[lang]+(info.phase==='motion'?` · ${info.frameIndex+1}/${info.frameCount}`:'');document.querySelector('.hint').textContent=['线条脱轨进入运动 · 完整动作后融球返回双眼','Line departure into sport · Merge back to eyes after the complete motion','Départ du trait · Retour aux yeux après le mouvement complet'][lang];}else document.querySelector('.hint').textContent=text('hint');$('scrub').value=time;$('elapsed').textContent=time.toFixed(2)+' s';$('playhead').style.left=(total()?time/total()*100:0)+'%';Array.from($('clips').children).forEach((b,i)=>b.classList.toggle('active',i===clipIndex));}
 function updateTransport(){$('sport-transport').hidden=page!=='appearance'||!sports.ids.includes(selected);$('sport-play').textContent=playing?'Ⅱ':'▶';$('sport-play').setAttribute('aria-label',playing?['暂停运动','Pause sport','Pause du sport'][lang]:['播放运动','Play sport','Lire le sport'][lang]);const b=$('toggle-play');b.replaceChildren();if(playing){const img=document.createElement('img');img.src='studio-assets/animation-imgIconPause.svg';img.width=img.height=20;img.alt='';b.append(img);}else b.textContent='▶';b.setAttribute('aria-label',playing?['暂停','Pause','Pause'][lang]:['播放','Play','Lire'][lang]);}
 function navigate(next){if(!['appearance','animation'].includes(next))return;page=next;shell.dataset.page=next;document.querySelectorAll('.rail button').forEach(b=>{const id=b.dataset.page;b.setAttribute('aria-current',id===page?'page':'false');const icon={appearance:'Palette',animation:'Movie'}[id];b.querySelector('img').src=`studio-assets/${page}-imgIcon${icon}.svg`;});if(page==='animation'){++sportRequest;loadingSport=null;failedSport=null;buildSequence($('sequence').value==='single'?[selected]:randomIds());}else if(page==='appearance'){time=0;resetAction(selected);}renderCurrent();updateTransport();}
 function translate(){document.documentElement.lang='zh-CN';document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=text(el.dataset.i18n));tiles('shapes',shapes);tiles('expressions',sports.ids);tiles('animations',animations);colors();updateTransport();}
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('notice').textContent=['已生成下载文件','Download prepared','Téléchargement prêt'][lang]+' · '+name;}
 function configuration(){return {version:3,previewOnly:true,device:'venu4-45mm',size:454,color,category:sports.ids.includes(selected)?'sport':'face',expression:sports.ids.includes(selected)?null:selected,sportIcon:sports.ids.includes(selected)?selected:null,sportMotion:sports.ids.includes(selected)?{source:sports.source,frameCount:sports.metadata[selected].frameCount,sourceFps:sports.metadata[selected].fps,speed:sportSpeed,previewFps:Number($('sport-fps').value),transition:'line-departure',initialHold:.2}:null,clock:$('studio-time').value,clockTransition:ClockTransition.defaults};}
 $('export-png').onclick=()=>{renderCurrent();const c=document.createElement('canvas');c.width=c.height=454;const x=c.getContext('2d');x.beginPath();x.arc(227,227,227,0,Math.PI*2);x.clip();x.drawImage(face,0,0);c.toBlob(blob=>{if(blob)download(blob,'bloub-454.png');});};
 $('export-config').onclick=()=>download(new Blob([JSON.stringify(configuration(),null,2)],{type:'application/json'}),'bloub-appearance.json');
 $('export-sequence').onclick=()=>download(new Blob([JSON.stringify({...configuration(),sequence,loop},null,2)],{type:'application/json'}),'bloub-sequence.json');
 document.querySelectorAll('.rail button').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
 $('toggle-play').onclick=()=>{playing=!playing;if(playing&&failedSport){failedSport=null;renderCurrent();}if(playing&&time>=(page==='appearance'&&sports.ids.includes(selected)?sports.duration(selected,sportSpeed):total())){if(page==='appearance')time=0;else seek(0,false);}updateTransport();};
 $('sport-play').onclick=()=>{playing=!playing;if(playing&&time>=sports.duration(selected,sportSpeed))time=0;updateTransport();};
 $('sport-replay').onclick=()=>{time=0;playing=true;lastSportSlot=-1;renderCurrent();updateTransport();};
 $('sport-speed').onchange=()=>{sportSpeed=Number($('sport-speed').value);time=0;lastSportSlot=-1;if(page==='animation'&&$('sequence').value==='single')buildSequence([selected]);renderCurrent();};
 $('sport-fps').onchange=()=>{lastSportSlot=-1;renderCurrent();};
 $('scrub').oninput=()=>seek(Number($('scrub').value));
 $('sequence').onchange=()=>{++sportRequest;loadingSport=null;failedSport=null;$('notice').textContent='';buildSequence($('sequence').value==='single'?[selected]:randomIds());};
 $('zoom').oninput=()=>{document.querySelector('.track').style.width=$('zoom').value+'%';$('zoom-value').value=$('zoom').value+'%';};
 $('loop').onclick=()=>{loop=!loop;$('loop').setAttribute('aria-pressed',String(loop));};
 $('studio-time').onchange=()=>{if(!$('studio-time').value)return;clockSetup();thumbs.delete('clock');translate();choose('clock');save();};
 face.addEventListener('pointerdown',()=>{if(page==='animation'){playing=false;updateTransport();}else playing=true;});
 face.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(engine.moods[(engine.moods.findIndex(m=>m.id===selected)+1)%engine.moods.length].id);}});
 reduced.addEventListener('change',()=>{if(reduced.matches){playing=false;updateTransport();}});
 const embedded=new URLSearchParams(location.search).get('embed')==='portfolio';
 let portfolioVisible=!embedded,frameHandle=null;
 const canRender=()=>portfolioVisible&&!document.hidden;
 function schedule(){if(canRender()&&frameHandle===null)frameHandle=requestAnimationFrame(frame);}
 function syncVisibility(){if(frameHandle!==null)cancelAnimationFrame(frameHandle);frameHandle=null;last=0;document.body.dataset.studioVisible=String(canRender());schedule();}
 addEventListener('message',event=>{if(!embedded||event.source!==parent||event.origin!==location.origin||event.data?.type!=='bloub-visibility')return;portfolioVisible=event.data.visible===true;syncVisibility();});
 document.addEventListener('visibilitychange',syncVisibility);
 function frame(now){
  frameHandle=null;if(!canRender())return;
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  const active=page==='animation'?sequence[locate(time).index]?.id:selected;
  const waiting=sports.ids.includes(active)&&!sports.loaded(active);
  if(!document.hidden&&playing&&!waiting){
   if(page==='animation'){
    time+=dt;if(time>=total()){if(loop){if($('sequence').value==='random'){const previous=sequence[sequence.length-1].id;buildSequence(randomIds(previous));}else time%=total();clipIndex=-1;}else{time=total();playing=false;updateTransport();}}
    const p=locate(time);if(p.index!==clipIndex){clipIndex=p.index;advanceTo(sequence[p.index].id,p.local);}else if(!sports.ids.includes(sequence[p.index].id))engine.tick(dt);
   }else{time+=dt;if(sports.ids.includes(selected)){const end=sports.duration(selected,sportSpeed);if(time>=end){if(loop)time%=end;else{time=end;playing=false;updateTransport();}}}else engine.tick(dt);}
   const current=page==='animation'?sequence[locate(time).index]?.id:selected;
   const slot=Math.floor(now*Number($('sport-fps').value)/1000);
   if(!sports.ids.includes(current)||slot!==lastSportSlot){lastSportSlot=slot;renderCurrent();}
  }
  schedule();
 }

 clockSetup();translate();buildSequence(randomIds());navigate('appearance');syncVisibility();
 if(sports.ids.includes(selected))choose(selected);
 if(embedded){
  const announce=()=>parent.postMessage({type:'garmin-studio-ready',height:Math.ceil(document.body.getBoundingClientRect().height)},location.origin);
  new ResizeObserver(announce).observe(document.body);announce();
 }
})();
