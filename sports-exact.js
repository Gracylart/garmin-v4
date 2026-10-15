(function(root){
 'use strict';
 const database={},paths=new Map(),ids=['running','swimming','cycling','tabletennis'],pending=new Map();
 const catalog=Object.fromEntries(ids.map(id=>[id,{id,name:{running:'跑步',swimming:'游泳',cycling:'骑行',tabletennis:'乒乓球'}[id],category:'common',dataUrl:'reference-frames/'+id+'.json'}]));
 for(const item of root.EmoteSportCatalog||[])catalog[item.id]={...item,dataUrl:new URL('sports-data/'+item.id+'.json',document.baseURI).href};
 let catalogPromise;
 function loadCatalog(){
  if(!catalogPromise)catalogPromise=(async()=>{
   const results=await Promise.allSettled(['a','b'].map(async group=>{
    const url=new URL('sports-icons/group-'+group+'/manifest.json',document.baseURI),response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error('运动素材清单读取失败：'+group);
    const manifest=await response.json();if(!Array.isArray(manifest.icons))throw new Error('运动素材清单格式无效');
    return {url,icons:manifest.icons};
   }));
   for(const result of results)if(result.status==='fulfilled')for(const item of result.value.icons){
    if(typeof item.id!=='string'||typeof item.dataUrl!=='string')continue;
    const existing=catalog[item.id];
    catalog[item.id]={...item,...existing,dataUrl:existing?.layout?existing.dataUrl:ids.includes(item.id)?'reference-frames/'+item.id+'.json':new URL(item.dataUrl,result.value.url).href};
   }
   return catalog;
  })();
  return catalogPromise;
 }
 function buildPlayback(data){
  // Start/end on the same visible anchor. The only source cut crosses two empty frames.
  const order=[];for(let i=data.anchor;i<data.frames.length;i++)order.push(i);
  for(let i=0;i<=data.anchor;i++)order.push(i);
  return order;
 }
 async function ensure(id){
  if(database[id])return database[id];if(pending.has(id))return pending.get(id);
  const request=(async()=>{
   if(!catalog[id])await loadCatalog();
   const item=catalog[id];if(!item)throw new Error('尚未注册的运动：'+id);
   const response=await fetch(item.dataUrl,{cache:'no-store'});if(!response.ok)throw new Error(item.name+'素材读取失败（'+response.status+'）');
   const data=await response.json();if(!Array.isArray(data.frames)||!data.frames.length||!(data.fps>0)||!data.frames[data.anchor])throw new Error(item.name+'帧数据无效');
   data.playback=buildPlayback(data);
   const anchor=data.frames[data.anchor],held=f=>Math.abs(f.pixels-anchor.pixels)<anchor.pixels*.005&&f.bbox.every((n,i)=>Math.abs(n-anchor.bbox[i])<=1);
   // Compress only the contiguous source hold surrounding the static anchor.
   // Matching poses later in a longer sport must remain in the action sequence.
   data.holdStart=data.anchor;data.holdEnd=data.anchor;
   while(data.holdStart>0&&held(data.frames[data.holdStart-1]))data.holdStart--;
   while(data.holdEnd<data.frames.length-1&&held(data.frames[data.holdEnd+1]))data.holdEnd++;
   data.actionPlayback=data.playback.slice(data.holdEnd-data.anchor+1);database[id]=data;return data;
  })();
  pending.set(id,request);try{return await request;}finally{pending.delete(id);}
 }
 async function load(){await loadCatalog();await Promise.all(ids.map(ensure));}
 function playbackDuration(id){const data=database[id];return (data.playback.length-1)/data.fps;}
 function actionFrameDuration(id){return database[id].actionPlayback.length/database[id].fps;}
 function playbackIndex(id,time,duration=playbackDuration(id),initialHold){
  const data=database[id];if(time<=0||time>=duration)return data.anchor;
  if(initialHold!==undefined){if(time<initialHold)return data.anchor;return data.actionPlayback[Math.min(data.actionPlayback.length-1,Math.floor((time-initialHold)/(duration-initialHold)*data.actionPlayback.length))];}
  return data.playback[Math.floor(time/duration*(data.playback.length-1))];
 }
 function path(id,index,bodyOnly=false){const key=id+':'+index+(bodyOnly?':body':'');if(!paths.has(key)){if(paths.size>36)paths.delete(paths.keys().next().value);paths.set(key,new Path2D(bodyOnly?(database[id].frames[index].bodyPath??database[id].frames[index].path):database[id].frames[index].path));}return paths.get(key);}
 function renderFrame(id,index,ctx,color,bodyOnly=false){ctx.fillStyle=color||`rgb(${database[id].color.join(',')})`;ctx.fill(path(id,index,bodyOnly),'evenodd');}
 // One fixed calibration per sport: thumbnails, source playback and transition geometry
 // must share it. Recentring individual frames would erase the original motion.
 function layout(id){
  if(catalog[id]?.layout)return catalog[id].layout;
  if(id==='tabletennis'){const s=324.22/704;return{x:53.28-128*s,y:294.94-658.5*s,s};}
  const frame=database[id]?.frames[database[id].anchor]||catalog[id]?.anchorFrame;
  return{x:227-480*.42,y:294.94-frame.bbox[3]*.42,s:.42,...(id==='running'||id==='cycling'?{ground:[53.28,294.94,377.5,294.94]}:{})};
 }
 function drawGround(ctx,id,color){const g=layout(id).ground;if(!g)return;ctx.strokeStyle=color;ctx.lineWidth=9.46;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(g[0],g[1]);ctx.lineTo(g[2],g[3]);ctx.stroke();}
 function render(id,ctx,time,options={}){
  const {watch=false,color=watch?'#e8f3ec':'#011e60',background='#fff',clear=true,table=true}=options,data=database[id];
  const index=options.frameIndex??data.anchor;
  const size=ctx.canvas.width;if(clear)ctx.clearRect(0,0,size,size);ctx.save();ctx.scale(size/454,size/454);
  if(clear){ctx.fillStyle=watch?'#000':background;ctx.fillRect(0,0,454,454);}
  if(watch){ctx.beginPath();ctx.arc(227,227,226,0,Math.PI*2);ctx.clip();}
  const placement=layout(id);
  ctx.save();ctx.translate(placement.x,placement.y);ctx.scale(placement.s,placement.s);
  renderFrame(id,index,ctx,color,id==='tabletennis'&&!table);ctx.restore();
  if(table)drawGround(ctx,id,color);
  ctx.restore();
 }
 function phasePlayback(id,t,duration,initialHold){if(initialHold!==undefined&&t<initialHold)return '初始姿态静置 · '+(initialHold*2).toFixed(2)+' s';const data=database[id],index=playbackIndex(id,t,duration,initialHold),phase=data.frames[index].pixels===0?'原片空白接续':index<data.holdStart?'原片入场':index>data.holdEnd?'原片退场':'原片定格';return phase+' · 帧 '+index+' / '+(data.frames.length-1);}
 function get(id){return {render:(ctx,t,o)=>render(id,ctx,t,o),renderPlayback:(ctx,t,o={})=>render(id,ctx,0,{...o,frameIndex:playbackIndex(id,t,o.motionDuration,o.initialHold)}),phasePlayback:(t,duration,initialHold)=>phasePlayback(id,t,duration,initialHold),phase:()=> '原片静态姿态'};}
 root.SportsExact={database,catalog,load,loadCatalog,ensure,path,renderFrame,layout,drawGround,get,buildPlayback,playbackDuration,actionFrameDuration,playbackIndex};
})(globalThis);
