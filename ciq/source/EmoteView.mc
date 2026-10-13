import Toybox.ActivityMonitor;
import Toybox.Complications;
import Toybox.Graphics;
import Toybox.Math;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

// Eye-only port of the browser preview. No text, mouth, trails or fireworks.
class EmoteView extends WatchUi.WatchFace {
 private var _timer;
 private var _visible = false;
 private var _sleeping = true;
 private var _last = 0;
 private var _time = 0.0;
 private var _phase = 0.0;
 private var _age = 0.0;
 private var _event = 0; // 0 idle, 1 wake glance, 2 celebration
 private var _wakeAngle = 0.0;
 private var _wakeExplore = false;
 private var _bpm = 75.0;
 private var _activity = 0.0;
 private var _night = 0.0;
 private var _hrId = new Complications.Id(Complications.COMPLICATION_TYPE_HEART_RATE);
 private var _heartRate = null;
 private var _lastSteps = null;
 private var _stepEnergy = 0.0;
 private var _nightInput = 0.0;
 private var _sampleAge = 0.0;
 private var _pendingCelebration = false;
 private var _gx = 0.0;
 private var _gy = 0.0;
 private var _gvx = 0.0;
 private var _gvy = 0.0;
 private var _wobbleX = 0.0;
 private var _wobbleY = 0.0;
 private var _wobbleAngle = 0.0;
 private var _blinkAge = -1.0;
 private var _nextBlink = 3.0;
 private var _clockAge = 0.0;
 private var _showClock = false;
 private var _clockHourAngle = 0.0;
 private var _clockMinuteAngle = 0.0;
 private var _clockHourSide = -1;
 // lh rh lw rw la ra lc rc tilt y peek rise lid
 private var _neutral = [82.0,82.0,49.0,49.0,-.06,.06,0.0,0.0,0.0,0.0,0.0,0.0,1.0];
 private var _states = [
  [82.0,82.0,49.0,49.0,-.06,.06,0.0,0.0,0.0,0.0,0.0,0.0,1.0],
  [104.0,52.0,43.0,38.0,-.16,.20,0.0,0.0,0.0,-6.0,19.0,0.0,1.0],
  [42.0,42.0,69.0,69.0,-.16,.16,0.0,0.0,0.0,-8.0,0.0,0.0,1.0],
  [112.0,112.0,91.0,91.0,-.06,.06,0.0,0.0,0.0,-8.0,0.0,0.0,1.0],
  [92.0,13.0,49.0,68.0,-.13,-.10,0.0,-8.0,0.0,0.0,-13.0,0.0,1.0],
  [7.0,7.0,60.0,60.0,-.06,.06,0.0,0.0,0.0,16.0,0.0,0.0,1.0],
  [20.0,20.0,83.0,83.0,.22,-.22,-6.0,-6.0,0.0,-8.0,0.0,0.0,1.0],
  [20.0,20.0,82.0,82.0,-.28,.28,-7.0,-7.0,0.0,-8.0,0.0,0.0,1.0]
 ];
 private var _pose = [];
 private var _target = [];
 private var _velocity = [];
 private var _eyes = new EyeShape();

 function initialize() {
  WatchFace.initialize(); _timer = new Timer.Timer();
  for (var i = 0; i < 13; i++) { _pose.add(_neutral[i]); _target.add(_neutral[i]); _velocity.add(0.0); }
 }
 function onShow() as Void {
  _visible = true;
  Complications.registerComplicationChangeCallback(method(:onComplicationChange));
  Complications.subscribeToUpdates(_hrId);
  readHeartRate(); syncDisplayMode();
 }
 function onHide() as Void {
  _visible = false; _sleeping = true; _timer.stop();
  Complications.unsubscribeFromAllUpdates();
  Complications.registerComplicationChangeCallback(null);
 }
 function onComplicationChange(id as Complications.Id) as Void { if (id.equals(_hrId)) { readHeartRate(); } }
 private function readHeartRate() as Void {
  try {
   var value = Complications.getComplication(_hrId).value;
   _heartRate = (value instanceof Number && value > 0 && value < 250) ? value.toFloat() : null;
  } catch (e) { _heartRate = null; }
 }
 private function sampleContext() as Void {
  var hour = System.getClockTime().hour;
  _nightInput = (hour >= 22 || hour < 7) ? 1.0 : 0.0;
  var steps = ActivityMonitor.getInfo().steps;
  if (steps == null) { return; }
  if (_lastSteps != null && steps > _lastSteps) {
   var delta = steps-_lastSteps;
   _stepEnergy = clamp(delta/2.0);
  }
  _lastSteps = steps;
 }
 function celebrateWorkout() as Void {
  if (!_visible || _sleeping) { _pendingCelebration = true; return; }
  _pendingCelebration = false;
  _event = 2; _age = 0.0;
  WatchUi.requestUpdate();
 }
 function syncDisplayMode() as Void {
  if (_visible && System.getDisplayMode() == System.DISPLAY_MODE_HIGH_POWER) { onExitSleep(); }
  else { onEnterSleep(); }
 }
 function onExitSleep() as Void {
  if (!_visible || !_sleeping) { return; }
  _sleeping = false; _last = System.getTimer(); _sampleAge = 0.0;
  _showClock = true; _clockAge = 0.0; _blinkAge = -1.0; _nextBlink = _time+3.0;
  var clockTime = System.getClockTime();
  _clockMinuteAngle = clockTime.min*Math.PI/30-Math.PI/2;
  _clockHourAngle = ((clockTime.hour % 12)+clockTime.min/60.0)*Math.PI/6-Math.PI/2;
  _clockHourSide = Math.cos(_clockHourAngle)*87 <= Math.cos(_clockMinuteAngle)*124 ? -1 : 1;
  sampleContext();
  if (_pendingCelebration) { celebrateWorkout(); }
  else if (Math.rand() % 2 == 0) { _event = 2; _age = 0.0; }
  else {
   _wakeAngle = (Math.rand() % 6284)/1000.0;
   _wakeExplore = (Math.rand() % 2) == 0;
   _event = 1; _age = 0.0;
  }
  _timer.start(self.method(:tick), 50, true); WatchUi.requestUpdate();
 }
 function onEnterSleep() as Void { _sleeping = true; _timer.stop(); WatchUi.requestUpdate(); }
 private function clamp(v) { return v < 0 ? 0.0 : (v > 1 ? 1.0 : v); }
 private function signed(v) { return v < -1 ? -1.0 : (v > 1 ? 1.0 : v); }
 private function smooth(v) { var k = clamp(v); return k*k*(3-2*k); }
 private function putState(id) as Void { for (var i = 0; i < 13; i++) { _target[i] = _states[id][i]; } }
 private function eventPose() as Void {
  if (_event == 1) {
   if (_age < .24) { putState(0); _target[12] = .04; }
   else if (_age < 5) {
    putState(1);
    var angle = _wakeAngle + (_wakeExplore ? Math.sin((_age-.24)*3.1)*.17 : 0.0);
    _target[0] = 78; _target[1] = 78; _target[2] = 48; _target[3] = 48;
    _target[10] = Math.cos(angle)*96; _target[11] = Math.sin(angle)*.92;
   } else if (_age < 6.2) { putState(7); }
   else { _event = 0; }
  } else if (_event == 2) {
   if (_age < .22) { putState(1); _target[9] = 7; }
   else if (_age < .8) { putState(3); _target[9] = -17; }
   else if (_age < 2.2) { putState(6); _target[9] = -9; }
   else { _event = 0; }
  }
 }
 function tick() as Void {
  if (_sleeping) { return; }
  var now = System.getTimer(); var dt = (now-_last)/1000.0; _last = now;
  if (dt < 0) { dt = 0.0; } if (dt > .1) { dt = .1; }
  _sampleAge += dt;
  if (_sampleAge >= 1.0) { _sampleAge = 0.0; sampleContext(); }
  _stepEnergy = _stepEnergy > dt*.35 ? _stepEnergy-dt*.35 : 0.0;
  var bpm = _heartRate != null ? _heartRate : 75.0;
  var follow = 1-Math.pow(2.7182818,-dt*4);
  var fastDecay = Math.pow(2.7182818,-18*dt);
  var slowDecay = Math.pow(2.7182818,-9*dt);
  _bpm += (bpm-_bpm)*follow;
  _activity += (_stepEnergy-_activity)*follow;
  _night += (_nightInput-_night)*follow;
  var energy = clamp((_bpm-75)/85); var quiet = _night*(1-_activity);
  var speed = (.7+energy*1.1+_activity*1.3)*(1-quiet*.65);
  _time += dt; _phase += dt*speed;
  if (_showClock) {
   _clockAge += dt; _age = 0.0;
   if (_clockAge >= 2.25) { _showClock = false; }
  } else { _age += dt; }
  putState(_showClock ? 0 : (quiet > .6 ? 5 : (_activity > .5 ? 2 : (energy > .6 ? 3 : 0))));
  if (_event != 0 && !_showClock) { eventPose(); }
  for (var i = 0; i < 13; i++) {
   var omega = i == 10 ? 9.0 : 18.0;
   var decay = i == 10 ? slowDecay : fastDecay;
   var d = _pose[i]-_target[i]; var j = (_velocity[i]+omega*d)*dt;
   _velocity[i] = (_velocity[i]-omega*j)*decay;
   _pose[i] = _target[i]+(d+j)*decay;
  }
  if (_event == 2 && !_showClock) {
   var swell = smooth(_age/.22)*(1-smooth((_age-1.75)/.45));
   _wobbleAngle = Math.sin(_age*16)*.14*swell;
   _wobbleX = Math.sin(_age*8)*15*swell;
   _wobbleY = Math.sin(_age*13)*8*swell;
  } else {
   var decayWobble = Math.pow(2.7182818,-dt*13);
   _wobbleAngle *= decayWobble; _wobbleX *= decayWobble; _wobbleY *= decayWobble;
  }
  if (_blinkAge >= 0) { _blinkAge += dt; if (_blinkAge > .18) { _blinkAge = -1.0; } }
  else if (_time >= _nextBlink && quiet < .6) { _blinkAge = 0.0; _nextBlink = _time + 4.5 + Math.rand()%5; }
  var tx = Math.sin(_phase*.67)*.42; var ty = Math.sin(_phase*.41)*.18;
  var gd = Math.pow(2.7182818,-12*dt);
  var dx = _gx-tx; var jx = (_gvx+12*dx)*dt;
  _gvx = (_gvx-12*jx)*gd; _gx = tx+(dx+jx)*gd;
  var dy = _gy-ty; var jy = (_gvy+12*dy)*dt;
  _gvy = (_gvy-12*jy)*gd; _gy = ty+(dy+jy)*gd;
  WatchUi.requestUpdate();
 }
 function onUpdate(dc as Graphics.Dc) as Void {
  dc.setColor(0x000000,0x000000); dc.clear();
  if (_sleeping) { return; }
  dc.setAntiAlias(true); dc.setColor(0xE8F3EC,0x000000);
  if (_showClock && _clockAge < 1.95) { drawClockHands(dc); return; }
  var p = _pose;
  var blink = 1.0;
  if (_blinkAge >= 0) {
   var k = _blinkAge/.18;
   blink = k < .43 ? 1-.94*smooth(k/.43) : .06+.94*smooth((k-.43)/.57);
  }
  blink *= p[12];
  if (_showClock) { blink *= .085+.915*smooth((_clockAge-1.95)/.3); }
  _eyes.setup(dc,_wobbleX,_wobbleY,_wobbleAngle);
  var yaw = _showClock ? 0.0 : signed(p[10]/104)*1.16+_gx*.16;
  var pitch = _showClock ? 0.0 : signed(p[11])*1.02+_gy*.08;
  var rise = signed(p[11]); if (rise < 0) { rise = -rise; }
  var y = (-18+p[9])*(1-rise)+184*Math.sin(pitch);
  var spread = _event == 2 ? 12.0*smooth((_age-.8)/.25)*(1-smooth((_age-1.9)/.3)) : 0.0;
  _eyes.eye(dc,-1,y,p[2],p[0]*blink,p[4],p[6]*blink,yaw,pitch,p[8],spread);
  _eyes.eye(dc,1,y,p[3],p[1]*blink,p[5],p[7]*blink,yaw,pitch,p[8],spread);
  _eyes.maskEdge(dc);
 }
 private function drawClockHands(dc as Graphics.Dc) as Void {
  var k = smooth((_clockAge-1.4)/.55);
  var scale = dc.getWidth()/390.0;
  var cx = dc.getWidth()/2.0; var cy = dc.getHeight()/2.0;
  dc.setPenWidth(7*scale);
  for (var i=0; i<2; i++) {
   var angle = i == 0 ? _clockHourAngle : _clockMinuteAngle;
   var length = i == 0 ? 87.0 : 124.0;
   var side = i == 0 ? _clockHourSide : -_clockHourSide;
   var ux = Math.cos(angle); var uy = Math.sin(angle);
   var sx = ux*length/2; var sy = uy*length/2;
   var tx = side*49.0; var ty = -18.0;
   var px = cubic(sx,sx+ux*26+side*8,tx-side*22,tx,k);
   var py = cubic(sy,sy+uy*26,ty-24,ty,k);
   var turn = Math.atan2(-Math.sin(angle),Math.cos(angle));
   if (turn > Math.PI/2) { turn -= Math.PI; }
   else if (turn < -Math.PI/2) { turn += Math.PI; }
   var direction = angle+turn*k;
   var half = (length+(42-length)*k)/2;
   var dx = Math.cos(direction)*half; var dy = Math.sin(direction)*half;
   dc.drawLine(cx+(px-dx)*scale,cy+(py-dy)*scale,cx+(px+dx)*scale,cy+(py+dy)*scale);
   dc.fillCircle(cx+(px-dx)*scale,cy+(py-dy)*scale,3.5*scale);
   dc.fillCircle(cx+(px+dx)*scale,cy+(py+dy)*scale,3.5*scale);
  }
 }
 private function cubic(a,b,c,d,t) { var q=1-t; return q*q*q*a+3*q*q*t*b+3*q*t*t*c+t*t*t*d; }
}
