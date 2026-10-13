/* Run via After Effects > File > Scripts > Run Script File.
   Keep this file beside ../orbit-motion.js. Adds one native editable Shape Layer comp. */
(function () {
    var WIDTH = 454, FPS = 30, SCALE = WIDTH / 390;
    var COLOR = [232 / 255, 243 / 255, 236 / 255];
    var source = File(File($.fileName).parent.parent.fsName + "/orbit-motion.js");
    if (!source.exists) { alert("Missing orbit-motion.js beside ae-handoff."); return; }
    $.evalFile(source);
    var motion = $.global.EmoteOrbit;
    if (!motion) { alert("Could not load orbit-motion.js."); return; }
    function center(layer, x, y) {
        layer.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
    }
    function pathShape(points) {
        var p = new Shape();
        p.vertices = [[points[0] * SCALE, points[1] * SCALE], [points[6] * SCALE, points[7] * SCALE]];
        p.outTangents = [[(points[2] - points[0]) * SCALE, (points[3] - points[1]) * SCALE], [0, 0]];
        p.inTangents = [[0, 0], [(points[4] - points[6]) * SCALE, (points[5] - points[7]) * SCALE]];
        p.closed = false;
        return p;
    }
    function addDisk(comp) {
        var layer = comp.layers.addShape();
        layer.name = "SCREEN | black circular field";
        var group = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var contents = group.property("ADBE Vectors Group");
        contents.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([WIDTH, WIDTH]);
        contents.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue([0, 0, 0]);
        center(layer, WIDTH / 2, WIDTH / 2);
    }
    function addGuide(comp) {
        var layer = comp.layers.addShape();
        layer.name = "GUIDE | safe inset | not rendered";
        var group = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var contents = group.property("ADBE Vectors Group");
        contents.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([WIDTH - 40, WIDTH - 40]);
        contents.addProperty("ADBE Vector Graphic - Stroke");
        var stroke = contents.property(2);
        stroke.property("ADBE Vector Stroke Color").setValue([.32, .43, .36]);
        stroke.property("ADBE Vector Stroke Width").setValue(1);
        center(layer, WIDTH / 2, WIDTH / 2);
        layer.guideLayer = true;
    }
    function addHand(comp, hand) {
        var layer = comp.layers.addShape();
        layer.name = hand.index === 0 ? "HOUR | to right eye | cubic path" : "MINUTE | to left eye | cubic path";
        var group = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        group.name = "Orbiting hand";
        var contents = group.property("ADBE Vectors Group");
        contents.addProperty("ADBE Vector Shape - Group");
        contents.addProperty("ADBE Vector Graphic - Stroke");
        var path = contents.property(1).property("ADBE Vector Shape");
        var stroke = contents.property(2);
        stroke.property("ADBE Vector Stroke Color").setValue(COLOR);
        stroke.property("ADBE Vector Stroke Line Cap").setValue(2);
        stroke.property("ADBE Vector Stroke Width").setValue(7 * SCALE);
        for (var i = 0; i <= 25; i++) {
            var t = i / FPS;
            path.setValueAtTime(t, pathShape(motion.poseAt(hand, t)));
        }
        center(layer, WIDTH / 2, WIDTH / 2);
        layer.outPoint = motion.closedAt;
    }
    function addEye(comp, side) {
        var layer = comp.layers.addShape();
        layer.name = side < 0 ? "LEFT EYE | minute | rounded vector" : "RIGHT EYE | hour | rounded vector";
        var group = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var contents = group.property("ADBE Vectors Group");
        contents.addProperty("ADBE Vector Shape - Rect");
        contents.addProperty("ADBE Vector Graphic - Fill");
        var rect = contents.property(1), fill = contents.property(2);
        var size = rect.property("ADBE Vector Rect Size");
        var roundness = rect.property("ADBE Vector Rect Roundness");
        fill.property("ADBE Vector Fill Color").setValue(COLOR);
        center(layer, WIDTH / 2 + side * 49 * SCALE, WIDTH / 2 - 18 * SCALE);
        var rotation = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
        layer.inPoint = motion.closedAt;
        for (var i = 0; i <= 5; i++) {
            var t = motion.closedAt + i / FPS, open = motion.eyeOpen(t);
            var height = 7 + 75 * open;
            size.setValueAtTime(t, [49 * SCALE, height * SCALE]);
            roundness.setValueAtTime(t, Math.min(24.5, height / 2) * SCALE);
            rotation.setValueAtTime(t, side * .06 * open * 180 / Math.PI);
        }
    }
    app.beginUndoGroup("Emote one-second orbit");
    try {
        if (!app.project) { app.newProject(); }
        var input = prompt("Clock pose (HH:MM):", "06:30");
        if (input === null) { return; }
        var match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(input);
        if (!match) { alert("Use HH:MM, for example 06:30."); return; }
        var name = "Emote_" + input.replace(":", "-") + "_ORBIT_1S";
        for (var n = 1; n <= app.project.numItems; n++) {
            if (app.project.item(n).name === name) { alert("Composition already exists: " + name); return; }
        }
        var minutes = Number(match[1]) * 60 + Number(match[2]);
        var hands = motion.handsAt(minutes);
        var comp = app.project.items.addComp(name, WIDTH, WIDTH, 1, 1.25, FPS);
        comp.bgColor = [0, 0, 0];
        addDisk(comp); addGuide(comp);
        addHand(comp, hands[0]); addHand(comp, hands[1]);
        addEye(comp, -1); addEye(comp, 1);
        comp.openInViewer();
        alert("One-second orbit composition created. Save a new .aep copy for review.");
    } catch (error) {
        alert("Orbit setup stopped at line " + error.line + ": " + error.toString());
    } finally {
        app.endUndoGroup();
    }
})();
