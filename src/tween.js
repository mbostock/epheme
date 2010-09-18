eo.tween = function(a, b) {
  if (typeof a != "number" || typeof b != "number") {
    var u = eo_tween_digits.exec(a);
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

var eo_tween_digits = /[-+]?\d*\.?\d*(?:[eE]\d+)?(.*)/;
