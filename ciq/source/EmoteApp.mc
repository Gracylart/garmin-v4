import Toybox.Application;
import Toybox.Background;
import Toybox.System;
import Toybox.WatchUi;

class EmoteApp extends Application.AppBase {
 private var _view;
 private var _pendingWorkout = false;
 function initialize() { AppBase.initialize(); }
 function onStart(state) as Void { Background.registerForActivityCompletedEvent(); }
 function getServiceDelegate() { return [new WorkoutCompleteService()]; }
 function onBackgroundData(data) as Void {
  if (data != 1) { return; }
  if (_view != null) { _view.celebrateWorkout(); }
  else { _pendingWorkout = true; }
 }
 function getInitialView() {
  _view = new EmoteView();
  if (_pendingWorkout) { _view.celebrateWorkout(); _pendingWorkout = false; }
  return [_view];
 }
 function onDisplayModeChanged() as Void { if (_view != null) { _view.syncDisplayMode(); } }
}

(:background)
class WorkoutCompleteService extends System.ServiceDelegate {
 function initialize() { ServiceDelegate.initialize(); }
 function onActivityCompleted(activity) as Void { Background.exit(1); }
}
