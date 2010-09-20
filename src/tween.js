eo.tween = eo_tweenInterpolate(eo.interpolate);
eo.tweenRgb = eo_tweenInterpolate(eo.interpolateRgb);

function eo_tweenInterpolate(I) {
  return function(a, b) {
    var i = I(a, b);
    return function() {
      return i(eo.time);
    };
  };
}

function eo_tweenByName(n) {
  return n in eo_interpolate_rgb || /\bcolor\b/.test(n)
      ? eo.tweenRgb
      : eo.tween;
}
