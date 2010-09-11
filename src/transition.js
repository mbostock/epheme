eo.transition = function() {
  var transition = eo_dispatch(eo_transform()),
      rate = 24,
      delay = 0,
      duration = 250,
      ease = eo.ease("cubic-in-out"),
      timer,
      interval,
      then;

  // TODO
  // per-element delay would be great

  function start() {
    then = Date.now();
    transition.dispatch({type: "start"});
    tick();
    interval = setInterval(tick, rate);
    timer = 0;
  }

  function tick() {
    var td = (Date.now() - then) / duration;
    eo.time = ease(td < 0 ? 0 : td > 1 ? 1 : td);
    transition.apply();
    delete eo.time;
    if (td >= 1) end();
  }

  function end() {
    interval = clearInterval(interval);
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

  return transition;
};
