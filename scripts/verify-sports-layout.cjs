const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..');
class Path{constructor(d){this.d=d;}moveTo(){}lineTo(){}arc(){}rect(){}}
const scope={URL,console,document:{baseURI:'https://example.test/garmin-v4/studio'},Path2D:Path,fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(base,'sports-data',path.basename(new URL(url).pathname)),'utf8'))})};
vm.createContext(scope);for(const f of ['sports-catalog.js','sports-exact.js','sports-bounce.js','sports-transitions.js','sport-icons.js'])vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),scope);
function contours(d){return [...d.matchAll(/M[^z]*z/g)].map(([d])=>{let x=0,y=0;const points=[];for(const [,cmd,args]of d.matchAll(/([Mhv])([^Mhvz]*)/g)){const v=args.trim().split(/\s+/).map(Number);if(cmd==='M')[x,y]=v;else if(cmd==='h')x+=v[0];else y+=v[0];points.push([x,y]);}return points;});}
function mass(frame){let a=0,x=0,y=0;for(const points of contours(frame.path))for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],c=p[0]*q[1]-q[0]*p[1];a+=c;x+=(p[0]+q[0])*c;y+=(p[1]+q[1])*c;}return{area:a/2,x:x/(3*a),y:y/(3*a)};}
function recordingContext(){let matrix=[1,0,0,1,0,0],stack=[];const fills=[],arcs=[];const ctx=new Proxy({canvas:{width:454},save(){stack.push([...matrix]);},restore(){matrix=stack.pop();assert(matrix);},translate(x,y){matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},scale(x,y){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},rotate(a){const [b,c,d,e]=matrix;matrix[0]=b*Math.cos(a)+d*Math.sin(a);matrix[1]=c*Math.cos(a)+e*Math.sin(a);matrix[2]=d*Math.cos(a)-b*Math.sin(a);matrix[3]=e*Math.cos(a)-c*Math.sin(a);},getTransform(){return{a:matrix[0],b:matrix[1],c:matrix[2],d:matrix[3],e:matrix[4],f:matrix[5]};},fill(p){if(p instanceof Path)fills.push({d:p.d,m:[...matrix]});},arc(x,y,r){arcs.push({x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5],r:r*Math.hypot(matrix[0],matrix[1])});}},{get:(o,k)=>k in o?o[k]:()=>{}});return{ctx,fills,arcs};}
(async()=>{
 const S=scope.SportIcons,E=scope.SportsExact,T=scope.SportsTransitions;
 for(const id of S.ids){await S.ensure(id);const d=E.database[id],f=d.frames[d.anchor],p=E.layout(id),m=mass(f),b=f.bbox;
  let area=m.area*p.s*p.s,cx=p.x+m.x*p.s,cy=p.y+m.y*p.s,box=[p.x+b[0]*p.s,p.y+b[1]*p.s,p.x+b[2]*p.s,p.y+b[3]*p.s];
  if(p.ground){const g=p.ground,a=Math.hypot(g[2]-g[0],g[3]-g[1])*9.46+Math.PI*4.73**2;cx=(cx*area+(g[0]+g[2])/2*a)/(area+a);cy=(cy*area+g[1]*a)/(area+a);box=[Math.min(box[0],g[0]-4.73),Math.min(box[1],g[1]-4.73),Math.max(box[2],g[2]+4.73),Math.max(box[3],g[3]+4.73)];}
  assert(Math.abs(.6*cx+.4*(box[0]+box[2])/2-227)<.01,id+' horizontal optical centre');assert(Math.abs(.6*cy+.4*(box[1]+box[3])/2-227)<.01,id+' vertical optical centre');
  const thumb=recordingContext(),playback=recordingContext();S.draw(thumb.ctx,id,454);E.get(id).render(playback.ctx,0,{watch:true});assert.deepEqual(thumb.fills,playback.fills,id+' thumbnail and playback alignment');
  for(const part of T.assemblyParts(id))if(!part.ground)assert.strictEqual(part.transform,p,id+' entry and return calibration');
  const state=T.paddleState({...scope.SportsBounce.create(scope.SportsBounce.capture('calm')),sport:id},.46),end=state.route.points.at(-1),point=[(end.x-p.x)/p.s,(end.y-p.y)/p.s];let inside=false;
  for(const loop of contours(f.path))for(let i=0,j=loop.length-1;i<loop.length;j=i++){const a=loop[i],b=loop[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}
  assert(inside,id+' departure lands in filled silhouette');
 }
 const r=recordingContext(),node={addEventListener(){},getContext:()=>r.ctx,value:''},eyes={EMOTE_STUDIO:true,document:{getElementById:()=>node,querySelectorAll:()=>[]},console,performance:{now:()=>0}};vm.createContext(eyes);vm.runInContext(fs.readFileSync(path.join(base,'play-preview.js'),'utf8'),eyes);
 for(const mood of ['calm','rage','cheer','spin']){r.arcs.length=0;eyes.EmotePreview.reset();if(mood!=='calm')eyes.EmotePreview.trigger(mood);eyes.EmotePreview.tick(.3);for(const c of r.arcs){assert(Math.abs(c.x-227)<1e-8&&Math.abs(c.y-227)<1e-8,mood+' fixed concentric eye limit');assert(Math.abs(c.r-184*454/390)<1e-8);}}
 eyes.EmotePreview.reset();for(const e of eyes.EmotePreview.captureEyes())assert(Math.abs(e.y-(227-18*454/390))<1e-8,'preserve resting eye height');
 vm.runInContext("globalThis.points=[];eye=(x,y)=>points.push([x,y]);mood=moods[0];for(const p of [.2,.6,1]){orbitEye(-1,49,82,0,0,0,p,0,1,0);orbitEye(-1,49,82,0,0,0,-p,0,1,0);}",eyes);for(let i=0;i<eyes.points.length;i+=2)assert(Math.abs(eyes.points[i][1]+eyes.points[i+1][1])<1e-8,'spherical projection has no vertical centre offset');
 console.log('PASS: 18 optical centres; thumbnail/playback/entry/return agree; departure targets stay in silhouettes; eye limits remain concentric through moods and rotation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
