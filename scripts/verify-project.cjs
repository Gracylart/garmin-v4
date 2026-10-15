'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {createPreviewServer}=require('../preview-server.cjs');
const root=path.resolve(__dirname,'..'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
(async()=>{
 const server=createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  const get=async url=>{const r=await fetch(new URL(url,base));assert.equal(r.status,200,url+' HTTP');return r;};
  assert((await(await get('/')).text()).includes('BLOUB · 动效工作台'),'Studio is the default entry');
  for(const page of ['/studio.html','/sports-preview.html','/pixel-review.html','/sports-icons/']){const html=await(await get(page)).text();for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(/^(?:https?:|data:)/.test(m[1]))continue;const url=new URL(m[1],new URL(page,base));await get(url.pathname+url.search);}}
  const registry=JSON.parse(fs.readFileSync(path.join(root,'sports-icons/catalog.json'))),ids=new Set(registry.icons.map(x=>x.id));assert.equal(ids.size,18);assert(!ids.has('triathlon')&&!ids.has('pentathlon'));
  const scope={};vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(root,'sports-catalog.js'),'utf8'),scope);const metadata=scope.EmoteSportCatalog;assert.equal(metadata.length,18);
  let frames=0;for(const file of registry.manifests){const manifestURL='/sports-icons/'+file,manifest=await(await get(manifestURL)).json();for(const item of manifest.icons){assert(ids.has(item.id));const dataURL=new URL(item.dataUrl,new URL(manifestURL,base)),data=await(await get(dataURL.pathname)).json();assert.equal(data.frames.length,item.frameCount);assert.equal(metadata.find(x=>x.id===item.id).frameCount,item.frameCount);frames+=data.frames.length;await get(new URL(item.auditPath,new URL(manifestURL,base)).pathname);await get(new URL('editable/'+item.id+'-anchor.svg',new URL(manifestURL,base)).pathname);}}
  assert.equal(frames,2177);
  for(const id of ['running','swimming','cycling','tabletennis']){const canonical=await(await get('/sports-data/'+id+'.json')).arrayBuffer(),alias=await(await get('/reference-frames/'+id+'.json')).arrayBuffer();assert.equal(hash(Buffer.from(alias)),hash(Buffer.from(canonical)));const data=JSON.parse(Buffer.from(canonical));for(const n of [1,data.frames.length]){const r=await get('/reference-frames/'+id+'/'+String(n).padStart(3,'0')+'.png');assert(r.headers.get('content-type').startsWith('image/png'));}}
  for(const url of ['/.git/config','/.env','/.openai/hosting.json','/package.json','/ciq/source/EmoteView.mc'])assert.equal((await fetch(base+url)).status,404,url+' is not a preview asset');
  assert.equal((await fetch(base+'/studio.html',{method:'POST'})).status,405);
  console.log('PASS: portable HTTP entries, 18 canonical sports / 2177 frames, editable anchors/audits, four pixel-review sets and private-file exclusion.');
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
