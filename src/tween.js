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
  return n in eo_tween_rgb || /\bcolor\b/.test(n) ? eo.rgb.tween : eo.tween;
}
