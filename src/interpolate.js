eo.interpolate = function(a, b) {
  if (typeof b == "number") return eo.interpolateNumber(+a, b);
  if (typeof b == "string") return eo.interpolateString(String(a), b);
  if (b instanceof Array) return eo.interpolateArray(a, b);
  return eo.interpolateObject(a, b);
};

eo.interpolateNumber = function(a, b) {
  b -= a;
  return function(t) { return a + b * t; };
};

eo.interpolateString = function(a, b) {
  var m, // current match
      i, // current index
      j, // current index (for coallescing)
      s0 = 0, // start index of current string prefix
      s1 = 0, // end index of current string prefix
      s = [], // string constants and placeholders
      q = [], // number interpolators
      n, // q.length
      o;

  // Find all numbers in b.
  for (i = 0; m = eo_interpolate_number.exec(b); ++i) {
    if (m.index) s.push(b.substring(s0, s1 = m.index));
    q.push({i: s.length, x: m[0]});
    s.push(null);
    s0 = eo_interpolate_number.lastIndex;
  }
  if (s0 < b.length) s.push(b.substring(s0));

  // Find all numbers in a.
  for (i = 0, n = q.length; (m = eo_interpolate_number.exec(a)) && i < n; ++i) {
    o = q[i];
    if (o.x == m[0]) { // The numbers match, so coallesce.
      if (s[o.i + 1] == null) { // This match is followed by another number.
        s[o.i - 1] += o.x;
        s.splice(o.i, 1);
        for (j = i + 1; j < n; ++j) q[j].i--;
      } else { // This match is followed by a string, so coallesce twice.
        s[o.i - 1] += o.x + s[o.i + 1];
        s.splice(o.i, 2);
        for (j = i + 1; j < n; ++j) q[j].i -= 2;
      }
      q.splice(i, 1);
      n--;
      i--;
    } else {
      o.x = eo.interpolateNumber(parseFloat(m[0]), parseFloat(o.x));
    }
  }

  // Special optimization for only a single match.
  if (s.length == 1) {
    return s[0] == null ? q[0].x : function() { return b; };
  }

  // Otherwise, interpolate each of the numbers and rejoin the string.
  return function(t) {
    for (i = 0; i < n; ++i) s[(o = q[i]).i] = o.x(t);
    return s.join("");
  };
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
      i;
  for (i = 0; i < n0; ++i) x.push(eo.interpolate(a[i], b[i]));
  for (; i < na; ++i) c[i] = a[i];
  for (; i < nb; ++i) c[i] = b[i];
  return function(t) {
    for (i = 0; i < n0; ++i) c[i] = x[i](t);
    return c;
  };
};

eo.interpolateObject = function(a, b) {
  var i = {},
      c = {},
      k;
  for (k in a) {
    if (k in b) {
      i[k] = eo_interpolateByName(k)(a[k], b[k]);
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

var eo_interpolate_number = /[-+]?(?:\d+\.\d+|\d+\.|\.\d+|\d+)(?:[eE][-]?\d+)?/g,
    eo_interpolate_digits = /[-+]?\d*\.?\d*(?:[eE][-]?\d+)?(.*)/,
    eo_interpolate_rgb = {background: 1, fill: 1, stroke: 1};

function eo_interpolateByName(n) {
  return n in eo_interpolate_rgb || /\bcolor\b/.test(n)
      ? eo.interpolateRgb
      : eo.interpolate;
}
