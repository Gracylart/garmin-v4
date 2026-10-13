/* Emote clock-to-eyes AE handoff. Run with File > Scripts > Run Script File.
   Creates native, editable Shape Layers. No footage or plugins required.
   Snapshot: 06:30, arc 13, bend 17, anticipation 6, stagger 35 ms,
   rotation lag 12%, shortening lag 20%, thickness 2, duration .70 s,
   quick departure. Baseline is the current Garmin/browser choreography. */
(function () {
    var WIDTH = 454, HEIGHT = 454, FPS = 30, SCALE = 454 / 390;
    var HOLD = 1.4, OPEN = .3, LENGTH_HOUR = 87, LENGTH_MINUTE = 124;
    var COLOR = [232 / 255, 243 / 255, 236 / 255];
    var candidate = {
        arc: 13, bend: 17, anticipation: 6, stagger: .035,
        rotationLag: .12, lengthLag: .20, thickness: 2,
        duration: .70, easing: "quick"
    };
    function clamp(n) { return Math.max(0, Math.min(1, n)); }
    function smooth(n) { var x = clamp(n); return x * x * (3 - 2 * x); }
    function cubic(a, b, c, d, t) {
        var q = 1 - t;
        return q * q * q * a + 3 * q * q * t * b + 3 * q * t * t * c + t * t * t * d;
    }
    function ease(n, mode) {
        var x = clamp(n);
        if (mode === "quick") { return 1 - Math.pow(1 - x, 3); }
        if (mode === "poised") { return Math.pow(smooth(x), 1.45); }
        return x * x * x * (x * (x * 6 - 15) + 10);
    }
    function handsAt(minutes) {
        var hour = (minutes % 720) / 720 * Math.PI * 2 - Math.PI / 2;
        var minute = (minutes % 60) / 60 * Math.PI * 2 - Math.PI / 2;
        var hourSide = Math.cos(hour) * LENGTH_HOUR <= Math.cos(minute) * LENGTH_MINUTE ? -1 : 1;
        return [
            { angle: hour, length: LENGTH_HOUR, side: hourSide },
            { angle: minute, length: LENGTH_MINUTE, side: -hourSide }
        ];
    }
    function segment(hand, t, options) {
        var angle = hand.angle, length = hand.length, side = hand.side;
        var ux = Math.cos(angle), uy = Math.sin(angle), u = clamp(t);
        var k = options ? ease(u, options.easing) : smooth(u);
        var sx = ux * length / 2, sy = uy * length / 2, tx = side * 49, ty = -18;
        var cx = cubic(sx, sx + ux * 26 + side * 8, tx - side * 22, tx, k);
        var cy = cubic(sy, sy + uy * 26, ty - 24, ty, k);
        if (options) {
            var vx = tx - sx, vy = ty - sy, dist = Math.sqrt(vx * vx + vy * vy) || 1;
            var arcSign = (-vy / dist) * side < 0 ? -1 : 1;
            var bulge = Math.sin(Math.PI * k) * options.arc * arcSign;
            cx += -vy / dist * bulge;
            cy += vx / dist * bulge;
            var prep = u < .22 ? options.anticipation * Math.pow(Math.sin(Math.PI * u / .22), 2) : 0;
            cx -= vx / dist * prep;
            cy -= vy / dist * prep;
        }
        var turn = Math.atan2(Math.sin(-angle), Math.cos(-angle));
        if (turn > Math.PI / 2) { turn -= Math.PI; }
        else if (turn < -Math.PI / 2) { turn += Math.PI; }
        var rotation = options ? ease((u - options.rotationLag) / (1 - options.rotationLag), options.easing) : k;
        var shortening = options ? ease((u - options.lengthLag) / (1 - options.lengthLag), options.easing) : k;
        var direction = angle + turn * rotation;
        var half = (length + (42 - length) * shortening) / 2;
        var dx = Math.cos(direction) * half, dy = Math.sin(direction) * half;
        var bend = options ? options.bend * Math.sin(Math.PI * u) * side : 0;
        return {
            x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy,
            cx: cx, cy: cy,
            controlX: cx - Math.sin(direction) * bend,
            controlY: cy + Math.cos(direction) * bend,
            width: 7 + (options ? options.thickness * Math.sin(Math.PI * u) : 0)
        };
    }
    function centerLayer(layer, x, y) {
        layer.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
    }
    function makePath(pose) {
        var path = new Shape();
        var x1 = pose.x1 * SCALE, y1 = pose.y1 * SCALE;
        var x2 = pose.x2 * SCALE, y2 = pose.y2 * SCALE;
        var cx = pose.controlX * SCALE, cy = pose.controlY * SCALE;
        path.vertices = [[x1, y1], [x2, y2]];
        path.inTangents = [[0, 0], [2 * (cx - x2) / 3, 2 * (cy - y2) / 3]];
        path.outTangents = [[2 * (cx - x1) / 3, 2 * (cy - y1) / 3], [0, 0]];
        path.closed = false;
        return path;
    }
    function addDisk(comp) {
        var layer = comp.layers.addShape();
        layer.name = "SCREEN | round 454 px | black";
        var group = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        group.name = "Circular AMOLED field";
        var contents = group.property("ADBE Vectors Group");
        var ellipse = contents.addProperty("ADBE Vector Shape - Ellipse");
        ellipse.property("ADBE Vector Ellipse Size").setValue([WIDTH, HEIGHT]);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([0, 0, 0]);
        centerLayer(layer, WIDTH / 2, HEIGHT / 2);
    }
    function addGuide(comp) {
        var layer = comp.layers.addShape();
        layer.name = "GUIDE | 20 px safe inset | not rendered";
        var group = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var contents = group.property("ADBE Vectors Group");
        contents.addProperty("ADBE Vector Shape - Ellipse")
            .property("ADBE Vector Ellipse Size").setValue([WIDTH - 40, HEIGHT - 40]);
        var stroke = contents.addProperty("ADBE Vector Graphic - Stroke");
        stroke.property("ADBE Vector Stroke Color").setValue([.32, .43, .36]);
        stroke.property("ADBE Vector Stroke Width").setValue(1);
        centerLayer(layer, WIDTH / 2, HEIGHT / 2);
        layer.guideLayer = true;
    }
    function addHand(comp, hand, index, duration, options, existingLayer) {
        var layer = existingLayer || comp.layers.addShape();
        layer.name = index === 0 ? "HOUR | editable vector path" : "MINUTE | editable vector path";
        var group = existingLayer ? layer.property("ADBE Root Vectors Group").property(1)
            : layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        if (!existingLayer) { group.name = "Morphing hand"; }
        var contents = group.property("ADBE Vectors Group");
        if (!existingLayer) {
            contents.addProperty("ADBE Vector Shape - Group");
            contents.addProperty("ADBE Vector Graphic - Stroke");
        }
        var path = contents.property(1).property("ADBE Vector Shape");
        var stroke = contents.property(2);
        stroke.property("ADBE Vector Stroke Color").setValue(COLOR);
        stroke.property("ADBE Vector Stroke Line Cap").setValue(2);
        var width = stroke.property("ADBE Vector Stroke Width");
        var first = makePath(segment(hand, 0, options));
        path.setValueAtTime(0, first);
        path.setValueAtTime(HOLD, first);
        width.setValueAtTime(0, 7 * SCALE);
        width.setValueAtTime(HOLD, 7 * SCALE);
        var count = Math.ceil(duration * FPS);
        for (var i = 1; i <= count; i++) {
            var t = i / count, local = t;
            if (options && index === 1) {
                local = clamp((duration * t - options.stagger) / (duration - options.stagger));
            }
            var state = segment(hand, local, options);
            path.setValueAtTime(HOLD + duration * t, makePath(state));
            width.setValueAtTime(HOLD + duration * t, state.width * SCALE);
        }
        centerLayer(layer, WIDTH / 2, HEIGHT / 2);
        layer.outPoint = HOLD + duration;
    }
    function addEye(comp, side, start) {
        var layer = comp.layers.addShape();
        layer.name = side < 0 ? "LEFT EYE | editable rounded rectangle" : "RIGHT EYE | editable rounded rectangle";
        var group = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        group.name = "Soft eye";
        var contents = group.property("ADBE Vectors Group");
        contents.addProperty("ADBE Vector Shape - Rect");
        contents.addProperty("ADBE Vector Graphic - Fill");
        var rect = contents.property(1);
        var size = rect.property("ADBE Vector Rect Size");
        var roundness = rect.property("ADBE Vector Rect Roundness");
        var fill = contents.property(2);
        fill.property("ADBE Vector Fill Color").setValue(COLOR);
        centerLayer(layer, WIDTH / 2 + side * 49 * SCALE, HEIGHT / 2 - 18 * SCALE);
        var rotation = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
        layer.inPoint = start;
        for (var i = 0; i <= 9; i++) {
            var t = i / 9, k = smooth(t), height = 7 + 75 * k;
            var at = start + OPEN * t;
            size.setValueAtTime(at, [49 * SCALE, height * SCALE]);
            roundness.setValueAtTime(at, Math.min(24.5, height / 2) * SCALE);
            rotation.setValueAtTime(at, side * .06 * k * 180 / Math.PI);
        }
    }
    function makeComp(name, hands, duration, options) {
        var comp = null;
        for (var itemIndex = 1; itemIndex <= app.project.numItems; itemIndex++) {
            if (app.project.item(itemIndex).name === name) {
                comp = app.project.item(itemIndex);
                break;
            }
        }
        var partial = comp && comp.numLayers === 3 && comp.layer(1).name === "HOUR | editable vector path";
        if (comp && !partial) { throw new Error("A complete comp with this name already exists: " + name); }
        if (!comp) { comp = app.project.items.addComp(name, WIDTH, HEIGHT, 1, 3, FPS); }
        comp.bgColor = [0, 0, 0];
        if (!partial) {
            addDisk(comp);
            addGuide(comp);
        }
        addHand(comp, hands[0], 0, duration, options, partial ? comp.layer(1) : null);
        addHand(comp, hands[1], 1, duration, options);
        addEye(comp, -1, HOLD + duration);
        addEye(comp, 1, HOLD + duration);
        comp.openInViewer();
        return comp;
    }
    app.beginUndoGroup("Emote clock to eyes 454");
    try {
        if (!app.project) { app.newProject(); }
        var input = prompt("Clock pose (HH:MM). The motion remains editable after creation:", "06:30");
        if (input === null) { return; }
        var match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(input);
        if (!match) { alert("Use HH:MM, for example 06:30."); return; }
        var minutes = Number(match[1]) * 60 + Number(match[2]);
        var hands = handsAt(minutes);
        var suffix = input.replace(":", "-");
        makeComp("Emote_" + suffix + "_CURRENT", hands, .55, null);
        makeComp("Emote_" + suffix + "_AE_EDIT", hands, candidate.duration, candidate);
        alert("Created two editable 454x454 comps. Save this project as an .aep file.");
    } catch (error) {
        alert("Emote AE setup stopped at line " + error.line + ": " + error.toString());
    } finally {
        app.endUndoGroup();
    }
})();
