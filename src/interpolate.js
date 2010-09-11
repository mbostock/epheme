eo.interpolate = function(a, b) {
  if (typeof a != "number" || typeof b != "number") {
    var u = eo_interpolate_digits.exec(a);
    a = parseFloat(a);
    b = parseFloat(b);
    if (u) {
      u = u[1];
      return function() {
        var t = eo.time;
        return a * (1 - t) + b * t + u;
      };
    }
  }
  return function() {
    var t = eo.time;
    return a * (1 - t) + b * t;
  };
};

eo.interpolateRgb = function(a, b) {
  a = eo.rgb(a);
  b = eo.rgb(b);
  return function() {
    var t = eo.time,
        q = 1 - t;
    return "rgb(" + Math.round(a.r * q + b.r * t)
        + "," + Math.round(a.g * q + b.g * t)
        + "," + Math.round(a.b * q + b.b * t)
        + ")";
  };
};

var eo_interpolate_digits = /[-+]?\d*\.?\d*(?:[eE]\d+)?(.*)/;
