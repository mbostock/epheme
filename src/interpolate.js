eo.interpolate = function(a, b) {
  if (typeof a != "number" || typeof b != "number") {
    var u = eo_interpolate_digits.exec(a);
    a = parseFloat(a);
    b = parseFloat(b);
    if (u) {
      u = u[1];
      return function(t) {
        return a * (1 - t) + b * t + u;
      };
    }
  }
  return function(t) {
    return a * (1 - t) + b * t;
  };
};

eo.interpolateRgb = function(a, b) {
  a = eo.rgb(a);
  b = eo.rgb(b);
  return function(t) {
    var _t = 1 - t;
    return "rgb(" + Math.round(a.r * _t + b.r * t)
        + "," + Math.round(a.g * _t + b.g * t)
        + "," + Math.round(a.b * _t + b.b * t)
        + ")";
  };
};

var eo_interpolate_digits = /[-+]?\d*\.?\d*(?:[eE]\d+)?(.*)/;
