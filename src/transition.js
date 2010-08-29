function eo_transition(select) {
  var transition = {},
      repeatInterval = 24,
      repeatDelay = repeatInterval,
      duration = 250,
      ease = eo.ease("cubic-in-out"),
      then,
      tweens = [],
      timer,
      interval;

  // TODO per-element delay? per-element duration? adjustable frame rate?
  // TODO starting and stopping of transitions? merging transitions?

  timer = setTimeout(start, repeatDelay);

  function start() {
    timer = 0;
    then = Date.now();
    repeat();
    interval = setInterval(repeat, repeatInterval);
  }

  function repeat() {
    var t = Math.max(0, Math.min(1, (Date.now() - then) / duration)),
        te = ease(t);
    for (var i = 0; i < tweens.length; i++) tweens[i](te);
    if (t == 1) {
      clearInterval(interval);
      interval = 0;
    }
  }

  function tweenAttr(e, n, v) {
    var v0 = parseFloat(e.getAttribute(n)),
        v1 = parseFloat(v),
        units = "%"; // TODO!
    if (isNaN(v0) || isNaN(v1)) {
      return function(t) { // TODO only apply this once at first t >= .5
        return e.setAttribute(n, t < .5 ? v0 : v1);
      };
    };
    return function(t) {
      e.setAttribute(n, v0 * (1 - t) + v1 * t + units);
    };
  }

  transition.duration = function(x) {
    if (!arguments.length) return duration;
    duration = x;
    return transition;
  };

  transition.delay = function(x) {
    if (!arguments.length) return repeatDelay;
    repeatDelay = x;
    if (timer) {
      clearInterval(timer);
      timer = setTimeout(start, repeatDelay);
    }
    return transition;
  };

  transition.ease = function(x) {
    if (!arguments.length) return ease;
    ease = typeof x == "string" ? eo.ease(x) : x;
    return transition;
  };

  // TODO attribute-aware tweens, such as color
  // TODO allow values to be specified as a function
  // TODO evaluate the text function value first

  transition.attr = function(n, v) {
    for (var i = 0; i < select.length(); i++) {
      tweens.push(tweenAttr(select.item(i), n, v));
    }
    return transition;
  };

  transition.style = function(n, v, p) {
    // TODO
    return transition;
  };

  transition.text = function(v) {
    var t1 = .5;
    tweens.push(function(t) {
      if (t >= t1) {
        t1 = NaN;
        select.text(v);
      }
    });
    return transition;
  };

  return transition;
}
