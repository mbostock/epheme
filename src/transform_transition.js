function eo_transform_transition(nodes) {
  var that = this,
      actions = that.actions,
      endActions = that.endActions,
      rate = that.rate,
      start = Date.now(),
      delay = that.delay,
      duration = that.duration,
      ease = that.ease,
      n = actions.length,
      ne = endActions.length,
      m = nodes.length,
      i = 0, // current index
      o, // curent node
      stack = eo_transform_stack.slice(); // stack snapshot

  if (that.timeout) clearInterval(that.timeout);
  that.timeout = setTimeout(function() {
    if (that.interval) clearInterval(that.interval);
    that.interval = setInterval(tick, rate);
  }, delay);

  function tick() {
    var s = eo_transform_stack,
        t = (Date.now() - start) / duration;

    // Run the update actions for each tick.
    try {
      eo_transform_stack = stack;
      eo.time = ease(t < 0 ? 0 : t > 1 ? 1 : t);
      for (i = 0; i < n; ++i) actions[i].impl(nodes);
    } finally {
      delete eo.time;
      eo_transform_stack = s;
    }

    // When done, clear the interval and run the end actions.
    if (t >= 1) {
      clearInterval(that.interval);
      try {
        eo_transform_stack = stack;
        for (i = 0; i < ne; ++i) endActions[i].impl(nodes);
      } finally {
        eo_transform_stack = s;
      }
    }
  }
}
