/* Clock hands to eyes: 1 second, 390-unit design space. ES5 for After Effects. */
(function (root) {
    var CLOSED_AT = 25 / 30;
    var OPEN_TIME = 1 - CLOSED_AT;
    var HOUR = [
        [.20, [-7,-33, -7,-51, -6,-70, -5,-86]],
        [.33, [-56,-69, -64,-79, -72,-89, -80,-100]],
        [.50, [-70,-77, -61,-86, -44,-88, -34,-78]],
        [.60, [-37,-63, -70,-66, -83,-37, -52,-30]],
        [.70, [-50,-41, -75,-6, -30,-16, -10,-18]],
        [.76, [-21,-21, -7,-19, 7,-19, 21,-21]],
        [CLOSED_AT, [24.5,-18, 40.833333,-18, 57.166667,-18, 73.5,-18]]
    ];
    var MINUTE = [
        [.20, [3,-2, 4,18, 4,39, 4,58]],
        [.33, [51,-43, 53,-62, 55,-81, 56,-99]],
        [.50, [49,-78, 62,-88, 73,-84, 80,-76]],
        [.60, [54,-64, 84,-67, 88,-38, 57,-29]],
        [.70, [58,-41, 75,-8, 30,-15, 10,-18]],
        [.76, [-21,-20, -7,-21, 7,-21, 21,-20]],
        [CLOSED_AT, [-73.5,-18, -57.166667,-18, -40.833333,-18, -24.5,-18]]
    ];
    function clamp(n) { return Math.max(0, Math.min(1, n)); }
    function smooth(n) { var x = clamp(n); return x * x * (3 - 2 * x); }
    function makeHand(index, angle, length) {
        var x = Math.cos(angle) * length, y = Math.sin(angle) * length;
        var start = [0,0, x/3,y/3, x*2/3,y*2/3, x,y];
        return { index: index, angle: angle, length: length,
            keys: [[0, start]].concat(index === 0 ? HOUR : MINUTE) };
    }
    function handsAt(minutes) {
        var hour = (minutes % 720) / 720 * Math.PI * 2 - Math.PI / 2;
        var minute = (minutes % 60) / 60 * Math.PI * 2 - Math.PI / 2;
        return [makeHand(0, hour, 87), makeHand(1, minute, 124)];
    }
    function poseAt(hand, time) {
        var keys = hand.keys, t = Math.max(0, Math.min(CLOSED_AT, time));
        if (t === 0) { return keys[0][1].slice(); }
        if (t === CLOSED_AT) { return keys[keys.length - 1][1].slice(); }
        var i = 0;
        while (t > keys[i + 1][0]) { i++; }
        var a = keys[i], b = keys[i + 1], span = b[0] - a[0];
        var u = (t - a[0]) / span, u2 = u * u, u3 = u2 * u;
        var out = [];
        for (var j = 0; j < 8; j++) {
            var da = i === 0 ? 0 : .78 * (b[1][j] - keys[i - 1][1][j]) / (b[0] - keys[i - 1][0]);
            var db = i + 1 === keys.length - 1 ? 0 :
                .78 * (keys[i + 2][1][j] - a[1][j]) / (keys[i + 2][0] - a[0]);
            out[j] = (2*u3 - 3*u2 + 1)*a[1][j] + (u3 - 2*u2 + u)*span*da +
                (-2*u3 + 3*u2)*b[1][j] + (u3 - u2)*span*db;
        }
        return out;
    }
    var api = { closedAt: CLOSED_AT, openTime: OPEN_TIME, handsAt: handsAt,
        poseAt: poseAt, eyeOpen: function (t) { return smooth((t - CLOSED_AT) / OPEN_TIME); } };
    root.EmoteOrbit = api;
    if (typeof $ !== 'undefined' && $.global) { $.global.EmoteOrbit = api; }
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})(this);
