'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'..'),code=fs.readFileSync(path.join(base,'watch-preview.js'),'utf8');
function setup({standalone=false,reduce=false,fail=false}={}){
 const jobs=new Map(),events={},docEvents={},messages=[],starts=[],draws=[],loads=[],motion={matches:reduce,addEventListener(type,fn){this.change=fn;}};
 let clock=0,id=0,seed=123;const math=Object.create(Math);math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const parent={postMessage:m=>messages.push(m)},window=standalone?parent:{},document={hidden:false,body:{dataset:{previewState:'eyes',previewAction:'calm'}},getElementById:()=>({getContext:()=>({})}),addEventListener:(type,fn)=>docEvents[type]=fn};
 const engine={moods:[{id:'calm'},{id:'joy'}],reset(){},tick(){},draw(){},trigger:id=>starts.push({id,kind:'eyes',at:clock}),captureEyes:()=>[{x:100},{x:200}]};
 const sports={ids:['running','swimming'],ensure:id=>{loads.push(id);return fail?Promise.reject(Error('unavailable')):Promise.resolve();},start:id=>starts.push({id,kind:'sport',at:clock}),duration:()=>5,render:(ctx,id,t)=>draws.push({id,t})};
 const context={EmotePreview:engine,SportIcons:sports,document,parent,window,location:{origin:'https://example.test'},Math:math,matchMedia:()=>motion,addEventListener:(type,fn)=>events[type]=fn,requestAnimationFrame:fn=>{jobs.set(++id,fn);return id;},cancelAnimationFrame:id=>jobs.delete(id)};
 vm.runInNewContext(code,context);
 async function run(seconds){for(let i=0;i<Math.round(seconds*30);i++){clock+=1000/30;const batch=[...jobs.values()];jobs.clear();for(const fn of batch)fn(clock);await Promise.resolve();await Promise.resolve();assert(jobs.size<=1,'exactly one owned RAF loop');}}
 const visible=value=>events.message({source:parent,origin:'https://example.test',data:{type:'bloub-visibility',visible:value}});
 return{jobs,events,document,motion,parent,starts,draws,loads,messages,run,visible,docEvents};
}
(async()=>{
 const p=setup();assert.equal(p.jobs.size,0,'an embedded preview stays paused until visible');assert.equal(p.messages[0].type,'garmin-preview-ready');
 p.events.message({source:p.parent,origin:'https://evil.test',data:{type:'bloub-visibility',visible:true}});assert.equal(p.jobs.size,0,'ignore other origins');
 p.visible(true);await p.run(180);assert(p.starts.some(x=>x.kind==='sport'));assert(p.starts.some(x=>x.kind==='eyes'));assert(p.draws.some(x=>x.t>=4.9),'the complete sports cycle reaches its ending');
 for(let i=1;i<p.starts.length;i++){assert.notEqual(p.starts[i].id,p.starts[i-1].id,'no adjacent repeats');const previous=p.starts[i-1];assert(p.starts[i].at-previous.at>=(previous.kind==='sport'?4900:2900),'finish a segment before switching');}
 p.visible(false);const count=p.starts.length;assert.equal(p.jobs.size,0);await p.run(10);assert.equal(p.starts.length,count);assert.equal(p.document.body.dataset.previewPlaying,'false');
 p.visible(true);await p.run(.1);assert.equal(p.document.body.dataset.previewPlaying,'true');assert.equal(p.jobs.size,1);
 p.document.hidden=true;p.docEvents.visibilitychange();assert.equal(p.jobs.size,0);p.document.hidden=false;p.docEvents.visibilitychange();assert.equal(p.jobs.size,1);
 p.motion.matches=true;p.motion.change();assert.equal(p.jobs.size,0);p.motion.matches=false;p.motion.change();assert.equal(p.jobs.size,1);
 p.events.pagehide();assert.equal(p.jobs.size,0);p.events.pageshow();assert.equal(p.jobs.size,1);
 const reduced=setup({reduce:true});reduced.visible(true);await reduced.run(8);assert.equal(reduced.starts.length,0);assert.equal(reduced.jobs.size,0);
 const failure=setup({standalone:true,fail:true});await failure.run(60);assert(failure.loads.length>0);assert(failure.starts.every(x=>x.kind==='eyes'),'network failures keep the expressive eyes alive');
 const preview=fs.readFileSync(path.join(base,'watch-preview.html'),'utf8'),css=fs.readFileSync(path.join(base,'watch-preview.css'),'utf8'),studio=fs.readFileSync(path.join(base,'studio.html'),'utf8');
 assert(preview.includes('assets/figma-glass-dial.png')&&preview.includes('id="face"'));
 assert(css.includes('mix-blend-mode:screen'));
 assert(!/preview-watch|package-preview|watch-model-preview/.test(studio));
 const material=fs.readFileSync(path.join(base,'assets/figma-glass-dial.png'));
 assert.equal(material.subarray(1,4).toString(),'PNG');
 assert.equal(material.readUInt32BE(16),868);assert.equal(material.readUInt32BE(20),868);
 const progress=JSON.parse(fs.readFileSync(path.join(base,'docs/portfolio-progress.json'),'utf8'));
 assert.equal(progress.media['media-1-0'].clickAction,'none');
 console.log('PASS: random eyes/full sports, no adjacent repeats, safe loading, owned RAF, visibility/reduced-motion pauses and smooth glass material.');
})().catch(error=>{console.error(error);process.exitCode=1;});
