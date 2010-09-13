function eo_transform_transition(nodes) {
  var that = this,
      actions = that.actions,
      endActions = that.endActions,
      start = Date.now(),
      delay = that.delay,
      minDelay = Infinity,
      maxDelay = -Infinity,
      duration = that.duration,
      ease = that.ease,
      n = actions.length,
      k = endActions.length,
      m = nodes.length,
      i, // current index
      j, // current index
      o, // curent node
      x, // current value
      stack = eo_transform_stack.slice(); // stack snapshot

  // Clear any existing timeouts or intervals.
  if (that.timeout) clearTimeout(that.timeout);
  if (that.interval) clearInterval(that.interval);

  // If delay is a function, transition each node separately.
  if (typeof delay == "function") {
    for (i = 0; i < m; ++i) {
      eo_transform_stack[0] = (o = nodes[i]).data;
      x = o.delay = delay.apply(o, eo_transform_stack);
      if (x < minDelay) minDelay = x;
      if (x > maxDelay) maxDelay = x;
    }
    that.timeout = setTimeout(function() {
      that.interval = setInterval(tickOne, 24);
    }, minDelay);
  } else {
    that.timeout = setTimeout(function() {
      that.interval = setInterval(tickAll, 24);
    }, delay);
  }

  function tickOne() {
    var s = eo_transform_stack,
        q = Date.now(),
        t,
        d = true;
    try {
      eo_transform_stack = stack;
      for (i = 0; i < m; ++i) {
        o = nodes[i];
        t = (q - start - o.delay) / duration;
        if (t < 0) continue;
        if (t > 1) t = 1;
        else d = false;
        eo.time = ease(t);
        for (j = 0; j < n; ++j) actions[j].impl([o]);
        if (t == 1) {
          for (j = 0; j < k; ++j) endActions[j].impl([o]);
          o.delay = Infinity;
        }
      }
    } finally {
      delete eo.time;
      eo_transform_stack = s;
    }
    if (d) clearInterval(that.interval);
  }

  function tickAll() {
    var s = eo_transform_stack,
        t = (Date.now() - start - delay) / duration;
    try {
      eo_transform_stack = stack;
      eo.time = ease(t < 0 ? 0 : t > 1 ? 1 : t);
      for (i = 0; i < n; ++i) actions[i].impl(nodes);
    } finally {
      delete eo.time;
      eo_transform_stack = s;
    }
    if (t >= 1) end();
  }

  function end() {
    var s = eo_transform_stack;
    clearInterval(that.interval);
    try {
      eo_transform_stack = stack;
      for (i = 0; i < k; ++i) endActions[i].impl(nodes);
    } finally {
      eo_transform_stack = s;
    }
  }
}
