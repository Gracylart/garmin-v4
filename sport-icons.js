'use strict';
// The full source frames stay separate and load only when a sport is selected.
globalThis.SportIcons=(()=>{
 const E=globalThis.SportsExact,B=globalThis.SportsBounce,T=globalThis.SportsTransitions;
 const records=globalThis.EmoteSportCatalog,ids=records.map(r=>r.id),labels=Object.fromEntries(records.map(r=>[r.id,r.labels])),metadata=Object.fromEntries(records.map(r=>[r.id,r]));
 const nodes=new Map(),anchors=new Map(),hold=.2,entry=T.duration('paddle')*2,returnDuration=T.exitDuration('paddle')*2;
 for(const item of records)E.catalog[item.id]={...item,dataUrl:new URL('sports-data/'+item.id+'.json',document.baseURI).href};
 const ensure=id=>E.ensure(id),loaded=id=>!!E.database[id];
 function draw(ctx,id,size,color='#e8f3ec'){
  const item=metadata[id];if(!item)return;
  if(!anchors.has(id))anchors.set(id,new Path2D(item.anchorFrame.path));
  ctx.save();ctx.clearRect(0,0,size,size);ctx.fillStyle='#000';ctx.fillRect(0,0,size,size);ctx.scale(size/454,size/454);ctx.beginPath();ctx.arc(227,227,226,0,Math.PI*2);ctx.clip();ctx.fillStyle=color;
  const placement=E.layout(id);ctx.save();ctx.translate(placement.x,placement.y);ctx.scale(placement.s,placement.s);
  ctx.fill(anchors.get(id),'evenodd');ctx.restore();
  E.drawGround(ctx,id,color);ctx.restore();
 }
 function start(id,eyes){if(!ids.includes(id))return;const node=B.create(eyes?.length===2?eyes:B.capture('calm',.8));node.sport=id;nodes.set(id,node);}
 function timing(id,speed=1){
  const action=loaded(id)?E.actionFrameDuration(id)/speed:metadata[id].frameCount/metadata[id].fps/speed;
  const motionEnd=entry+hold+action,readyEnd=motionEnd+.7,exitEnd=readyEnd+returnDuration;
  return{entry,motionEnd,readyEnd,exitEnd,total:exitEnd+.9,motionDuration:(hold+action)*.5};
 }
 function render(ctx,id,time,{color='#e8f3ec',speed=1}={}){
  if(!loaded(id)){draw(ctx,id,ctx.canvas.width,color);return;}
  if(!nodes.has(id))start(id);const node=nodes.get(id),times=timing(id,speed),o={kind:'paddle',watch:true,color,sportMotion:E.get(id),motionDuration:times.motionDuration,initialHold:hold*.5};
  if(time<entry)T.render(ctx,node,time*.5,o);
  else if(time<times.motionEnd)o.sportMotion.renderPlayback(ctx,(time-entry)*.5,o);
  else if(time<times.readyEnd)o.sportMotion.render(ctx,0,o);
  else if(time<times.exitEnd)T.renderExit(ctx,node,(time-times.readyEnd)*.5,o);
  else B.renderEyes(ctx,node.eyes,o);
 }
 function info(id,time,speed=1){
  const t=timing(id,speed);let phase=time<entry?'enter':time<entry+hold?'hold':time<t.motionEnd?'motion':time<t.readyEnd?'ready':time<t.exitEnd?'return':'eyes';
  const frameIndex=phase==='motion'?E.playbackIndex(id,(time-entry)*.5,t.motionDuration,hold*.5):metadata[id].anchor;
  return{phase,frameIndex,frameCount:metadata[id].frameCount};
 }
 return{ids,labels,metadata,ensure,loaded,draw,start,render,info,duration:(id,speed=1)=>timing(id,speed).total,source:'https://cekai.us/works/the-tokyo-2020-kinetic-pictograms/'};
})();
