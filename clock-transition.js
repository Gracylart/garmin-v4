/* Parametric capsule transition. Seconds; 390-unit design space; ES5 for CIQ/AE porting. */
(function (root) {
    var DURATION = 1, TRAVEL = .75;
    var DEFAULTS = { arc: .12, turn: .15, shrink: .30, stagger: .03, tempo: .35, elastic: .5 };
    function clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }
    function option(input, name, min, max) {
        var value = input && input[name];
        return typeof value === 'number' && isFinite(value) ? clamp(value, min, max) : DEFAULTS[name];
    }
    function settings(input) {
        return { arc: option(input, 'arc', 0, .24), turn: option(input, 'turn', 0, .60),
            shrink: option(input, 'shrink', 0, .60), stagger: option(input, 'stagger', 0, .06),
            tempo: option(input, 'tempo', 0, .70), elastic: option(input, 'elastic', 0, 1) };
    }
    function ease(u, bias) {
        u = clamp(u, 0, 1);
        u += bias * u * (1 - u);
        return u * u * u * (u * (u * 6 - 15) + 10);
    }
    function mix(a, b, p) { return a + (b - a) * p; }
    // A short impulse, not a persistent wobble. Smoothly zero at both boundaries.
    function impulse(t) {
        if (t <= 0 || t >= .18) { return 0; }
        return Math.sin(2*Math.PI*18*t) * (1-Math.exp(-t/.009)) * Math.exp(-t/.045) *
            (1-ease((t-.126)/.054, 0));
    }
    function bezier(p, q) {
        var v = 1 - q;
        return v*v*v*p[0] + 3*v*v*q*p[1] + 3*v*q*q*p[2] + q*q*q*p[3];
    }
    /* Start/end geometry and two derived path controls; no intermediate pose timeline. */
    function createNode(start, target, options, side, delay) {
        side = side === -1 ? -1 : 1;
        var opts = settings(options), dx = target.x - start.x, dy = target.y - start.y;
        var distance = Math.sqrt(dx*dx + dy*dy);
        var offset = Math.min(distance, 120) * opts.arc * side;
        var nx = distance > .001 ? -dy / distance : 0, ny = distance > .001 ? dx / distance : 0;
        var delta = ((target.angle - start.angle + Math.PI / 2) % Math.PI + Math.PI) % Math.PI - Math.PI / 2;
        if (Math.abs(Math.abs(delta) - Math.PI / 2) < 1e-8) { delta = -side * Math.PI / 2; }
        return { start: start, target: target, options: opts, delta: delta, delay: clamp(delay || 0, 0, .06),
            side: side, normalX: nx, normalY: ny, turnDuration: TRAVEL,
            pathX: [start.x, start.x + dx/3 + nx*offset, start.x + 2*dx/3 + nx*offset, target.x],
            pathY: [start.y, start.y + dy/3 + ny*offset, start.y + 2*dy/3 + ny*offset, target.y] };
    }
    function at(node, seconds) {
        var u = clamp((seconds - node.delay) / (TRAVEL - node.delay), 0, 1);
        var turnU = clamp((seconds-node.delay)/(node.turnDuration-node.delay), 0, 1);
        var p = ease(u, node.options.tempo), turn = ease(turnU, -node.options.turn);
        var shrink = ease(u, -node.options.shrink), open = ease((seconds - TRAVEL) / (DURATION - TRAVEL), 0);
        var fast = node.turnDuration < TRAVEL;
        // Shorten before the rapid turn so the two inner tips detach instead of joining into a smile.
        if (fast) { shrink = 1-(1-shrink)*(1-.55*ease(turnU*1.6, 0)); }
        var elastic = node.options.elastic * (impulse(seconds-node.delay-.025) + .65*impulse(seconds-.42));
        var width = mix(node.start.width, node.target.width, shrink);
        var height = mix(node.start.height, node.target.height, open);
        var bend = fast && turnU > 0 && turnU < 1 ?
            node.side * Math.cos(node.start.angle + node.delta*turn) * .085 * (width-height) *
            Math.pow(Math.sin(Math.PI*turnU), 2) : 0;
        width += 1.2*elastic;
        return { x: bezier(node.pathX, p) + .5*elastic*node.normalX,
            y: bezier(node.pathY, p) + .5*elastic*node.normalY,
            angle: node.start.angle + node.delta * turn + (node.target.tilt || 0) * open + .006*elastic,
            width: width, height: height, radius: Math.min(width, height) / 2,
            bend: bend + 1.1*elastic, progress: p };
    }
    function forTime(minutes, options) {
        if (typeof minutes !== 'number' || !isFinite(minutes)) { throw new Error('Clock time must be finite minutes.'); }
        minutes = ((minutes % 1440) + 1440) % 1440;
        var opts = settings(options), nodes = [], starts = [];
        for (var i = 0; i < 2; i++) {
            var angle = (i === 0 ? minutes % 720 / 720 : minutes % 60 / 60) * 2 * Math.PI - Math.PI/2;
            var length = i === 0 ? 87 : 124;
            starts.push({ x: Math.cos(angle)*length/2, y: Math.sin(angle)*length/2,
                angle: angle, width: length + 7, height: 7 });
        }
        // Preserve spatial order instead of forcing the hands to trade sides.
        var reverse = starts[0].x < starts[1].x - .001;
        for (var j = 0; j < 2; j++) {
            var side = (j === 0 ? 1 : -1) * (reverse ? -1 : 1);
            nodes.push(createNode(starts[j],
                { x: side*49, y: -18, angle: 0, width: 49, height: 82, tilt: side*.06 },
                opts, side, j * opts.stagger));
            if (reverse) { nodes[j].turnDuration = .2; }
        }
        return nodes;
    }
    var api = { duration: DURATION, travel: TRAVEL, defaults: DEFAULTS, settings: settings,
        createNode: createNode, forTime: forTime, at: at };
    root.ClockTransition = api;
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})(this);
