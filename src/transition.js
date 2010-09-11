eo.transition = function() {
  var transition = eo_dispatch({}),
      rate = 24,
      delay = 0,
      duration = 250,
      ease = eo.ease("cubic-in-out"),
      timer,
      interval,
      then,
      t;

  function start() {
    then = Date.now();
    t = 0;
    transition.dispatch({type: "start"});
    transition.dispatch({type: "tick"});
    interval = setInterval(tick, rate);
    timer = 0;
  }

  function tick() {
    var td = (Date.now() - then) / duration;
    if (td >= 1) return end();
    t = ease(td);
    transition.dispatch({type: "tick"});
  }

  function end() {
    interval = clearInterval(interval);
    t = 1;
    transition.dispatch({type: "tick"});
    transition.dispatch({type: "end"});
  }

  transition.ease = function(x) {
    if (!arguments.length) return ease;
    ease = typeof x == "string" ? eo.ease(x) : x;
    return transition;
  };

  transition.delay = function(x) {
    if (!arguments.length) return delay;
    delay = x;
    if (timer) {
      clearInterval(timer);
      timer = setTimeout(start, delay);
    }
    return transition;
  };

  transition.duration = function(x) {
    if (!arguments.length) return duration;
    duration = x;
    return transition;
  };

  transition.start = function() {
    if (timer || interval) return transition;
    if (delay) timer = setTimeout(start, delay);
    else start();
    return transition;
  };

  transition.stop = function() {
    if (timer) timer = clearTimeout(timer);
    if (interval) interval = clearInterval(interval);
    return transition;
  };

  transition.bind = function(f) {
    return function() {
      return f(t);
    };
  };

  return transition;
};
