if (!org) var org = {};
if (!org.epheme) org.epheme = {};
(function(eo) {
  eo.version = "0.0.0"; // semver
var ns = {

  prefix: {
    svg: "http://www.w3.org/2000/svg",
    xhtml: "http://www.w3.org/1999/xhtml",
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  },

  resolve: function(prefix) {
    return ns.prefix[prefix] || null;
  },

  qualify: function(name) {
    var i = name.indexOf(":");
    return i < 0 ? name : {
      space: ns.prefix[name.substring(0, i)],
      local: name.substring(i + 1)
    };
  }

};
eo.dispatch = function(that) {
  var types = {};

  that.on = function(type, handler) {
    var listeners = types[type] || (types[type] = []);
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i].handler == handler) return that; // already registered
    }
    listeners.push({handler: handler, on: true});
    return that;
  };

  that.off = function(type, handler) {
    var listeners = types[type];
    if (listeners) for (var i = 0; i < listeners.length; i++) {
      var l = listeners[i];
      if (l.handler == handler) {
        l.on = false;
        listeners.splice(i, 1);
        break;
      }
    }
    return that;
  };

  that.dispatch = function(event) {
    var listeners = types[event.type];
    if (!listeners) return;
    listeners = listeners.slice(); // defensive copy
    for (var i = 0; i < listeners.length; i++) {
      var l = listeners[i];
      if (l.on) l.handler.call(that, event);
    }
  };
};
eo.select = function(e) {
  var select = {},
      items;

  // TODO optimize implementation for single-element selections?

  if (typeof e == "string") {
    xpath(e, document, items = []);
  } else if (e instanceof Array) {
    items = e.slice();
  } else {
    items = [e];
  }

  // TODO does it make sense if e is not a string for subselect?

  select.select = function(e) {
    var subitems = [];
    for (var i = 0; i < items.length; i++) {
      xpath(e, items[i], subitems);
    }
    return eo.select(subitems);
  };

  select.add = function(n) {
    n = ns.qualify(n);
    var children = [];
    if (n.space) {
      for (var i = 0; i < items.length; i++) {
        children.push(items[i].appendChild(document.createElementNS(n.space, n.local)));
      }
    } else {
      for (var i = 0; i < items.length; i++) {
        children.push(items[i].appendChild(document.createElement(n)));
      }
    }
    return eo.select(children);
  };

  select.remove = function() {
    for (var i = 0; i < items.length; i++) {
      var e = items[i];
      if (e.parentNode) e.parentNode.removeChild(e);
    }
    return select;
  };

  // TODO argument to value function should be a selector? Alternatively, the
  // selector could track the index internally, and thus calling attr("opacity")
  // would return the value of the opacity attribute on the active node.

  select.attr = function(n, v) {
    n = ns.qualify(n);
    if (n.space) {
      if (v == null) {
        for (var i = 0; i < items.length; i++) {
          items[i].removeAttributeNS(n.space, n.local);
        }
      } else if (typeof v == "function") {
        for (var i = 0; i < items.length; i++) {
          var e = items[i],
              x = v.call(select, e, i);
          x == null
              ? e.removeAttributeNS(n.space, n.local)
              : e.setAttributeNS(n.space, n.local, x);
        }
      } else {
        for (var i = 0; i < items.length; i++) {
          items[i].setAttributeNS(n.space, n.local, v);
        }
      }
    } else if (v == null) {
      for (var i = 0; i < items.length; i++) {
        items[i].removeAttribute(n);
      }
    } else if (typeof v == "function") {
      for (var i = 0; i < items.length; i++) {
        var e = items[i],
            x = v.call(select, e, i);
        x == null
            ? e.removeAttribute(n)
            : e.setAttribute(n, x);
      }
    } else {
      for (var i = 0; i < items.length; i++) {
        items[i].setAttribute(n, v);
      }
    }
    return select;
  };

  select.style = function(n, v, p) {
    if (arguments.length < 3) p = null;
    if (v == null) {
      for (var i = 0; i < items.length; i++) {
        items[i].style.removeProperty(n);
      }
    } else if (typeof v == "function") {
      for (var i = 0; i < items.length; i++) {
        var e = items[i],
            x = v.call(select, e, i);
        x == null
            ? e.style.removeProperty(n)
            : e.style.setProperty(n, x, p);
      }
    } else {
      for (var i = 0; i < items.length; i++) {
        items[i].style.setProperty(n, v, p);
      }
    }
    return select;
  };

  // TODO text assumes that there is exactly 1 text node chlid

  select.text = function(v) {
    if (v == null) {
      for (var i = 0; i < items.length; i++) {
        var e = items[i];
        if (e.firstChild) e.removeChild(e.firstChild);
      }
    } else if (typeof v == "function") {
      for (var i = 0; i < items.length; i++) {
        var e = items[i],
            x = v.call(select, e, i);
        if (x == null) {
          if (e.firstChild) e.removeChlid(e.firstChild);
        } else {
          if (e.firstChild) e.firstChild.nodeValue = x;
          else e.appendChild(document.createTextNode(x));
        }
      }
    } else {
      for (var i = 0; i < items.length; i++) {
        var e = items[i];
        if (e.firstChild) e.firstChild.nodeValue = v;
        else e.appendChild(document.createTextNode(v));
      }
    }
    return select;
  };

  select.length = function() {
    return items.length;
  };

  select.item = function(i) {
    return items[i];
  };

  select.transition = function() {
    return eo_transition(select);
  };

  return select;
};

function xpath(e, c, items) {
  var i, x = document.evaluate(
      e, // XPath expression
      c, // context node
      ns.resolve, // namespace resolver
      XPathResult.UNORDERED_NODE_ITERATOR_TYPE, // result type
      null); // result object
  while ((i = x.iterateNext()) != null) items.push(i);
}
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
eo.map = function(data) {
  var map = {},
      from,
      by;

  eo.dispatch(map);

  map.length = function() {
    return data.length;
  };

  map.datum = function(i) {
    return data[i];
  };

  map.from = function(e) {
    if (!arguments.length) return from;
    from = e;
    return map;
  };

  map.by = function(f) {
    if (!arguments.length) return by;
    by = f;
    return map;
  };

  // TODO Should the map object reorder elements to match the data order?
  // Perhaps the map object should have a sort property (or method) that
  // determines (or applies) the desired element order. Alternatively, this
  // could be handled in the `enter` handler.

  // TODO There should be a way to index the existing (from) elements, so that
  // we don't have to do an n^2 equality check to find out which elements need
  // removal. Is there a way to determine the data for the given element?

  map.apply = function(update) {
    if (!arguments.length) update = map.dispatch;
    var froms = eo.select(from); // select before update

    var items = [];
    for (var i = 0; i < data.length; i++) {
      var d = data[i],
          s = eo.select(by.call(map, d, i)),
          n = s.length();
      if (n) {
        update.call(map, {type: "update", target: s, data: d, index: i});
        for (var j = 0; j < n; j++) items.push(s.item(j));
      } else {
        map.dispatch({type: "enter", data: d, index: i});
      }
    }

    for (var i = 0; i < froms.length(); i++) {
      var e = froms.item(i), found = false;
      for (var j = 0; j < items.length; j++) {
        if (items[j] === e) {
          found = true;
          break;
        }
      }
      if (!found) map.dispatch({type: "exit", target: e});
    }

    return map;
  };

  return map;
};
/*
 * TERMS OF USE - EASING EQUATIONS
 *
 * Open source under the BSD License.
 *
 * Copyright 2001 Robert Penner
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * - Neither the name of the author nor the names of contributors may be used to
 *   endorse or promote products derived from this software without specific
 *   prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

var quad = poly(2),
    cubic = poly(3);

var ease = {
  "linear": function() { return linear; },
  "poly": poly,
  "quad": function() { return quad; },
  "cubic": function() { return cubic; },
  "sin": function() { return sin; },
  "exp": function() { return exp; },
  "circle": function() { return circle; },
  "elastic": elastic,
  "back": back,
  "bounce": function() { return bounce; }
};

var mode = {
  "in": function(f) { return f; },
  "out": reverse,
  "in-out": reflect,
  "out-int": function(f) { return reflect(reverse(f)); }
};

eo.ease = function(name) {
  var i = name.indexOf("-"),
      t = i >= 0 ? name.substring(0, i) : name,
      m = i >= 0 ? name.substring(i + 1) : "in";
  return mode[m](ease[t].apply(null, Array.prototype.slice.call(arguments, 1)));
};

function reverse(f) {
  return function(t) {
    return 1 - f(1 - t);
  };
}

function reflect(f) {
  return function(t) {
    return .5 * (t < .5 ? f(2 * t) : (2 - f(2 - 2 * t)));
  };
}

function linear() {
  return t;
}

function poly(e) {
  return function(t) {
    return Math.pow(t, e);
  }
}

function sin(t) {
  return 1 - Math.cos(t * Math.PI / 2);
}

function exp(t) {
  return t ? Math.pow(2, 10 * (t - 1)) - 1e-3 : 0;
}

function circle(t) {
  return 1 - Math.sqrt(1 - t * t);
}

function elastic(a, p) {
  var s;
  if (arguments.length < 2) p = 0.45;
  if (arguments.length < 1) { a = 1; s = p / 4; }
  else s = p / (2 * Math.PI) * Math.asin(1 / a);
  return function(t) {
    return 1 + a * Math.pow(2, 10 * -t) * Math.sin(-(t + s) * 2 * Math.PI / p);
  };
}

function back(s) {
  if (!s) s = 1.70158;
  return function(t) {
    return t * t * ((s + 1) * t - s);
  };
}

function bounce(t) {
  return t < 1 / 2.75 ? 7.5625 * t * t
      : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .75
      : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .9375
      : 7.5625 * (t -= 2.625 / 2.75) * t + .984375;
}
})(org.epheme);
