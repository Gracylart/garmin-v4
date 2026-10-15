'use strict';
(async()=>{
 const $=id=>document.getElementById(id),exact=SportsExact,contexts=['original','rebuilt','difference'].map(id=>$(id).getContext('2d',{willReadFrequently:true}));
 let sport='running',frame=54,playing=false,last=0,pending=0,ready=false,auditing=false;const cache=new Map();
 function imageFor(id,n){const key=id+':'+n;if(!cache.has(key)){if(cache.size>6)cache.delete(cache.keys().next().value);cache.set(key,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=`reference-frames/${id}/${String(n+1).padStart(3,'0')}.png?v=${exact.database[id].sourceStart}`;}));}return cache.get(key);}
 async function draw(){const version=++pending,id=sport,n=frame;ready=false;$('status').textContent='读取第 '+n+' 帧…';
  const image=await imageFor(id,n);if(version!==pending)return;
  const [original,rebuilt,difference]=contexts;original.drawImage(image,0,0);rebuilt.fillStyle='#fff';rebuilt.fillRect(0,0,960,960);exact.renderFrame(id,n,rebuilt);
  const a=original.getImageData(0,0,960,960).data,b=rebuilt.getImageData(0,0,960,960).data,output=difference.createImageData(960,960),c=output.data;let intersection=0,union=0,missing=0,extra=0;
  for(let i=0;i<a.length;i+=4){const x=a[i+2]-a[i]>12&&a[i]<133,y=b[i+2]-b[i]>12&&b[i]<133;if(x||y)union++;if(x&&y)intersection++;if(x&&!y)missing++;if(y&&!x)extra++;c[i]=x?(y?192:225):(y?36:255);c[i+1]=x?(y?202:76):(y?164:255);c[i+2]=x?(y?187:64):(y?170:255);c[i+3]=255;}
  difference.putImageData(output,0,0);const data=exact.database[id];$('iou').textContent='轮廓 IoU '+(union?100*intersection/union:100).toFixed(4)+'%';$('error').textContent='缺失 '+missing+' px · 多出 '+extra+' px';$('source-time').textContent='原片 '+(data.sourceStart+n/data.fps).toFixed(3)+' s · 帧 '+n+' / '+(data.frames.length-1);$('frame-number').max=data.frames.length-1;$('scrub').max=data.frames.length-1;$('frame-number').value=frame;$('scrub').value=frame;$('previous').disabled=frame===0;$('next').disabled=frame===data.frames.length-1;$('status').textContent='960 × 960 原生像素比较';ready=true;
  const result={sport:id,frame:n,iou:union?intersection/union:1,missing,extra};
  if(n+1<data.frames.length)imageFor(id,n+1).catch(()=>{});return result;
 }
 function totalFrames(){return Object.values(exact.database).reduce((n,d)=>n+d.frames.length,0);}
 function pause(){playing=false;$('play').textContent='▶ 原速播放';}
 function seek(n){if(!exact.database[sport]||auditing)return;pause();frame=Math.max(0,Math.min(exact.database[sport].frames.length-1,Math.round(n)));draw().catch(error);}
 function error(e){pause();$('status').textContent='原片帧读取失败，请刷新重试。';console.error(e);}
 $('previous').onclick=()=>seek(frame-1);$('next').onclick=()=>seek(frame+1);$('frame-number').oninput=()=>{if($('frame-number').value!=='')seek(Number($('frame-number').value));};$('scrub').oninput=()=>seek(Number($('scrub').value));
 $('zoom').onchange=()=>document.querySelectorAll('.viewport canvas').forEach(c=>c.style.width=(Number($('zoom').value)*100)+'%');
 $('play').onclick=()=>{if(!exact.database[sport]||auditing)return;playing=!playing;if(playing&&frame===exact.database[sport].frames.length-1)frame=0;last=0;$('play').textContent=playing?'Ⅱ 暂停':'▶ 原速播放';draw().catch(error);};
 document.querySelectorAll('[data-sport]').forEach(button=>button.onclick=()=>{if(auditing||!exact.database[button.dataset.sport])return;pause();sport=button.dataset.sport;frame=exact.database[sport].anchor;document.querySelectorAll('[data-sport]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));draw().catch(error);});
 $('audit').onclick=async()=>{
  if(auditing||!exact.database[sport])return;pause();auditing=true;$('audit').disabled=true;const originalSport=sport,originalFrame=frame,results=[];
  try{for(const id of ['running','swimming','cycling','tabletennis']){sport=id;for(let i=0;i<exact.database[id].frames.length;i++){frame=i;results.push(await draw());$('status').textContent='校验进度 '+results.length+' / '+totalFrames()+' 帧';}}
   const worst=Math.min(...results.map(r=>r.iou)),bad=results.filter(r=>r.missing||r.extra);$('audit').textContent=totalFrames()+' 帧校验完成';const report={frames:results.length,worstIoU:worst,mismatchedFrames:bad.length,results};
   const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.href=url;a.download='tokyo2020-pixel-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
   sport=originalSport;frame=originalFrame;await draw();$('status').textContent=totalFrames()+' 帧校验：最低 IoU '+(worst*100).toFixed(4)+'%，差异帧 '+bad.length+'；报告已导出';
  }catch(e){error(e);}finally{auditing=false;$('audit').disabled=false;}
 };
 function animate(now){requestAnimationFrame(animate);if(playing&&ready&&!document.hidden&&(!last||now-last>=1000/exact.database[sport].fps)){last=now;if(frame>=exact.database[sport].frames.length-1){pause();return;}frame++;draw().catch(error);}}
 try{await exact.load();frame=exact.database[sport].anchor;$('audit').textContent='校验全部 '+totalFrames()+' 帧';await draw();requestAnimationFrame(animate);}catch(e){error(e);}
})();
