const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {handsAt,segment}=require('../clock-lab.js');
class Property {
 constructor(name){this.name=name;this.children={};this.value=null;this.keys=[];}
 property(name){return this.children[name]||(this.children[name]=new Property(name));}
 addProperty(name){return this.children[name]=new Property(name);}
 setValue(value){this.value=value;}
 setValueAtTime(time,value){this.keys.push({time,value});}
}
class Layer extends Property {
 constructor(){super('layer');this.name='';this.inPoint=0;this.outPoint=3;this.guideLayer=false;}
}
const comps=[];
const project={items:{addComp(name,width,height,pixelAspect,duration,fps){
 const comp={name,width,height,pixelAspect,duration,fps,layers:[],openInViewer(){}};
 comp.layers.addShape=()=>{const layer=new Layer();comp.layers.push(layer);return layer;};
 comps.push(comp);return comp;
}}};
const app={project,beginUndoGroup(){},endUndoGroup(){}};
const alerts=[];
const source=fs.readFileSync(__dirname+'/Emote_ClockEyes_454.jsx','utf8');
new Function(source);
vm.runInNewContext(source,{app,Shape:class Shape{},Math,Number,prompt:()=> '06:30',alert:message=>alerts.push(message)});
assert.equal(comps.length,2);
for(const comp of comps){
 assert.equal(comp.width,454);assert.equal(comp.height,454);assert.equal(comp.fps,30);
 assert.equal(comp.layers.length,6);
 assert(comp.layers.some(layer=>layer.name.startsWith('SCREEN')));
 assert(comp.layers.some(layer=>layer.name.startsWith('GUIDE')&&layer.guideLayer));
 assert.equal(comp.layers.filter(layer=>layer.name.includes('EYE')).length,2);
}
const candidate=comps[1];
const hour=candidate.layers.find(layer=>layer.name.startsWith('HOUR'));
const minute=candidate.layers.find(layer=>layer.name.startsWith('MINUTE'));
const handPath=layer=>layer.property('ADBE Root Vectors Group').property('ADBE Vector Group')
 .property('ADBE Vectors Group').property('ADBE Vector Shape - Group').property('ADBE Vector Shape');
const hourKeys=handPath(hour).keys,minuteKeys=handPath(minute).keys;
assert(hourKeys.length>20&&minuteKeys.length>20);
assert.equal(hourKeys[0].time,0);
assert.equal(hourKeys[1].time,1.4);
const scale=454/390;
const original=handsAt(390);
const expected=segment(original[0],1,{arc:13,bend:17,anticipation:6,stagger:.035,rotationLag:.12,lengthLag:.2,thickness:2,duration:.7,easing:'quick'});
const end=hourKeys[hourKeys.length-1].value.vertices;
assert(Math.abs(end[0][0]-expected.x1*scale)<1e-6);
assert(Math.abs(end[1][1]-expected.y2*scale)<1e-6);
const config={arc:13,bend:17,anticipation:6,stagger:.035,rotationLag:.12,lengthLag:.2,thickness:2,duration:.7,easing:'quick'};
const sample=10,steps=21;
for(const [index,keys] of [[0,hourKeys],[1,minuteKeys]]){
 const local=index===0?sample/steps:(.7*sample/steps-.035)/(.7-.035);
 const expectedMid=segment(original[index],local,config);
 const actualMid=keys[1+sample].value;
 assert(Math.abs(actualMid.vertices[0][0]-expectedMid.x1*scale)<1e-6);
 assert(Math.abs(actualMid.vertices[1][1]-expectedMid.y2*scale)<1e-6);
 assert(Math.abs(actualMid.outTangents[0][0]-2*(expectedMid.controlX-expectedMid.x1)*scale/3)<1e-6);
}
assert(Math.abs(hour.outPoint-2.1)<1e-8);
assert(Math.abs(minute.outPoint-2.1)<1e-8);
assert(alerts.some(message=>message.includes('Created two editable')));
console.log('PASS: two 454px comps, six editable vector layers each, sampled hand paths and matching endpoints');
