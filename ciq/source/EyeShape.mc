import Toybox.Graphics;
import Toybox.Math;

// Shared eye geometry: two rounded capsules projected onto an invisible sphere.
class EyeShape {
 private var _points = [];
 private var _mask = [];
 private var _scale = 1.0;
 private var _originX = 0.0;
 private var _originY = 0.0;
 private var _cos = 1.0;
 private var _sin = 0.0;
 private var _arcCos = [];
 private var _arcSin = [];
 private var _edgeX = [];
 private var _edgeY = [];

 function initialize() {
  for (var i = 0; i < 64; i++) { _points.add([0,0]); }
  for (var j = 0; j < 21; j++) { _mask.add([0,0]); }
  for (var k = 0; k < 16; k++) {
   var angle=k*Math.PI/30.0;
   _arcCos.add(Math.cos(angle)); _arcSin.add(Math.sin(angle));
  }
  for (var q=0; q<4; q++) {
   for (var n=0; n<17; n++) {
    var edgeAngle=-Math.PI/2+q*Math.PI/2+n*Math.PI/32;
    _edgeX.add(184*Math.cos(edgeAngle));
    _edgeY.add(-18+184*Math.sin(edgeAngle));
   }
  }
 }
 function setup(dc as Graphics.Dc, shiftX, shiftY, rotation) as Void {
  _scale = dc.getWidth()/390.0;
  _originX = dc.getWidth()/2.0+shiftX*_scale;
  _originY = dc.getHeight()/2.0+shiftY*_scale;
  _cos = Math.cos(rotation); _sin = Math.sin(rotation);
 }
 private function point(index, x, y) as Void {
  _points[index][0] = Math.round(_originX+(x*_cos-y*_sin)*_scale);
  _points[index][1] = Math.round(_originY+(x*_sin+y*_cos)*_scale);
 }
 private function corner(index, x, y, bx, by, w, arch, ca, sa, a, b, c, d) as Void {
  by+=arch*(1-4*bx*bx/(w*w))*.75;
  var xx=bx*ca-by*sa; var yy=bx*sa+by*ca;
  point(index,x+a*xx+c*yy,y+b*xx+d*yy);
 }
 private function oval(dc, x, y, w, h, angle, arch, a, b, c, d) as Void {
  if (h < 16) { h = h < 5 ? 5.0 : h; arch = 0.0; angle=0.0; a=1.0; b=0.0; c=0.0; d=1.0; }
  var ca = Math.cos(angle); var sa = Math.sin(angle);
  var r=(w<h?w:h)*.48;
  var left=-w/2+r; var right=w/2-r;
  var top=-h/2+r; var bottom=h/2-r;
  for (var i = 0; i < 16; i++) {
   var co=_arcCos[i]; var si=_arcSin[i];
   corner(i,x,y,right+r*si,top-r*co,w,arch,ca,sa,a,b,c,d);
   corner(16+i,x,y,right+r*co,bottom+r*si,w,arch,ca,sa,a,b,c,d);
   corner(32+i,x,y,left-r*si,bottom+r*co,w,arch,ca,sa,a,b,c,d);
   corner(48+i,x,y,left-r*co,top-r*si,w,arch,ca,sa,a,b,c,d);
  }
  dc.fillPolygon(_points);
 }
 function eye(dc, side, y, w, h, angle, arch, yaw, pitch, tilt, spread) as Void {
  faceEye(dc,side,w,h,angle+tilt,arch,yaw,pitch,y-184*Math.sin(pitch),0.0,1.0,0.0,spread);
 }
 function orbitEye(dc, side, w, h, angle, yaw, pitch, baseY, spin, dx, dy) as Void {
  faceEye(dc,side,w,h,angle,0.0,yaw,pitch,baseY,spin,dx,dy,0.0);
 }
 private function faceEye(dc,side,w,h,angle,arch,yaw,pitch,baseY,spin,dx,dy,spread) as Void {
  // Head basis: yaw right, pitch down. Both eyes stay on the same sphere.
  var cy=Math.cos(yaw); var sy=Math.sin(yaw);
  var cp=Math.cos(pitch); var sp=Math.sin(pitch);
  var fx=sy*cp; var fy=sp; var fz=cy*cp;
  var rx=cy; var ry=0.0; var rz=-sy;
  var ux=-sy*sp; var uy=cp; var uz=-cy*sp;
  // A full turn rotates the current pose around the swipe's screen-plane axis.
  if (spin != 0) {
   var ax=-dy; var ay=dx; var cs=Math.cos(spin); var sn=Math.sin(spin); var one=1-cs;
   var dot=ax*fx+ay*fy;
   var nfx=fx*cs+ay*fz*sn+ax*dot*one;
   var nfy=fy*cs-ax*fz*sn+ay*dot*one;
   var nfz=fz*cs+(ax*fy-ay*fx)*sn;
   dot=ax*rx+ay*ry;
   var nrx=rx*cs+ay*rz*sn+ax*dot*one;
   var nry=ry*cs-ax*rz*sn+ay*dot*one;
   var nrz=rz*cs+(ax*ry-ay*rx)*sn;
   dot=ax*ux+ay*uy;
   var nux=ux*cs+ay*uz*sn+ax*dot*one;
   var nuy=uy*cs-ax*uz*sn+ay*dot*one;
   var nuz=uz*cs+(ax*uy-ay*ux)*sn;
   fx=nfx; fy=nfy; fz=nfz; rx=nrx; ry=nry; rz=nrz; ux=nux; uy=nuy; uz=nuz;
  }
  var split=side*.27; var sc=Math.cos(split); var ss=Math.sin(split);
  var ex=fx*sc+rx*ss; var ey=fy*sc+ry*ss; var ez=fz*sc+rz*ss;
  if (ez <= .015) { return; }
  var a=rx*sc-fx*ss; var b=ry*sc-fy*ss;
  // Projection itself compresses the outer eye and tilts its tangent frame.
  oval(dc,184*ex+side*spread,baseY+184*ey,w,h,angle,arch,a,b,ux,uy);
 }
 // Black outside the sphere clips each eye at the limb without drawing a ball.
 function maskEdge(dc) as Void {
  dc.setColor(0x000000,0x000000);
  for (var q=0; q<4; q++) {
   var a=-Math.PI/2+q*Math.PI/2;
   for (var i=0; i<17; i++) {
    var x=_edgeX[q*17+i]; var y=_edgeY[q*17+i];
    _mask[i][0]=Math.round(_originX+(x*_cos-y*_sin)*_scale);
    _mask[i][1]=Math.round(_originY+(x*_sin+y*_cos)*_scale);
   }
   var x1=195*Math.cos(a+Math.PI/2); var y1=-18+213*Math.sin(a+Math.PI/2);
   var x2=195*Math.cos(a)+195*Math.cos(a+Math.PI/2);
   var y2=-18+213*Math.sin(a)+213*Math.sin(a+Math.PI/2);
   var x3=195*Math.cos(a); var y3=-18+213*Math.sin(a);
   _mask[17][0]=Math.round(_originX+(x1*_cos-y1*_sin)*_scale); _mask[17][1]=Math.round(_originY+(x1*_sin+y1*_cos)*_scale);
   _mask[18][0]=Math.round(_originX+(x2*_cos-y2*_sin)*_scale); _mask[18][1]=Math.round(_originY+(x2*_sin+y2*_cos)*_scale);
   _mask[19][0]=Math.round(_originX+(x3*_cos-y3*_sin)*_scale); _mask[19][1]=Math.round(_originY+(x3*_sin+y3*_cos)*_scale);
   _mask[20][0]=_mask[0][0]; _mask[20][1]=_mask[0][1];
   dc.fillPolygon(_mask);
  }
 }
}
