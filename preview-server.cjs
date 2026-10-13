const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const files={'/':'preview.html','/preview.html':'preview.html','/engine.js':'engine.js','/preview.js':'preview.js','/play-preview.html':'play-preview.html','/play-preview.js':'play-preview.js','/music-preview.html':'music-preview.html','/music-preview.js':'music-preview.js','/clock-lab.html':'clock-lab.html','/clock-lab.js':'clock-lab.js','/orbit-preview.html':'orbit-preview.html','/orbit-preview.js':'orbit-preview.js','/orbit-motion.js':'orbit-motion.js'};
const port=Number(process.env.EMOTE_PREVIEW_PORT)||8796;
files['/clock-transition.js']='clock-transition.js';
for(const name of ['studio.html','studio.css','studio.js'])files['/'+name]=name;
const assetDir=path.join(__dirname,'studio-assets');
if(fs.existsSync(assetDir))for(const name of fs.readdirSync(assetDir))if(/^[\w-]+\.svg$/.test(name))files['/studio-assets/'+name]='studio-assets/'+name;
http.createServer((req,res)=>{const name=files[new URL(req.url,'http://localhost').pathname];if(!name){res.writeHead(404).end();return;}const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html'};const stream=fs.createReadStream(path.join(__dirname,name));stream.on('error',()=>{if(!res.headersSent)res.writeHead(404);res.end();});stream.on('open',()=>{res.writeHead(200,{'Content-Type':(mime[path.extname(name)]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'});stream.pipe(res);});}).listen(port,'127.0.0.1',()=>console.log(`Emote preview: http://127.0.0.1:${port}/studio.html`));
