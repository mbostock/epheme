function eo_transition(items, data) {
  var transition = {},
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
    var t = Math.max(0, Math.min(1, (Date.now() - then) / duration)),
        te = ease(t);
    while (te >= triggers[triggers.length - 1].t) triggers.pop().f();
    for (var i = 0; i < tweens.length; i++) tweens[i](te);
    if (t == 1) {
      clearInterval(interval);
      interval = 0;
      transition.dispatch({type: "end"});
    }
  }

  function tweenAttr(e, n, v) {
    var v0 = parseFloat(e.getAttribute(n)),
        v1 = parseFloat(v),
        units = "%"; // TODO!
    if (isNaN(v0) || isNaN(v1)) {
      triggers.push({t: .5, f: function() { eo_select(e).attr(n, v); }});
      return;
    };
    n = ns.qualify(n);
    tweens.push(n.space
        ? function(t) { e.setAttributeNS(n.space, n.local, v0 * (1 - t) + v1 * t + units); }
        : function(t) { e.setAttribute(n, v0 * (1 - t) + v1 * t + units); });
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
  // TODO subselect within a transition!

  transition.attr = function(n, v) {
    if (typeof v == "function") {
      for (var i = 0; i < items.length; i++) {
        tweenAttr(items[i], n, v.call(transition, data[i], i));
      }
    } else {
      for (var i = 0; i < items.length; i++) {
        tweenAttr(items[i], n, v);
      }
    }
    return transition;
  };

  transition.style = function(n, v, p) {
    if (arguments.length < 3) p = null;
    if (typeof v == "function") {
      for (var i = 0; i < items.length; i++) {
        tweenStyle(items[i], n, v.call(transition, data[i], i), p);
      }
    } else {
      for (var i = 0; i < items.length; i++) {
        tweenStyle(items[i], n, v, p);
      }
    }
    return transition;
  };

  transition.text = function(v) {
    if (typeof v == "function") {
      for (var i = 0; i < items.length; i++) {
        tweenText(items[i], v.call(transition, data[i], i));
      }
    } else {
      for (var i = 0; i < items.length; i++) {
        tweenText(items[i], v);
      }
    }
    return transition;
  };

  return transition;
}
