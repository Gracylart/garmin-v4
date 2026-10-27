'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
function createPreviewServer(){
 const files=new Map([['/','studio.html']]);
 const pages=['preview.html','engine.js','preview.js','play-preview.html','play-preview.js','music-preview.html','music-preview.js','clock-lab.html','clock-lab.js','orbit-preview.html','orbit-preview.js','orbit-motion.js','clock-transition.js','studio.html','studio.css','studio.js','sports-preview.html','sports-preview.css','sports-preview.js','sports-motion.js','sports-bounce.js','sports-transitions.js','sports-disciplines.js','sports-exact.js','sports-catalog.js','sport-icons.js','pixel-review.html','pixel-review.css','pixel-review.js','watch-preview.html','watch-preview.css','watch-preview.js'];
 for(const name of pages)files.set('/'+name,name);
 function assets(folder,extensions){const dir=path.join(__dirname,folder);if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=folder+'/'+entry.name;if(entry.isDirectory())assets(file,extensions);else if(entry.isFile()&&extensions.has(path.extname(file)))files.set('/'+file,file);}}
 assets('assets',new Set(['.png','.jpg']));assets('studio-assets',new Set(['.svg']));assets('sports-data',new Set(['.json']));assets('sports-icons',new Set(['.html','.css','.js','.json','.svg']));assets('reference-frames',new Set(['.png']));
 files.set('/sports-icons/','sports-icons/index.html');files.set('/sports-icons','sports-icons/index.html');
 // Keep old lab URLs working without storing a second copy of the source paths.
 for(const id of ['running','swimming','cycling','tabletennis'])files.set('/reference-frames/'+id+'.json','sports-data/'+id+'.json');
 const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
 return http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const name=files.get(pathname);if(!name){res.writeHead(404).end();return;}
  const filename=path.join(__dirname,name);fs.stat(filename,(error,stat)=>{
   if(error||!stat.isFile()){res.writeHead(404).end();return;}
   const type=mime[path.extname(name)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type+(type.startsWith('text/')||type==='application/json'||type==='image/svg+xml'?'; charset=utf-8':''),'Content-Length':stat.size,'Cache-Control':'no-store'});
   if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(filename);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
 });
}
if(require.main===module){const port=Number(process.env.EMOTE_PREVIEW_PORT)||8796;createPreviewServer().listen(port,'127.0.0.1',()=>console.log(`Emote preview: http://127.0.0.1:${port}/studio.html`));}
module.exports={createPreviewServer};
