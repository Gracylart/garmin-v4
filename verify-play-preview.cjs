const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function preview() {
 const listeners = {};
 const nodes = new Map();
 const buttons = ['calm','curious','joy','surprised','skeptical','sleepy','excited','bored','resigned','proud','fear','playful','rage'].map(mood=>({dataset:{mood},onclick:null}));
 let curves = 0;
 const ctx = {
  save(){}, restore(){}, translate(){}, rotate(){}, scale(){}, transform(){},
  beginPath(){}, roundRect(){}, arc(){}, clip(){}, fill(){}, fillRect(){}, stroke(){},
  moveTo(){}, lineTo(){}, bezierCurveTo(){curves++;}, closePath(){}
 };
 const canvas = {
  getContext(){ return ctx; },
  getBoundingClientRect(){ return {left:0,top:0,width:454,height:454}; },
  addEventListener(name,fn){ listeners[name]=fn; },
  setPointerCapture(){}
 };
 const document = {querySelectorAll(selector){return selector==='[data-mood]'?buttons:[];},getElementById(id){
  if(id==='face')return canvas;
  if(!nodes.has(id))nodes.set(id,{textContent:'',onclick:null});
  return nodes.get(id);
 }};
 let nextFrame;
 let now = 0;
 const context = vm.createContext({
  document, Math, performance:{now:()=>now},
  requestAnimationFrame(fn){nextFrame=fn;}
 });
 vm.runInContext(fs.readFileSync('play-preview.js','utf8'),context);
 function pointer(name,x,y){listeners[name]({pointerId:1,clientX:x,clientY:y});}
 function step(ms){now=ms;nextFrame(ms);}
 return {pointer,step,clickClock(){nodes.get('clock').onclick();},clickMood(id){buttons.find(button=>button.dataset.mood===id).onclick();},get curves(){return curves;},read(code){return vm.runInContext(code,context);}};
}

const gallery=preview();
assert.equal(gallery.read('moods.length'),12,'gallery offers twelve distinct non-special moods');
assert.equal(gallery.read('new Set(moods.map(m=>JSON.stringify(m.shape))).size'),12,'every mood has a distinct eye shape');
gallery.clickMood('resigned');
assert.equal(gallery.read('mood.id'),'resigned');
for(let ms=16;ms<=800;ms+=16)gallery.step(ms);
assert.ok(gallery.curves>0,'eyes are rendered with cubic Bezier contours');
assert.ok(gallery.read('!moods.some(m=>m.id==="shy")'),'shy state is removed');
assert.ok(gallery.read('moods.find(m=>m.id==="resigned").shape.a1<0 && moods.find(m=>m.id==="proud").shape.a1>0'),'resigned and proud have opposing arc directions');
assert.ok(gallery.read('moods.find(m=>m.id==="joy").shape.h1')>30,'happy eyes are open rather than bored-looking lines');
assert.ok(gallery.read('moods.find(m=>m.id==="proud").shape.h1')<25,'proud eyes use slim curved shapes');
const clockFace=preview();
clockFace.clickClock();
assert.equal(clockFace.read('clockActive'),true,'wrist-raise concept starts with real time hands');
const noon=preview();
noon.read('document.getElementById("clock-time").value="12:00"');
noon.clickClock();
assert.ok(Math.abs(noon.read('clockHour+Math.PI/2'))<1e-9&&Math.abs(noon.read('clockMinute+Math.PI/2'))<1e-9,'exactly overlapping hands remain valid');
const morphAudit=clockFace.read(`(()=>{
 let maxStep=0;
 for(let minute=0;minute<1440;minute++){
  const hour=(minute%720)/720*Math.PI*2-Math.PI/2;
  const hand=(minute%60)/60*Math.PI*2-Math.PI/2;
  const left=Math.cos(hour)*87<=Math.cos(hand)*124?-1:1;
  for(const [angle,length,side] of [[hour,87,left],[hand,124,-left]]){
   let previous=clockSegment(angle,length,side,0);
   if(Math.hypot(previous[0],previous[1])>1e-6)throw Error('source misses pivot');
   for(let frame=1;frame<=20;frame++){
    const current=clockSegment(angle,length,side,frame/20);
    if(!current.every(Number.isFinite))throw Error('non-finite geometry');
    maxStep=Math.max(maxStep,Math.hypot(current[0]-previous[0],current[1]-previous[1]),Math.hypot(current[2]-previous[2],current[3]-previous[3]));
    previous=current;
   }
   if(Math.abs((previous[0]+previous[2])/2-side*49)>1e-6 ||
      Math.abs(previous[1]+18)>1e-6 || Math.abs(previous[3]+18)>1e-6 ||
      Math.abs(Math.abs(previous[2]-previous[0])-42)>1e-6)throw Error('slit mismatch');
  }
 }
 return maxStep;
})()`);
assert.ok(morphAudit<25,'all 1,440 minutes morph continuously into exact eye-slit geometry');
clockFace.pointer('pointerdown',227,227);
assert.equal(clockFace.read('clockRelease'),clockFace.read('clock'),'preview tap accelerates eyes transition');
for(let ms=16;ms<=900;ms+=16)clockFace.step(ms);
assert.equal(clockFace.read('clockActive'),false,'clock hands resolve into eyes');
gallery.clickMood('rage');
assert.equal(gallery.read('kind'),'rage');
assert.ok(gallery.read('mood.id')==='resigned','special animation does not discard selected mood');
for(let ms=816;ms<=1504;ms+=16)gallery.step(ms);
assert.ok(gallery.read('pose.a1')>.2&&gallery.read('pose.a2')<-.2,'angry eyes tilt inward');

const short=preview();
short.pointer('pointerdown',170,227);
short.pointer('pointermove',285,227);
short.pointer('pointerup',285,227);
assert.notEqual(short.read('kind'),'spin','short swipe must not trigger spin');

const straight=preview();
straight.pointer('pointerdown',40,227);
straight.pointer('pointermove',414,227);
assert.equal(straight.read('kind'),'spin','crossing threshold triggers before pointer release');
const spinStart=straight.read('start');
straight.pointer('pointerup',414,227);
assert.equal(straight.read('start'),spinStart,'release cannot restart an active spin');
assert.equal(straight.read('spinAt(0)'),0);
assert.ok(Math.abs(straight.read('spinAt(1)')-Math.PI*2)<1e-9);
assert.ok(straight.read('spinAt(.01)')>0,'spin starts moving without a zero-speed pause');
assert.equal(straight.read('typeof spinRibbons'),'undefined','color-trail renderer is removed');
straight.pointer('pointerdown',227,227);
assert.equal(straight.read('kind'),'spin','touch cannot interrupt committed spin');
for(let ms=16;ms<=1600;ms+=16)straight.step(ms);
assert.equal(straight.read('kind'),'idle','spin finishes and releases input');

const settling=preview();
settling.pointer('pointerdown',40,227);
for(let ms=16;ms<=176;ms+=16)settling.step(ms);
assert.ok(settling.read('gazeX')<-.05,'drag establishes an off-center gaze');
settling.pointer('pointermove',414,227);
for(let ms=192;ms<=1216;ms+=16)settling.step(ms);
assert.ok(Math.abs(settling.read('gazeX'))<.06,'gaze settles toward center before spin ends');

const vertical=preview();
vertical.pointer('pointerdown',227,40);
vertical.pointer('pointermove',227,414);
assert.equal(vertical.read('kind'),'spin','vertical cross-screen swipe triggers spin');

const circle=preview();
circle.pointer('pointerdown',387,227);
for(let i=1;i<=24;i++){
 const a=2*Math.PI*i/24;
 circle.pointer('pointermove',227+160*Math.cos(a),227+160*Math.sin(a));
}
circle.pointer('pointerup',387,227);
assert.equal(circle.read('kind'),'cheer','full circular stroke keeps celebration');

const tickle=preview();
tickle.pointer('pointerdown',215,227);
for(const x of [245,210,248,208,247,213])tickle.pointer('pointermove',x,227);
tickle.pointer('pointerup',213,227);
assert.equal(tickle.read('kind'),'tickle','small repeated stroke keeps tickle');

console.log('PASS: spin, return, no color trails, short swipe, circle, tickle, locked playback');

const studio=preview();
studio.read('EmotePreview.reset(); EmotePreview.trigger("spin"); EmotePreview.tick(.1)');
assert.equal(studio.read('EmotePreview.snapshot().kind'),'spin');
assert.equal(studio.read('EmotePreview.snapshot().locked'),true);
studio.read('EmotePreview.reset(); EmotePreview.trigger("curious"); EmotePreview.tick(.05)');
const sample=studio.read('JSON.stringify(pose)');
studio.read('EmotePreview.reset(); EmotePreview.trigger("curious"); EmotePreview.tick(.05)');
assert.equal(studio.read('JSON.stringify(pose)'),sample,'studio seek resets to a reproducible pose');
assert.equal(studio.read('EmotePreview.moods.length'),12);
console.log('PASS: studio host reset, transport tick, gesture lock and reproducible sampling');
