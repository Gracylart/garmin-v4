// Controller regression tests: execute the actual preview controller against a
// tiny DOM/RAF harness. This is not a replacement for visual browser inspection.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),Emote=require('./engine.js');
function harness(reduce=false){
 let callback,now=0,draws=0;const nodes=new Map(),listeners={};
 const element=()=>({value:'',textContent:'',dataset:{},children:[],attrs:{},width:390,height:390,setAttribute(k,v){this.attrs[k]=v;},append(b){this.children.push(b);},getContext(){return {};},getBoundingClientRect(){return {left:0,top:0,width:390,height:390};}});
 const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElement:element,querySelectorAll(selector){return selector==='[data-expression]'?(nodes.get('expressions')?.children||[]):[];},addEventListener(name,fn){listeners[name]=fn;}};
 const media={matches:reduce};
 const context=vm.createContext({document,Emote:{...Emote,Face:class extends Emote.Face{draw(){draws++;}}},matchMedia:()=>media,performance:{now:()=>now},requestAnimationFrame:fn=>{callback=fn;},Float64Array,Math,Array,Object,Number,String});
 vm.runInContext(fs.readFileSync(require.resolve('./preview.js'),'utf8'),context);
 return {context,nodes,document,listeners,media,frame(t){now=t;callback(t);},read(s){return vm.runInContext(s,context);},get draws(){return draws;}};
}
const h=harness();h.frame(0);for(let i=1;i<=30;i++)h.frame(i*1000/60);
assert.ok(h.read('face.time')>.45);
h.nodes.get('pause').onclick();const paused=h.read('JSON.stringify(face.pose)'),time=h.read('face.time');h.frame(600);h.frame(1200);assert.equal(h.read('face.time'),time);assert.equal(h.read('JSON.stringify(face.pose)'),paused);
h.nodes.get('pause').onclick();h.frame(2000);assert.equal(h.read('face.time'),time);h.frame(2017);assert.ok(h.read('face.time')>time);
h.document.hidden=true;h.listeners.visibilitychange();const hiddenTime=h.read('face.time');h.frame(80000);assert.equal(h.read('face.time'),hiddenTime);
h.document.hidden=false;h.listeners.visibilitychange();h.frame(90000);assert.equal(h.read('face.time'),hiddenTime);h.frame(90017);assert.ok(h.read('face.time')-hiddenTime<.02);
h.nodes.get('fps').value='30';h.nodes.get('fps').onchange();assert.equal(h.read('targetFps'),30);
h.nodes.get('size').value='454';h.nodes.get('size').onchange();assert.equal(h.nodes.get('face').width,454);assert.equal(h.nodes.get('face').height,454);
const r=harness(true);r.frame(0);r.frame(1000);assert.equal(r.read('face.time'),0);assert.equal(r.nodes.get('pause').textContent,'继续');
const oldPose=r.read('JSON.stringify(face.pose)');const oldDraws=r.draws;r.nodes.get('touch').onclick({detail:0});assert.notEqual(r.read('JSON.stringify(face.pose)'),oldPose,'paused touch should change visible eye shape');assert.ok(r.draws>oldDraws,'paused touch should redraw');
const g=harness();const surface=g.nodes.get('touch');g.frame(0);assert.equal(g.read('face.event'),'wake','preview opens with simulated wrist raise');g.nodes.get('wake').onclick();assert.equal(g.read('face.event'),'wake','wrist button restarts random gaze');surface.onpointerdown({isPrimary:true,pointerId:1,clientX:195,clientY:195});surface.onpointermove({pointerId:1,clientX:300,clientY:195,pointerType:'touch'});assert.ok(g.read('face.lookX')>.5,'touch drag directs the eyes');surface.onpointerup({pointerId:1});const stateBefore=g.read('face.state');surface.onclick({detail:1});assert.equal(g.read('face.state'),stateBefore,'drag release must not be counted as a tap');g.frame(100);assert.ok(g.read('face.pointer'),'gaze briefly holds after release');g.frame(500);assert.equal(g.read('face.pointer'),false,'gaze returns after release');
const t=harness();const pad=t.nodes.get('touch');t.frame(0);pad.onpointerdown({isPrimary:true,pointerId:2,clientX:270,clientY:195});for(const x of [290,250,295,245,290,250])pad.onpointermove({pointerId:2,clientX:x,clientY:195,pointerType:'touch'});assert.equal(t.read('face.event'),'tickle','repeated small-area swipes trigger tickling');pad.onpointerup({pointerId:2});pad.onclick({detail:1});assert.equal(t.read('face.event'),'tickle','gesture release is not a random-expression tap');
const fine=harness();const finePad=fine.nodes.get('touch');fine.frame(0);finePad.onpointerdown({isPrimary:true,pointerId:3,clientX:270,clientY:195});for(const [from,to] of [[270,310],[310,270],[270,310],[310,270]])for(let x=from;x!==to;x+=Math.sign(to-from))finePad.onpointermove({pointerId:3,clientX:x,clientY:195,pointerType:'touch'});assert.equal(fine.read('face.event'),'tickle','one-pixel samples still accumulate a small-area rubbing gesture');
const repeats=harness();const repeatPad=repeats.nodes.get('touch');for(let i=0;i<3;i++){repeats.frame(i*500);repeatPad.onpointerdown({isPrimary:true,pointerId:i+4,clientX:200,clientY:195});repeatPad.onpointermove({pointerId:i+4,clientX:230,clientY:195,pointerType:'touch'});repeatPad.onpointerup({pointerId:i+4});repeatPad.onclick({detail:1});}assert.equal(repeats.read('face.tickleActive'),true,'several separate short swipes also trigger tickling');
console.log('PASS: pause/resume, reduced motion, FPS/size controls, drag/tap separation, fine and repeated tickle gestures');
