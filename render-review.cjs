// Generate a static review sheet from the actual renderer; not a motion proof.
const {createCanvas}=require('@napi-rs/canvas'),fs=require('node:fs'),path=require('node:path');
const {Face}=require('./engine.js');
const cases=[['Calm','calm'],['Curious','curious'],['Happy','happy'],['Surprised','surprised'],['Skeptical','skeptical'],['Sleepy','sleepy'],['Center blink',null,'peekRight',.2],['Peek right · moving',null,'peekRight',.5],['Peek right',null,'peekRight',1.3],['Peek left',null,'peekLeft',1.3],['Angry · wide eyes',null,'rage',.45],['Angry · settle',null,'rage',1.05]];
const out=createCanvas(960,810),g=out.getContext('2d');g.fillStyle='#111715';g.fillRect(0,0,960,810);
cases.forEach(([label,state,event,time],i)=>{const f=new Face();if(state)f.setState(state);if(event)f.trigger(event);for(let n=0;n<Math.round((time||1.5)*60);n++)f.update(1/60,{bpm:68,activity:0,night:0});const c=createCanvas(390,390);f.draw(c.getContext('2d'),390);const x=(i%4)*240+15,y=Math.floor(i/4)*270+10;g.save();g.beginPath();g.arc(x+105,y+105,105,0,Math.PI*2);g.clip();g.drawImage(c,x,y,210,210);g.restore();g.fillStyle='#dbeee0';g.font='17px sans-serif';g.textAlign='center';g.fillText(label,x+105,y+240);});
const folder=path.join(__dirname,'review');fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,'expressions.png');fs.writeFileSync(file,out.toBuffer('image/png'));console.log(file);
