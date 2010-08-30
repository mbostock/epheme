function eo_transitioner() {
  var transitioner = {},
      transition = {},
      repeatInterval = 24,
      repeatDelay = repeatInterval,
      duration = 250,
      ease = eo.ease("cubic-in-out"),
      then,
      triggers = [{t: NaN}],
      tweens = [],
      timer,
      interval;

  // TODO per-element delay? per-element duration? adjustable frame rate?
  // TODO starting and stopping of transitions? merging transitions?

  timer = setTimeout(start, repeatDelay);

  eo.dispatch(transition);

  function start() {
    timer = 0;
    then = Date.now();
    repeat();
    transition.dispatch({type: "start"});
    interval = setInterval(repeat, repeatInterval);
  }

  function repeat() {
    var t = (Date.now() - then) / duration,
        te = ease(t < 0 ? 0 : t > 1 ? 1 : t);
    while (te >= triggers[triggers.length - 1].t) triggers.pop().f();
    for (var i = 0; i < tweens.length; i++) tweens[i](te);
    if (t >= 1) {
      clearInterval(interval);
      interval = 0;
      transition.dispatch({type: "end"});
    }
  }

  // Alternatively, some way of specifying an interpolator when tweening.
  // The interpolator should probably be customizable (e.g., polar).

  function tween(v0, v1) {
    var s0 = String(v0).split(digits),
        s1 = String(v1).split(digits);
    if (s0.length !== s1.length) return;
    var f0 = s0.map(parseFloat),
        f1 = s1.map(parseFloat);
    if (f0.every(isNaN) || f1.every(isNaN)) return;
    return function(t) {
      for (var i = 0; i < f0.length; i++) {
        if (!isNaN(f0[i]) && !isNaN(f1[i])) {
          s1[i] = f0[i] * (1 - t) + f1[i] * t;
        }
      }
      return s1.join("");
    };
  }

  function tweenAttr(e, n, v1) {
    n = ns.qualify(n);
    var f = tween(n.space
        ? e.getAttributeNS(n.space, n.local)
        : e.getAttribute(n), v1);
    if (f) tweens.push(n.space
        ? function(t) { e.setAttributeNS(n.space, n.local, f(t)); }
        : function(t) { e.setAttribute(n, f(t)); });
    else triggers.push({t: .5, f: n.space
        ? function(t) { e.setAttributeNS(n.space, n.local, v1); }
        : function(t) { e.setAttribute(n, v1); }});
  }

  function tweenStyle(e, n, v, p) {
    triggers.push({t: .5, f: function() { eo_select(e).style(n, v, p); }});
  }

  function tweenText(e, v) {
    triggers.push({t: .5, f: function() { eo_select(e).text(v); }});
  }

  transition.duration = function(x) {
    if (!arguments.length) return duration;
    duration = x;
    return this;
  };

  transition.delay = function(x) {
    if (!arguments.length) return repeatDelay;
    repeatDelay = x;
    if (timer) {
      clearInterval(timer);
      timer = setTimeout(start, repeatDelay);
    }
    return this;
  };

  transition.ease = function(x) {
    if (!arguments.length) return ease;
    ease = typeof x == "string" ? eo.ease(x) : x;
    return this;
  };

  transitioner.select = function(items, data) {
    var t = Object.create(transition);

    t.select = function(e) {
      return transitioner.select.apply(null, eo_subselect(items, data, e));
    };

    t.attr = function(n, v) {
      if (typeof v == "function") {
        for (var i = 0; i < items.length; i++) {
          tweenAttr(items[i], n, v.call(t, data[i], i));
        }
      } else {
        for (var i = 0; i < items.length; i++) {
          tweenAttr(items[i], n, v);
        }
      }
      return t;
    };

    t.style = function(n, v, p) {
      if (arguments.length < 3) p = null;
      if (typeof v == "function") {
        for (var i = 0; i < items.length; i++) {
          tweenStyle(items[i], n, v.call(t, data[i], i), p);
        }
      } else {
        for (var i = 0; i < items.length; i++) {
          tweenStyle(items[i], n, v, p);
        }
      }
      return t;
    };

    t.text = function(v) {
      if (typeof v == "function") {
        for (var i = 0; i < items.length; i++) {
          tweenText(items[i], v.call(t, data[i], i));
        }
      } else {
        for (var i = 0; i < items.length; i++) {
          tweenText(items[i], v);
        }
      }
      return t;
    };

    return t;
  };

  return transitioner;
}

var digits = /([0-9.]+)/;
