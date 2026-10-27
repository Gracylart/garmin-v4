const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(process.env.STUDIO_SOURCE || require('node:path').join(__dirname, '../studio.js'), 'utf8');
function setup(saved = null, code = source) {
 const elements = new Map(), jobs = new Map(), loaded = new Set(), started = [], frames = [];
 class Element {
  constructor(id) { this.id=id; this.children=[]; this.dataset={}; this.style={}; this.attributes={}; this.value=''; this.classList={toggle(){}}; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children=items; }
  setAttribute(key,value) { this.attributes[key]=value; }
  querySelectorAll(selector) { return this.children.filter(el=>selector!=='.tile'||el.className==='tile'); }
  querySelector() { return this.children[0]; }
  addEventListener() {}
  getContext() { return new Proxy({canvas:this}, {get:(obj,key)=>key in obj?obj[key]:()=>{}}); }
 }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 get('studio-time').value='10:10';get('sequence').value='random';get('sport-fps').value='30';
 const rails=['appearance','animation'].map(page=>{const e=new Element();e.dataset.page=page;e.append(new Element());return e;});
 const document={documentElement:{},body:get('body'),addEventListener(){},hidden:false,getElementById:get,createElement:()=>new Element(),querySelector:selector=>get(selector),querySelectorAll:selector=>selector==='.rail button'?rails:selector==='.tile'?['shapes','expressions','animations'].flatMap(id=>get(id).children):[]};
 const engine={moods:['calm','joy','curious'].map(id=>({id})),reset(){},trigger(){},tick(){},draw(){},captureEyes(){return [{x:1},{x:2}];}};
 const sports={ids:['running','swimming'],labels:{running:['跑步','Running','Course'],swimming:['游泳','Swimming','Natation']},metadata:{running:{fps:30,frameCount:90},swimming:{fps:30,frameCount:90}},loaded:id=>loaded.has(id),ensure(id){if(loaded.has(id))return Promise.resolve();if(!jobs.has(id)){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=()=>{loaded.add(id);yes();};reject=no;});jobs.set(id,{promise,resolve,reject});}return jobs.get(id).promise;},start(id){started.push(id);},draw(){},render(){},info(){return {phase:'enter'};},duration(){return 4;}};
 let randomSeed=12345;const seededMath=Object.create(Math);seededMath.random=()=>((randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0)/4294967296);
 const context={Math:seededMath,document,EmotePreview:engine,SportIcons:sports,ClockTransition:{defaults:{},forTime:()=>[]},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:()=>saved&&JSON.stringify(saved),setItem(){}},requestAnimationFrame:fn=>frames.push(fn),cancelAnimationFrame(){},addEventListener(){},location:{search:'',origin:'http://localhost'},URLSearchParams,URL,Blob,setTimeout,console};
 vm.runInNewContext(code,context);
 const tile=(container,id)=>get(container).children.find(el=>el.dataset.action===id);
 return {get,tile,jobs,started,frames,rails};
}
(async()=>{
 // A saved sport must never hold up binding click handlers to the page.
 const startup=setup({selected:'running'});
 assert.equal(typeof startup.tile('shapes','joy').onclick,'function');
 assert.equal(startup.tile('expressions','running').attributes['aria-busy'],'true');
 await startup.tile('shapes','joy').onclick();
 startup.jobs.get('running').resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(startup.tile('shapes','joy').attributes['aria-pressed'],'true');
 assert.deepEqual(startup.started,[],'a late startup load cannot replace a newer choice');
 const page=setup();
 const first=page.tile('expressions','running').onclick();
 assert.equal(page.tile('expressions','running').attributes['aria-pressed'],'true');
 assert.equal(page.tile('expressions','running').attributes['aria-busy'],'true');
 assert.match(page.get('sport-phase').textContent,/载入/);
 const second=page.tile('expressions','swimming').onclick();
 page.jobs.get('running').resolve();await first;
 assert.equal(page.tile('expressions','swimming').attributes['aria-pressed'],'true');
 assert.deepEqual(page.started,[]);
 page.jobs.get('swimming').resolve();await second;
 assert.deepEqual(page.started,['swimming']);
 assert.equal(page.tile('expressions','swimming').attributes['aria-busy'],'false');
 await page.tile('expressions','swimming').onclick();
 assert.deepEqual(page.started,['swimming','swimming'],'clicking the active sport replays it');
 const failure=setup();const failed=failure.tile('expressions','running').onclick();
 failure.jobs.get('running').reject(Error('offline'));await failed;
 assert.match(failure.get('notice').textContent,/重试/);
 failure.jobs.delete('running');const retry=failure.tile('expressions','running').onclick();
 failure.jobs.get('running').resolve();await retry;
 assert.deepEqual(failure.started,['running']);
 const paused=setup();paused.rails[1].onclick();const loading=paused.tile('animations','running').onclick();
 paused.get('toggle-play').onclick();paused.jobs.get('running').resolve();await loading;
 assert.equal(paused.get('toggle-play').attributes['aria-label'],'播放','loading completion preserves pause');
 const shuffled=setup();shuffled.rails[1].onclick();
 const order=()=>shuffled.get('clips').children.map(clip=>clip.title.split(' · ')[0]);
 const initial=order();assert.equal(new Set(initial).size,initial.length,'shuffle includes every animation once');
 assert.ok(initial.includes('跑步')&&initial.includes('游泳'),'random mode includes sports');
 let now=0,cycled=false;
 for(let i=0;i<2500;i++){
  const next=shuffled.frames.shift();assert.equal(typeof next,'function');next(now+=50);
  for(const job of shuffled.jobs.values())job.resolve();
  await Promise.resolve();await Promise.resolve();
  if(order().join()!==initial.join()){cycled=true;break;}
 }
 assert.ok(cycled,'loop creates a fresh random order');
 assert.notEqual(order()[0],initial.at(-1),'cycle boundary cannot repeat the previous animation');
 const pending=setup();pending.rails[1].onclick();
 const sportClip=pending.get('clips').children.find(clip=>clip.title.startsWith('跑步 · '));sportClip.onclick();
 assert.ok(pending.jobs.has('running'),'seeking into random sport loads its source');
 assert.equal(pending.get('toggle-play').attributes['aria-label'],'播放');
 pending.jobs.get('running').resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(pending.get('toggle-play').attributes['aria-label'],'播放','random source load preserves pause');
 console.log('PASS: startup responsiveness, immediate selection, rapid switching, replay, load retry, paused loading, random coverage, reshuffle, random sport loading');
})().catch(error=>{console.error(error);process.exitCode=1;});
