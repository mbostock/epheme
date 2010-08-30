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
      var t1 = .5;
      return function(t) {
        if (t >= t1) {
          t1 = NaN;
          eo.select(e).attr(n, v);
        }
      };
    };
    n = ns.qualify(n);
    if (n.space) return function(t) {
      e.setAttributeNS(n.space, n.local, v0 * (1 - t) + v1 * t + units);
    };
    return function(t) {
      e.setAttribute(n, v0 * (1 - t) + v1 * t + units);
    };
  }

  function tweenStyle(e, n, v, p) {
    var t1 = .5;
    return function(t) {
      if (t >= t1) {
        t1 = NaN;
        eo.select(e).style(n, v, p);
      }
    };
  }

  function tweenText(e, v) {
    var t1 = .5;
    return function(t) {
      if (t >= t1) {
        t1 = NaN;
        eo.select(e).text(v);
      }
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

  transition.attr = function(n, v) {
    if (typeof v == "function") {
      for (var i = 0; i < select.length(); i++) {
        tweens.push(tweenAttr(select.item(i), n, v.call(select, select.datum(i), i)));
      }
    } else {
      for (var i = 0; i < select.length(); i++) {
        tweens.push(tweenAttr(select.item(i), n, v));
      }
    }
    return transition;
  };

  transition.style = function(n, v, p) {
    if (arguments.length < 3) p = null;
    if (typeof v == "function") {
      for (var i = 0; i < select.length(); i++) {
        tweens.push(tweenStyle(select.item(i), n, v.call(select, select.datum(i), i), p));
      }
    } else {
      for (var i = 0; i < select.length(); i++) {
        tweens.push(tweenStyle(select.item(i), n, v, p));
      }
    }
    return transition;
  };

  transition.text = function(v) {
    if (typeof v == "function") {
      for (var i = 0; i < select.length(); i++) {
        tweens.push(tweenText(select.item(i), v.call(select, select.datum(i), i)));
      }
    } else {
      for (var i = 0; i < select.length(); i++) {
        tweens.push(tweenText(select.item(i), v));
      }
    }
    return transition;
  };

  return transition;
}
