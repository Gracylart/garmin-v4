'use strict';
const canvas=document.getElementById('face'),ctx=canvas.getContext('2d');
const player=document.getElementById('player'),file=document.getElementById('file');
const demoButton=document.getElementById('demo'),status=document.getElementById('status');
const freq=new Uint8Array(128),wave=new Uint8Array(256);
let audioContext,analyser,source,objectUrl,demo=false,last=0,energy=0,gaze=0;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
function mean(data,start,end){let sum=0;for(let i=start;i<end;i++)sum+=data[i];return sum/(end-start)/255;}
function roundedEye(x,y,w,h,tilt){
 ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,Math.min(w,h)*.45);ctx.fill();ctx.restore();
}
function draw(now){
 requestAnimationFrame(draw);
 const dt=last?Math.min((now-last)/1000,.08):0;last=now;
 let bass=0,mid=0;
 if(!player.paused&&analyser){
  analyser.getByteFrequencyData(freq);analyser.getByteTimeDomainData(wave);
  bass=mean(freq,1,10);mid=mean(freq,10,42);
 }else if(demo){
  const beat=Math.pow(Math.max(0,Math.sin(now*.0048)),5);
  bass=.13+.7*beat;mid=.16+.2*Math.sin(now*.0021)**2;
  for(let i=0;i<wave.length;i++)wave[i]=128+Math.round((12+57*beat)*Math.sin(i*.15+now*.013));
 }else wave.fill(128);
 energy+=(bass-energy)*(1-Math.exp(-dt*12));
 gaze+=(mid*.24-gaze)*(1-Math.exp(-dt*4));
 ctx.fillStyle='#000';ctx.fillRect(0,0,454,454);
 ctx.save();ctx.beginPath();ctx.arc(227,227,218,0,Math.PI*2);ctx.clip();
 ctx.fillStyle='#e8f3ec';
 const height=76+energy*38,offset=energy*9;
 roundedEye(173+gaze*18,201-offset,50+energy*5,height,-.05-energy*.05);
 roundedEye(281+gaze*18,201-offset,50+energy*5,height,.05+energy*.05);
 if(demo||!player.paused){
  ctx.beginPath();
  for(let i=0;i<65;i++){
   const x=100+i*3.97;
   const y=227-Math.sqrt(163*163-(x-227)*(x-227))+(wave[Math.min(i*4,255)]-128)*.34;
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.strokeStyle='#b3dac7';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
 }
 ctx.restore();
}
async function connectAudio(){
 if(!audioContext){
  audioContext=new AudioContext();analyser=audioContext.createAnalyser();analyser.fftSize=256;
  analyser.smoothingTimeConstant=.68;source=audioContext.createMediaElementSource(player);
  source.connect(analyser);analyser.connect(audioContext.destination);
 }
 await audioContext.resume();
}
file.addEventListener('change',async()=>{
 const selected=file.files&&file.files[0];if(!selected)return;
 if(objectUrl)URL.revokeObjectURL(objectUrl);
 objectUrl=URL.createObjectURL(selected);player.src=objectUrl;demo=false;
 demoButton.textContent='开启节奏演示（无声音）';
 status.textContent='本地音频已加载；点击播放器的播放键开始真实波形预览。';
});
player.addEventListener('play',async()=>{
 try{demo=false;await connectAudio();status.textContent='正在分析本地音频的低频、中频与波形。';}
 catch(error){player.pause();status.textContent='浏览器无法启动音频分析：'+error.message;}
});
demoButton.addEventListener('click',()=>{
 player.pause();demo=!demo;
 demoButton.textContent=demo?'停止节奏演示':'开启节奏演示（无声音）';
 status.textContent=demo?'人工节奏演示中：不是来自手表或真实歌曲。':'演示已停止。';
});
requestAnimationFrame(draw);
