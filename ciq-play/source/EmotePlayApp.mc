import Toybox.Application;
import Toybox.ActivityMonitor;
import Toybox.Background;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

class EmotePlayApp extends Application.AppBase {
 private var _view;
 private var _pendingCelebration = false;
 function initialize() { AppBase.initialize(); }
 function onStart(state) as Void {
  Background.registerForStepsEvent();
  Background.registerForActivityCompletedEvent();
 }
 function getServiceDelegate() { return [new PlayEvents()]; }
 function onBackgroundData(data) as Void {
  if (data != 1) { return; }
  if (_view != null) { _view.queueCelebration(); }
  else { _pendingCelebration=true; }
 }
 function getInitialView() {
  _view = new PlayView();
  if (_pendingCelebration) { _view.queueCelebration(); _pendingCelebration=false; }
  return [_view, new PlayInput(_view)];
 }
 function onDisplayModeChanged() as Void { if (_view != null) { _view.displayModeChanged(); } }
}

(:background)
class PlayEvents extends System.ServiceDelegate {
 function initialize() { ServiceDelegate.initialize(); }
 function onSteps() as Void {
  var steps=ActivityMonitor.getInfo().steps;
  Background.exit(steps != null && steps >= 1000 && steps < 2000 ? 1 : null);
 }
 function onActivityCompleted(activity) as Void { Background.exit(1); }
}

class PlayInput extends WatchUi.InputDelegate {
 private var _view;
 function initialize(view) { InputDelegate.initialize(); _view = view; }
 function onTap(event as WatchUi.ClickEvent) as Lang.Boolean { _view.tap(event.getCoordinates()); return true; }
 function onDrag(event as WatchUi.DragEvent) as Lang.Boolean { _view.drag(event.getCoordinates(),event.getType()); return true; }
 function onSwipe(event as WatchUi.SwipeEvent) as Lang.Boolean { _view.swipe(event.getDirection()); return true; }
 function onFlick(event as WatchUi.FlickEvent) as Lang.Boolean { return true; }
}
