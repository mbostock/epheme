eo.tween = function(a, b) {
  var u = eo_tween_digits.exec(a)[1];
  a = parseFloat(a);
  b = parseFloat(b) - a;
  return u.length
      ? function() { return a + b * eo.time + u; }
      : function() { return a + b * eo.time; };
};

var eo_tween_digits = /[-+]?\d*\.?\d*(?:[eE]\d+)?(.*)/;

var eo_tween_rgb = {
  "background": 1,
  "fill": 1,
  "stroke": 1
};

function eo_tween(n) {
  return n in eo_tween_rgb || /\bcolor\b/.test(n) ? eo.tweenRgb : eo.tween;
}

eo.tweenRgb = function(a, b) {
  a = eo.rgb(a);
  b = eo.rgb(b);
  var ar = a.r,
      ag = a.g,
      ab = a.b,
      br = b.r - ar,
      bg = b.g - ag,
      bb = b.b - ab;
  return function() {
    var t = eo.time;
    return "rgb(" + Math.round(ar + br * t)
        + "," + Math.round(ag + bg * t)
        + "," + Math.round(ab + bb * t)
        + ")";
  };
};
