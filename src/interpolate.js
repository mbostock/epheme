eo.interpolate = function(a, b) {
  if (typeof a != "number" || typeof b != "number") {
    var u = eo_interpolate_digits.exec(a);
    a = parseFloat(a);
    b = parseFloat(b) - a;
    if (u) {
      u = u[1];
      return function() {
        return a + b * eo.time + u;
      };
    }
  }
  b -= a;
  return function() {
    return a + b * eo.time;
  };
};

eo.interpolateRgb = function(a, b) {
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

var eo_interpolate_digits = /[-+]?\d*\.?\d*(?:[eE]\d+)?(.*)/;
