eo.interpolate = function(a, b) {
  var u = eo_interpolate_digits.exec(a)[1];
  a = parseFloat(a);
  b = parseFloat(b) - a;
  return u.length
      ? function(t) { return a + b * t + u; }
      : function(t) { return a + b * t; };
};

eo.interpolateRgb = function(a, b) {
  a = eo_rgb(a);
  b = eo_rgb(b);
  var ar = a.r,
      ag = a.g,
      ab = a.b,
      br = b.r - ar,
      bg = b.g - ag,
      bb = b.b - ab;
  return function(t) {
    return "rgb(" + Math.round(ar + br * t)
        + "," + Math.round(ag + bg * t)
        + "," + Math.round(ab + bb * t)
        + ")";
  };
};

eo.interpolateArray = function(a, b) {
  var x = [],
      c = [],
      na = a.length,
      nb = b.length,
      n0 = Math.min(a.length, b.length),
      i,
      va,
      vb;
  for (i = 0; i < n0; ++i) {
    va = a[i];
    vb = b[i];
    x.push(typeof va === "object"
        ? eo.interpolateObject(va, vb)
        : eo.interpolate(va, vb));
  }
  for (; i < na; ++i) c[i] = a[i];
  for (; i < nb; ++i) c[i] = b[i];
  return function(t) {
    for (i = 0; i < n0; ++i) c[i] = x[i](t);
    return c;
  };
};

eo.interpolateObject = function(a, b) {
  if (a instanceof Array) return eo.interpolateArray(a, b);
  var i = {},
      c = {},
      k,
      va,
      vb;
  for (k in a) {
    if (k in b) {
      va = a[k];
      vb = b[k];
      i[k] = typeof va === "object"
          ? eo.interpolateObject(va, vb)
          : eo_interpolateByName(k)(va, vb);
    } else {
      c[k] = a[k];
    }
  }
  for (k in b) {
    if (!(k in a)) {
      c[k] = b[k];
    }
  }
  return function(t) {
    for (k in i) c[k] = i[k](t);
    return c;
  };
}

var eo_interpolate_digits = /[-+]?\d*\.?\d*(?:[eE][-]?\d+)?(.*)/,
    eo_interpolate_rgb = {background: 1, fill: 1, stroke: 1};

function eo_interpolateByName(n) {
  return n in eo_interpolate_rgb || /\bcolor\b/.test(n) ? eo.interpolateRgb : eo.interpolate;
}
