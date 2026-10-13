import Toybox.ActivityMonitor;
import Toybox.Attention;
import Toybox.Graphics;
import Toybox.Math;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

class PlayView extends WatchUi.View {
 private var _timer;
 private var _last = 0;
 private var _time = 0.0;
 private var _width = 454.0;
 private var _eyes = new EyeShape();
 // lh rh lw rw la ra y peek rise lid
 private var _states = [
  [82.0,82.0,49.0,49.0,-.06,.06,0.0,0.0,0.0,1.0],
  [104.0,52.0,43.0,38.0,-.16,.20,-6.0,19.0,0.0,1.0],
  [7.0,7.0,72.0,72.0,.10,-.10,-8.0,0.0,0.0,1.0],
  [112.0,112.0,91.0,91.0,-.06,.06,-8.0,0.0,0.0,1.0],
  [92.0,13.0,49.0,68.0,-.13,-.10,0.0,-13.0,0.0,1.0],
  [7.0,7.0,60.0,60.0,-.06,.06,16.0,0.0,0.0,1.0],
  [104.0,104.0,54.0,54.0,.35,-.35,-8.0,0.0,0.0,1.0]
 ];
 private var _pose = [];
 private var _target = [];
 private var _velocity = [];
 private var _expression = 0;
 private var _eventUntil = 0.0;
 private var _specialStart = 0.0;
 private var _blinkAge = -1.0;
 private var _nextBlink = 3.0;
 private var _tapCount = 0;
 private var _tapStart = -10000;
 private var _lastTap = -10000;
 private var _dragging = false;
 private var _holdUntil = 0.0;
 private var _lookX = 0.0;
 private var _lookY = 0.0;
 private var _lastX = 0.0;
 private var _lastY = 0.0;
 private var _startX = 0.0;
 private var _startY = 0.0;
 private var _minX = 0.0;
 private var _maxX = 0.0;
 private var _minY = 0.0;
 private var _maxY = 0.0;
 private var _path = 0.0;
 private var _minRadius = 0.0;
 private var _direction = 0;
 private var _reversals = 0;
 private var _winding = 0.0;
 private var _lastAngle = 0.0;
 private var _angleValid = false;
 private var _spinX = 1.0;
 private var _spinY = 0.0;
 private var _spinStartYaw = 0.0;
 private var _spinStartPitch = 0.0;
 private var _moveLevel = null;
 private var _contextAge = 0.0;
 private var _visible = false;
 private var _pendingCelebration = false;
 private var _pendingRage = false;
 private var _screenLow = false;

 function initialize() {
  View.initialize(); _timer = new Timer.Timer();
  for (var i = 0; i < 10; i++) { _pose.add(_states[0][i]); _target.add(_states[0][i]); _velocity.add(0.0); }
 }
 function onShow() as Void {
  _visible = true;
  _last = System.getTimer();
  _moveLevel = ActivityMonitor.getInfo().moveBarLevel;
  _screenLow = System.getDisplayMode() == System.DISPLAY_MODE_LOW_POWER;
  if (!_screenLow) { _timer.start(self.method(:tick),50,true); }
  if (_pendingCelebration && !_screenLow) { _pendingCelebration=false; celebrate(true); }
 }
 function onHide() as Void { _visible=false; _timer.stop(); }
 function queueCelebration() as Void {
  _pendingCelebration=true;
  if (_visible && !_screenLow && !specialLocked()) { _pendingCelebration=false; celebrate(true); }
 }
 function displayModeChanged() as Void {
  var low=System.getDisplayMode() == System.DISPLAY_MODE_LOW_POWER;
  if (_visible && !_screenLow && low) { _timer.stop(); }
  if (_visible && _screenLow && !low) {
   _last=System.getTimer(); _timer.start(self.method(:tick),50,true);
   if (Math.rand()%2 == 0) { queueCelebration(); }
  }
  _screenLow=low;
 }
 private function signed(v) { return v < -1 ? -1.0 : (v > 1 ? 1.0 : v); }
 private function setLook(x,y) as Void {
  var r = _width/2.0;
  var nx = (x-r)/r; var ny = (y-r)/r;
  var length = Math.sqrt(nx*nx+ny*ny);
  if (length > 1) { nx /= length; ny /= length; }
  _lookX = nx; _lookY = ny;
 }
 private function specialLocked() { return _time < _eventUntil && (_expression == 6 || _expression == 7 || _expression == 8); }
 private function buzz() as Void {
  if (Attention has :vibrate) { Attention.vibrate([new Attention.VibeProfile(65,160)]); }
 }
 function celebrate(vibrate) as Void {
  if (specialLocked()) { return; }
  _expression = 7; _specialStart = _time; _eventUntil = _time+2.2;
  _tapCount = 0; _dragging = false; _holdUntil = 0.0;
  _blinkAge = -1.0; _nextBlink=_time+2.5;
  if (vibrate) { buzz(); }
  WatchUi.requestUpdate();
 }
 function rage(vibrate) as Void {
  if (specialLocked()) { return; }
  _expression = 6; _specialStart = _time; _eventUntil = _time+1.5;
  _tapCount = 0; _dragging = false; _holdUntil = 0.0;
  if (vibrate) { buzz(); }
  WatchUi.requestUpdate();
 }
 private function captureOrbit() as Void {
  _spinStartYaw=signed(_pose[7]/104)*1.16;
  _spinStartPitch=signed(_pose[8])*1.02;
 }
 private function spin(x,y) as Void {
  if (specialLocked()) { return; }
  var length = Math.sqrt(x*x+y*y);
  if (length < 1) { return; }
  _spinX=x/length; _spinY=y/length;
  captureOrbit();
  _expression=8; _specialStart=_time; _eventUntil=_time+1.12;
  _tapCount=0; _dragging=false; _holdUntil=0.0; _nextBlink=_time+2.0;
  WatchUi.requestUpdate();
 }
 private function straightCross(x,y) {
  var dx=x-_startX; var dy=y-_startY;
  var travel=Math.sqrt(dx*dx+dy*dy);
  if (travel <= _width*.55 || _path >= travel*1.22 || _reversals > 1 || _minRadius >= _width*.24) { return false; }
  var sx=_startX-_width/2.0; var sy=_startY-_width/2.0;
  var ex=x-_width/2.0; var ey=y-_width/2.0;
  return Math.sqrt(sx*sx+sy*sy) > _width*.34
      && Math.sqrt(ex*ex+ey*ey) > _width*.34
      && sx*ex+sy*ey < -_width*_width*.035;
 }
 private function trackCenterCross(x,y) as Void {
  var dx=x-_lastX; var dy=y-_lastY; var length2=dx*dx+dy*dy;
  var t=0.0;
  if (length2 > 0) { t=-((_lastX-_width/2.0)*dx+(_lastY-_width/2.0)*dy)/length2; }
  if (t < 0) { t=0.0; } else if (t > 1) { t=1.0; }
  var cx=_lastX+dx*t-_width/2.0; var cy=_lastY+dy*t-_width/2.0;
  var radius=Math.sqrt(cx*cx+cy*cy);
  if (radius < _minRadius) { _minRadius=radius; }
 }
 function tap(coords) as Void {
  if (specialLocked()) { return; }
  var now = System.getTimer();
  if (now-_lastTap > 450 || now-_tapStart > 850) { _tapCount = 0; _tapStart = now; }
  _tapCount++; _lastTap = now;
  if (_tapCount >= 3) { rage(false); return; }
  else {
   var choice = Math.rand()%6;
   if (choice == _expression) { choice = (choice+1)%6; }
   _expression = choice; _eventUntil = 0.0;
   _blinkAge = 0.0;
  }
  setLook(coords[0],coords[1]); _holdUntil = _time+2.5;
  WatchUi.requestUpdate();
 }
 function drag(coords, kind) as Void {
  if (specialLocked()) { return; }
  var x = coords[0].toFloat(); var y = coords[1].toFloat();
  if (kind == WatchUi.DRAG_TYPE_START) {
   _dragging = true; _lastX=x; _lastY=y; _startX=x; _startY=y;
   _minX=x; _maxX=x; _minY=y; _maxY=y;
   _path=0.0; _direction=0; _reversals=0; _winding=0.0; _angleValid=false;
   var cx=x-_width/2.0; var cy=y-_width/2.0; _minRadius=Math.sqrt(cx*cx+cy*cy);
  } else if (kind == WatchUi.DRAG_TYPE_CONTINUE && _dragging) {
   var dx=x-_lastX; var dy=y-_lastY;
   _path += Math.sqrt(dx*dx+dy*dy);
   trackCenterCross(x,y);
   var cx=x-_width/2.0; var cy=y-_width/2.0;
   var radius=Math.sqrt(cx*cx+cy*cy);
   if (radius > _width*.20) {
    var a=Math.atan2(cy,cx);
    if (_angleValid) {
     var turn=a-_lastAngle;
     if (turn > Math.PI) { turn-=2*Math.PI; }
     if (turn < -Math.PI) { turn+=2*Math.PI; }
     _winding+=turn;
    }
    _lastAngle=a; _angleValid=true;
   } else { _angleValid=false; }
   var sign = dx > 4 ? 1 : (dx < -4 ? -1 : 0);
   if (sign != 0 && _direction != 0 && sign != _direction) { _reversals++; }
   if (sign != 0) { _direction=sign; }
   if (x < _minX) { _minX=x; } if (x > _maxX) { _maxX=x; }
   if (y < _minY) { _minY=y; } if (y > _maxY) { _maxY=y; }
   _lastX=x; _lastY=y;
   if (_path > 100 && _reversals >= 2 && _maxX-_minX < 110 && _maxY-_minY < 110) {
    _expression=2; _eventUntil=_time+2.0;
    setLook(x,y); _lookX = -_lookX; _lookY = -_lookY;
    _dragging=false; _holdUntil=_eventUntil;
   }
   if (_dragging && straightCross(x,y)) {
    setLook(x,y); spin(x-_startX,y-_startY); return;
   }
  } else if (kind == WatchUi.DRAG_TYPE_STOP) {
   if (_dragging) {
    _path += Math.sqrt((x-_lastX)*(x-_lastX)+(y-_lastY)*(y-_lastY));
    trackCenterCross(x,y);
    var ax=x-_width/2.0; var ay=y-_width/2.0;
    if (_angleValid && Math.sqrt(ax*ax+ay*ay) > _width*.20) {
     var turn=Math.atan2(ay,ax)-_lastAngle;
     if (turn > Math.PI) { turn-=2*Math.PI; }
     if (turn < -Math.PI) { turn+=2*Math.PI; }
     _winding+=turn;
    }
    var travelX=x-_startX; var travelY=y-_startY;
    var travel=Math.sqrt(travelX*travelX+travelY*travelY);
    if ((_winding > 5.2 || _winding < -5.2) && _maxX-_minX > _width*.45 && _maxY-_minY > _width*.45 && travel < _width*.32) { celebrate(true); return; }
    if (straightCross(x,y)) {
     setLook(x,y);
     spin(travelX,travelY); return;
    }
   }
   _dragging=false;
   _holdUntil = _eventUntil > _time && _expression == 2 ? _eventUntil : _time+1.5;
  }
  if (_dragging) { setLook(x,y); }
  WatchUi.requestUpdate();
 }
 function swipe(direction) as Void {
  // The OS swipe event has no path or endpoints, so it cannot safely disambiguate gestures.
 }
 function tick() as Void {
  var now = System.getTimer(); var dt = (now-_last)/1000.0; _last=now;
  if (dt < 0) { dt=0.0; } if (dt > .1) { dt=.1; }
  _time += dt;
  _contextAge += dt;
  if (_contextAge >= 10) {
   _contextAge=0.0;
   var level=ActivityMonitor.getInfo().moveBarLevel;
   if (level != null && _moveLevel != null && _moveLevel == 0 && level > 0) { _pendingRage=true; }
   _moveLevel=level;
  }
  if (_eventUntil > 0 && _time >= _eventUntil) { _eventUntil=0.0; _expression=0; }
  if (!specialLocked() && _pendingRage) { _pendingRage=false; rage(false); }
  else if (!specialLocked() && _pendingCelebration) { _pendingCelebration=false; celebrate(true); }
  var poseId = _expression;
  if (poseId == 7) { var age = _time-_specialStart; poseId = age < .22 ? 1 : (age < .8 ? 3 : 2); }
  if (poseId == 8) { poseId = 0; }
  for (var i = 0; i < 10; i++) { _target[i]=_states[poseId][i]; }
  if (_expression == 6) {
   var rageAge=_time-_specialStart;
   if (rageAge < .16) { _target[0]=26; _target[1]=26; _target[2]=76; _target[3]=76; }
   else if (rageAge < .44) { _target[0]=128; _target[1]=128; _target[2]=80; _target[3]=80; }
   else if (rageAge > 1.18) {
    var release=smooth((rageAge-1.18)/.32);
    _target[0]=104-22*release; _target[1]=_target[0];
    _target[2]=54+4*release; _target[3]=_target[2];
   }
  }
  if (_expression == 8) {
   var settle=1-smooth((_time-_specialStart-.48)/.45);
   _target[7]=_spinStartYaw/1.16*104*settle;
   _target[8]=_spinStartPitch/1.02*settle;
  }
  else if (_expression != 7 && (_dragging || _time < _holdUntil)) { _target[7]=_lookX*96; _target[8]=_lookY*.92; }
  var fast=Math.pow(2.7182818,-18*dt); var slow=Math.pow(2.7182818,-9*dt);
  var dragDecay=Math.pow(2.7182818,-22*dt);
  for (var j = 0; j < 10; j++) {
   var omega = _dragging && (j == 7 || j == 8) ? 22.0 : (j == 7 && _expression != 8 ? 9.0 : 18.0);
   var decay = _dragging && (j == 7 || j == 8) ? dragDecay : (j == 7 && _expression != 8 ? slow : fast);
   var d = _pose[j]-_target[j]; var k = (_velocity[j]+omega*d)*dt;
   _velocity[j] = (_velocity[j]-omega*k)*decay;
   _pose[j] = _target[j]+(d+k)*decay;
  }
  if (_blinkAge >= 0) { _blinkAge += dt; if (_blinkAge > .18) { _blinkAge=-1.0; } }
  else if (_time >= _nextBlink && _expression != 5) { _blinkAge=0.0; _nextBlink=_time+4+Math.rand()%5; }
  WatchUi.requestUpdate();
 }
 private function smooth(v) { var x=v<0?0.0:(v>1?1.0:v); return x*x*(3-2*x); }
 function onUpdate(dc as Graphics.Dc) as Void {
  _width=dc.getWidth().toFloat();
  dc.setColor(0x000000,0x000000); dc.clear();
  dc.setAntiAlias(true); dc.setColor(0xE8F3EC,0x000000);
  var p=_pose; var blink=1.0;
  if (_blinkAge >= 0) {
   var t=_blinkAge/.18;
   blink=t<.43?1-.94*smooth(t/.43):.06+.94*smooth((t-.43)/.57);
  }
  var shake=0.0; var shiftY=0.0; var angle=0.0;
  if (_expression == 6) {
   var rageAge=_time-_specialStart;
   var pulse=smooth((rageAge-.14)/.2)*(1-smooth((rageAge-1.13)/.37));
   shake=Math.sin(rageAge*25)*3.2*pulse;
   shiftY=Math.sin(rageAge*9)*3.0*pulse-4.0*smooth(rageAge/.32);
   angle=Math.sin(rageAge*11)*.055*pulse;
  }
  if (_expression == 7) {
   var age=_time-_specialStart;
   var swell=smooth(age/.22)*(1-smooth((age-1.75)/.45));
   shake=Math.sin(age*8)*15*swell;
   shiftY=Math.sin(age*13)*8*swell;
   angle=Math.sin(age*16)*.14*swell;
  }
  _eyes.setup(dc,shake,shiftY,angle);
  if (_expression == 8) {
   var t=(_time-_specialStart)/1.12;
   if (t < 0) { t=0.0; } if (t > 1) { t=1.0; }
   var left=1-t;
   var eased=(t<.5 ? 4*t*t*t : 1-((2-2*t)*(2-2*t)*(2-2*t))/2)+.4*t*left*left*left;
   var turn=2*Math.PI*eased;
   var yaw=signed(p[7]/104)*1.16; var pitch=signed(p[8])*1.02;
   var rise=signed(p[8]); if (rise < 0) { rise=-rise; }
   var baseY=(-18+p[6])*(1-rise);
   _eyes.orbitEye(dc,-1,p[2],p[0]*blink,p[4],yaw,pitch,baseY,turn,_spinX,_spinY);
   _eyes.orbitEye(dc,1,p[3],p[1]*blink,p[5],yaw,pitch,baseY,turn,_spinX,_spinY);
  } else {
   var yaw=signed(p[7]/104)*1.16;
   var pitch=signed(p[8])*1.02;
   var rise=signed(p[8]); if (rise < 0) { rise=-rise; }
   var y=(-18+p[6])*(1-rise)+184*Math.sin(pitch);
   _eyes.eye(dc,-1,y,p[2],p[0]*blink,p[4],0.0,yaw,pitch,0.0,0.0);
   _eyes.eye(dc,1,y,p[3],p[1]*blink,p[5],0.0,yaw,pitch,0.0,0.0);
  }
  _eyes.maskEdge(dc);
 }
}
