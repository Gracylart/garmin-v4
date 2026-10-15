const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..'),requests=[];
const scope={URL,console,document:{baseURI:'https://example.test/garmin-v4/studio'},Path2D:class{moveTo(){}lineTo(){}arc(){}rect(){}},fetch:async url=>{const u=new URL(url);requests.push(u.pathname);return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(base,'sports-data',path.basename(u.pathname)),'utf8'))};}};
vm.createContext(scope);for(const file of ['sports-catalog.js','sports-exact.js','sports-bounce.js','sports-transitions.js','sport-icons.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),scope,{filename:file});
(async()=>{
 const S=scope.SportIcons,E=scope.SportsExact;assert.equal(S.ids.length,18);assert.equal(new Set(S.ids).size,18);assert.equal(scope.EmoteSportCatalog.filter(x=>x.category==='common').length,14);assert.equal(scope.EmoteSportCatalog.filter(x=>x.category==='extended').length,4);assert.equal(requests.length,0);
 await Promise.all([S.ensure('badminton'),S.ensure('badminton')]);assert.equal(requests.length,1);assert.equal(Object.keys(E.database).length,1);
 let depth=0;const ctx=new Proxy({canvas:{width:454},save(){depth++},restore(){assert(--depth>=0)},fill(){}},{get:(o,key)=>key in o?o[key]:(...args)=>args.forEach(n=>{if(typeof n==='number')assert(Number.isFinite(n),key+' finite geometry');})});
 let frameCount=0;
 for(const id of S.ids){
  await S.ensure(id);const data=E.database[id],meta=S.metadata[id];frameCount+=data.frames.length;
  assert.equal(data.frames.length,meta.frameCount);assert.equal(data.frames[0].pixels,0);assert.equal(data.frames.at(-1).pixels,0);assert(data.frames[data.anchor].pixels>0);assert.equal(S.labels[id].length,3);
  const order=new Set(data.actionPlayback);for(let i=0;i<data.frames.length;i++)if(i<=data.anchor||i>data.holdEnd)assert(order.has(i),'complete non-hold frame '+id+':'+i);
  S.start(id);const duration=S.duration(id);for(const t of [0,.35,.85,1.08,1.28,duration-2,duration-1,.9999*duration,duration]){S.render(ctx,id,t,{color:'#e8f3ec'});assert.equal(depth,0);}
  assert(Math.abs((S.duration(id,1)-S.duration(id,2))-E.actionFrameDuration(id)/2)<1e-8,'speed changes only sports duration');
 }
 assert.equal(frameCount,2177);assert.equal(requests.length,18);console.log('PASS: 18 lazy sports, 2177 complete source frames, localized labels, speed-independent transitions, finite entry/return geometry.');
})().catch(e=>{console.error(e);process.exitCode=1});
