(function(root){
 'use strict';
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const smooth=x=>x*x*(3-2*x);
 const EYE_ORBIT=184,EYE_SPLIT=Math.asin(57/EYE_ORBIT);
 const BLINK_GAP={calm:9,curious:3.2,happy:4.5,surprised:3,skeptical:7.5,sleepy:Infinity};
 // Only the two eye shapes are visible; the sphere is an invisible motion guide.
 const neutral={lh:82,rh:82,lw:49,rw:49,la:-.06,ra:.06,lc:0,rc:0,tilt:0,y:0,peek:0,rise:0,lid:1};
 const states={
  calm:{label:'平静 · 竖眼',pose:{}},
  curious:{label:'好奇 · 一大一小',pose:{lh:104,rh:52,lw:43,rw:38,la:-.16,ra:.20,y:-6,peek:19}},
  happy:{label:'开心 · 双横线',pose:{lh:7,rh:7,lw:72,rw:72,la:.10,ra:-.10,y:-8}},
  surprised:{label:'惊讶 · 大圆眼',pose:{lh:112,rh:112,lw:91,rw:91,y:-8}},
  skeptical:{label:'怀疑 · 单眼半眯',pose:{lh:92,rh:13,lw:49,rw:68,la:-.13,ra:-.10,rc:-8,peek:-13}},
  sleepy:{label:'困倦 · 双横线',pose:{lh:7,rh:7,lw:60,rw:60,y:16}}
 };
 const glance=(x,y)=>[{until:.22,state:'calm',lid:.02},{until:1.05,state:'curious',peek:x*104,rise:y,lid:1,lh:78,rh:78,lw:48,rw:48,tilt:0},{until:2.1,state:'curious',peek:x*104,rise:y,lid:1,lh:70,rh:70,lw:45,rw:45,tilt:0},{until:2.4,state:'curious',peek:x*104,rise:y,lid:.06,tilt:0},{until:3.2,state:'curious',peek:0,rise:0,lid:1}];
 const scripts={
  poke:[{until:.16,state:'skeptical',y:5},{until:.46,state:'surprised',y:-13},{until:1.1,state:'skeptical',rh:8,ra:-.18},{until:1.8,state:'skeptical'}],
  tickle:[{until:.22,state:'curious'},{until:.75,state:'happy',tilt:-.10},{until:1.45,state:'happy',tilt:.10},{until:2,state:'skeptical'}],
  cheer:[{until:.22,state:'curious',y:7},{until:.8,state:'surprised',y:-17},{until:2.2,state:'happy',y:-9}],
  startle:[{until:.65,state:'surprised',y:-12},{until:1.0,state:'sleepy',lid:.08},{until:1.8,state:'curious',peek:-27,tilt:.12},{until:2.4,state:'calm'}],
  peekRight:[{until:.22,state:'calm',lid:.02},{until:1.05,state:'curious',peek:98,lid:1,lw:37,rw:47,lh:66,rh:92,tilt:0},{until:2.1,state:'curious',peek:104,lw:37,rw:47,lh:50,rh:82,tilt:0},{until:2.4,state:'curious',peek:100,lid:.06,tilt:0},{until:3.2,state:'curious',peek:0,lid:1}],
  peekLeft:[{until:.22,state:'calm',lid:.02},{until:1.05,state:'curious',peek:-98,lid:1,lw:47,rw:37,lh:92,rh:66,tilt:0},{until:2.1,state:'curious',peek:-104,lw:47,rw:37,lh:82,rh:50,tilt:0},{until:2.4,state:'curious',peek:-100,lid:.06,tilt:0},{until:3.2,state:'curious',peek:0,lid:1}],
  peekUp:glance(0,-1),peekDown:glance(0,1),peekNW:glance(-.707,-.707),peekNE:glance(.707,-.707),peekSW:glance(-.707,.707),peekSE:glance(.707,.707),
  rage:[{until:.14,state:'surprised',lw:112,rw:112,lh:132,rh:132,la:-.13,ra:.13,y:-8},{until:.85,state:'surprised',lw:116,rw:116,lh:138,rh:138,la:-.16,ra:.16,y:-8},{until:1.28,state:'skeptical',lh:92,rh:92,lw:54,rw:54,la:-.19,ra:.19},{until:1.75,state:'calm'}]
 };
 const keys=Object.keys(neutral);
 class Face {
  constructor(){this.pose={...neutral};this.velocity={};this.target={...neutral};for(const k of keys)this.velocity[k]=0;this.state='calm';this.event=null;this.age=0;this.time=0;this.phase=0;this.bpm=68;this.activity=0;this.night=0;this.gx=0;this.gy=0;this.gvx=0;this.gvy=0;this.lookX=0;this.lookY=0;this.pointer=false;this.auto=false;this.speed=.7;this.visualState='calm';this.transitionBlink=0;this.blinkAge=-1;this.nextBlink=2.4;this.blinkCount=0;this.wakeAngle=0;this.wakeExplore=false;this.shakeX=0;this.shakeY=0;this.wobbleX=0;this.wobbleY=0;this.wobbleAngle=0;this.wobbleStartX=0;this.wobbleStartY=0;this.wobbleStartAngle=0;this.dodgeX=0;this.dodgeY=0;this.tickleActive=false;this.tickleUntil=0;this.tapCount=0;this.tapStart=-Infinity;this.lastTap=-Infinity;}
  setState(name){if(!states[name])throw Error('Unknown expression');this.state=name;this.auto=false;this.event=null;this.tickleActive=false;}
  trigger(name){if(!scripts[name])throw Error('Unknown interaction');if(name==='cheer'){this.wobbleStartX=this.wobbleX;this.wobbleStartY=this.wobbleY;this.wobbleStartAngle=this.wobbleAngle;}if(name!=='tickle')this.tickleActive=false;this.event=name;this.age=0;}
  raiseWrist(angle=Math.random()*Math.PI*2,explore=Math.random()<.5){this.event='wake';this.age=0;this.wakeAngle=angle;this.wakeExplore=explore;this.tickleActive=false;this.pointer=false;}
  tickleAt(x,y){this.trigger('tickle');this.tickleActive=true;this.dodge(x,y);}
  dodge(x,y){const length=Math.max(1,Math.hypot(x,y));this.dodgeX=clamp(x/length,-1,1);this.dodgeY=clamp(y/length,-1,1);if(this.tickleActive)this.tickleUntil=this.time+8;}
  tap(now){if(!Number.isFinite(now))now=this.time*1000;if(now-this.lastTap>450||now-this.tapStart>850){this.tapCount=0;this.tapStart=now;}this.tapCount++;this.lastTap=now;if(this.tapCount>=3){this.tapCount=0;this.trigger('rage');return 'rage';}const choices=Object.keys(states).filter(name=>name!==this.state);const name=choices[Math.floor(Math.random()*choices.length)];this.setState(name);return name;}
  snap(){const source=this.event==='rage'?scripts.rage[1]:states[this.state].pose;if(this.event==='rage')this.state='surprised';for(const k of keys){this.pose[k]=source[k]===undefined?neutral[k]:source[k];this.target[k]=this.pose[k];this.velocity[k]=0;}this.event=null;this.tickleActive=false;this.visualState=this.state;this.shakeX=0;this.shakeY=0;this.wobbleX=0;this.wobbleY=0;this.wobbleAngle=0;this.transitionBlink=0;this.blinkAge=-1;}
  look(x,y,active=true){const length=Math.max(1,Math.hypot(x,y));this.lookX=clamp(x/length,-1,1);this.lookY=clamp(y/length,-1,1);this.pointer=active;}
  update(dt,input){
   dt=clamp(dt,0,.1);if(dt===0)return;
   const follow=1-Math.exp(-dt*4);
   this.bpm+=(clamp(input.bpm,45,180)-this.bpm)*follow;
   this.activity+=(clamp(input.activity)-this.activity)*follow;
   this.night+=(clamp(input.night)-this.night)*follow;
   const energy=clamp((this.bpm-75)/85),quiet=this.night*(1-this.activity);
   this.speed=(.7+energy*1.1+this.activity*1.3)*(1-quiet*.65);
   this.time+=dt;this.phase+=dt*this.speed;
   if(this.tickleActive&&this.time>this.tickleUntil)this.tickleActive=false;
   if(this.auto)this.state=quiet>.6?'sleepy':this.activity>.5?'happy':energy>.6?'surprised':'calm';
   let segment=null;
   if(this.event){this.age+=dt;if(this.event==='wake'){
    if(this.age<.24)segment={state:'calm',lid:.04};
    else if(this.age<5){const angle=this.wakeAngle+(this.wakeExplore?Math.sin((this.age-.24)*3.1)*.17:0);segment={state:'curious',peek:Math.cos(angle)*96,rise:Math.sin(angle)*.92,lid:1,lh:78,rh:78,lw:48,rw:48};}
    else if(this.age<6.2)segment={state:'calm',peek:0,rise:0,lid:1};
   }else for(const part of scripts[this.event]){if(this.age<part.until){segment=part;break;}}if(!segment)this.event=null;}
   if(this.event==='rage'&&this.age<1.05){const swell=smooth(clamp(this.age/.13))*(1-smooth(clamp((this.age-.78)/.27)));this.shakeX=Math.sin(this.age*95)*4.8*swell;this.shakeY=Math.sin(this.age*127)*2.7*swell;}
   else {const decay=Math.exp(-dt*20);this.shakeX*=decay;this.shakeY*=decay;}
   if(this.event==='cheer'){const enter=smooth(clamp(this.age/.22)),swell=enter*(1-smooth(clamp((this.age-1.75)/.45)));this.wobbleAngle=this.wobbleStartAngle*(1-enter)+Math.sin(this.age*16)*.14*swell;this.wobbleX=this.wobbleStartX*(1-enter)+Math.sin(this.age*8)*15*swell;this.wobbleY=this.wobbleStartY*(1-enter)+Math.sin(this.age*13)*8*swell;}
   else {const decay=Math.exp(-dt*13);this.wobbleAngle*=decay;this.wobbleX*=decay;this.wobbleY*=decay;}
   const visualState=segment?segment.state:this.state;
   if(visualState!==this.visualState){this.visualState=visualState;this.nextBlink=this.time+BLINK_GAP[visualState];if(!segment&&this.transitionBlink<=0)this.transitionBlink=.22;}
   const base=states[visualState].pose;
   for(const k of keys)this.target[k]=base[k]===undefined?neutral[k]:base[k];
   if(segment)for(const k of keys)if(segment[k]!==undefined)this.target[k]=segment[k];
   if(this.tickleActive){this.target.peek=-this.dodgeX*105;this.target.rise=-this.dodgeY;}
   else if(this.pointer){this.target.peek=this.lookX*104;this.target.rise=this.lookY;}
   // In-place critically damped springs preserve pose AND velocity on interruption.
   const fastDecay=Math.exp(-18*dt),slowDecay=Math.exp(-9*dt);
   for(const k of keys){const omega=k==='peek'?9:18,decay=k==='peek'?slowDecay:fastDecay;const d=this.pose[k]-this.target[k],j=(this.velocity[k]+omega*d)*dt;this.velocity[k]=(this.velocity[k]-omega*j)*decay;this.pose[k]=this.target[k]+(d+j)*decay;}
   this.transitionBlink=Math.max(0,this.transitionBlink-dt);
   if(this.blinkAge>=0){this.blinkAge+=dt;if(this.blinkAge>.18)this.blinkAge=-1;}
   else if(this.time>=this.nextBlink){this.blinkAge=0;this.blinkCount++;this.nextBlink=this.time+BLINK_GAP[visualState]+(this.blinkCount%3)*.7;}
   const tx=this.pointer?this.lookX:Math.sin(this.phase*.67)*.42;
   const ty=this.pointer?this.lookY:Math.sin(this.phase*.41)*.18;
   const gd=Math.exp(-12*dt);
   let d=this.gx-tx,j=(this.gvx+12*d)*dt;this.gvx=(this.gvx-12*j)*gd;this.gx=tx+(d+j)*gd;
   d=this.gy-ty;j=(this.gvy+12*d)*dt;this.gvy=(this.gvy-12*j)*gd;this.gy=ty+(d+j)*gd;
  }
  draw(ctx,width){
   const p=this.pose;
   ctx.fillStyle='#000';ctx.fillRect(0,0,width,width);
   ctx.save();ctx.translate(width/2,width/2);ctx.scale(width/390,width/390);
   ctx.translate(this.shakeX,this.shakeY);
   ctx.translate(this.wobbleX,this.wobbleY);ctx.rotate(this.wobbleAngle);
   const yaw=clamp(p.peek/104,-1,1)*1.16+this.gx*.16;
   const pitch=clamp(p.rise,-1,1)*1.02+this.gy*.08;
   const y=(-18+p.y)*(1-Math.abs(clamp(p.rise,-1,1)))+EYE_ORBIT*Math.sin(pitch);
   ctx.fillStyle='#e8f3ec';
   // Blink is a continuous envelope. Expression changes never reset its clock.
   const blink=this.blinkScale()*p.lid;
   this.projectedEye(ctx,-1,y,p.lw,p.lh*blink,p.la,p.lc*blink,yaw,pitch,p.tilt);
   this.projectedEye(ctx,1,y,p.rw,p.rh*blink,p.ra,p.rc*blink,yaw,pitch,p.tilt);
   ctx.restore();
  }
  blinkScale(){let blink=1;if(this.blinkAge>=0){const k=this.blinkAge/.18;blink=k<.43?1-.94*smooth(k/.43):.06+.94*smooth((k-.43)/.57);}if(this.transitionBlink>0){const k=this.transitionBlink/.22;blink*=.06+.94*smooth(Math.abs(k*2-1));}return blink;}
  projectedEye(ctx,side,y,w,h,angle,arch,yaw,pitch,tilt){const orbit=yaw+side*EYE_SPLIT,depth=Math.cos(orbit)*Math.cos(pitch);if(depth<=0)return;const x=EYE_ORBIT*Math.sin(orbit)*Math.cos(pitch);this.eye(ctx,x,y,w*depth,h*Math.cos(pitch),angle+tilt+Math.sin(orbit)*.12,arch);}
  eye(ctx,x,y,w,h,angle,arch){ctx.save();ctx.translate(x,y);ctx.rotate(angle);if(h<16){h=Math.max(5,h);arch=0;}ctx.beginPath();ctx.moveTo(-w/2,0);ctx.bezierCurveTo(-w*.5,-h*.67+arch,w*.5,-h*.67+arch,w/2,0);ctx.bezierCurveTo(w*.5,h*.67+arch,-w*.5,h*.67+arch,-w/2,0);ctx.fill();ctx.restore();}
 }
 function frameDeadline(now,previous,fps){const interval=1000/fps,elapsed=now-previous;return elapsed<interval-.5?previous:previous+interval*Math.max(1,Math.floor((elapsed+.5)/interval));}
 const api={Face,states,scripts,keys,frameDeadline};if(typeof module!=='undefined')module.exports=api;else root.Emote=api;
})(typeof globalThis!=='undefined'?globalThis:this);
