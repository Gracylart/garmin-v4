'use strict';
(()=>{
 const engine=globalThis.EmotePreview,sports=globalThis.SportIcons,canvas=document.getElementById('face'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const eyeIds=[...engine.moods.map(m=>m.id),'spin','cheer','rage','tickle'],pool=[...eyeIds,...sports.ids];
 let visible=parent===window,leaving=false,raf=null,last=0,slot=-1,elapsed=0,duration=2.8,kind='eyes',current='calm',bag=[],queued=null,pending=false;
 const active=()=>visible&&!document.hidden&&!leaving&&!reduced.matches;
 function nextId(){
  if(!bag.length){bag=[...pool];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===current)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];}
  return bag.pop();
 }
 async function prepare(){
  if(pending||queued||!active())return;pending=true;const id=nextId();
  try{if(sports.ids.includes(id))await sports.ensure(id);queued=id;}
  catch{queued=eyeIds.find(id=>id!==current)||'calm';}
  finally{pending=false;}
 }
 function choose(id){
  if(kind==='sport')engine.draw();
  if(sports.ids.includes(id)){sports.start(id,engine.captureEyes());kind='sport';duration=sports.duration(id);}
  else{engine.trigger(id);kind='eyes';duration=3+Math.random()*1.2;}
  current=id;elapsed=0;queued=null;document.body.dataset.previewState=kind;document.body.dataset.previewAction=id;
 }
 function frame(now){
  raf=null;if(!active())return;
  const currentSlot=Math.floor(now*30/1000);
  if(currentSlot!==slot){
   const dt=last?Math.min((now-last)/1000,.1):0;last=now;slot=currentSlot;elapsed+=dt;
   if(elapsed>=duration&&queued)choose(queued);
   if(kind==='sport')sports.render(ctx,current,elapsed);else engine.tick(dt);
   if(elapsed>=duration-.8)prepare();
  }
  if(active())raf=requestAnimationFrame(frame);
 }
 function sync(){
  const running=active();document.body.dataset.previewPlaying=String(running);
  if(!running){if(raf!==null)cancelAnimationFrame(raf);raf=null;last=0;slot=-1;}
  else if(raf===null)raf=requestAnimationFrame(frame);
 }
 engine.reset();
 addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='bloub-visibility')return;visible=event.data.visible===true;sync();});
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 addEventListener('pagehide',()=>{leaving=true;sync();});addEventListener('pageshow',()=>{leaving=false;sync();});
 sync();parent.postMessage({type:'garmin-preview-ready'},location.origin);
})();
