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
  return eo_select(e);
};

function eo_select(e, data) {
  var select = {},
      items;

  // TODO optimize implementation for single-element selections?

  if (arguments.length < 2) data = empty;

  if (typeof e == "string") {
    items = xpath(e, document, []);
  } else if (e instanceof Array) {
    items = e.slice();
  } else {
    items = [e];
  }

  select.select = function(e) {
    var subitems = [], subdata = empty;
    if (typeof e == "string") {
      if (data === empty) {
        for (var i = 0; i < items.length; i++) {
          xpath(e, items[i] || document, subitems);
        }
      } else {
        subdata = [];
        for (var i = 0, j = 0; i < items.length; i++) {
          xpath(e, items[i] || document, subitems);
          for (var d = data[i]; j < subitems.length; j++) subdata.push(d);
        }
      }
    } else if (typeof e == "number") {
      subitems.push(items[e]);
      subdata = data === empty ? empty : data[e];
    } else {
      subitems = e;
    }
    return eo_select(subitems, subdata);
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
    return eo_select(children, data);
  };

  select.remove = function() {
    for (var i = 0; i < items.length; i++) {
      var e = items[i];
      if (e.parentNode) e.parentNode.removeChild(e);
    }
    return select;
  };

  // TODO select parent / children (convenience functions, using xpath)?

  // TODO argument to value function should be a selector? Alternatively, the
  // selector could track the index internally, and thus calling attr("opacity")
  // would return the value of the opacity attribute on the active node.

  // Or perhaps there's a way to specify the context for elements, so that by
  // default, there's no argument to the value function? And perhaps the map
  // object can override this context to pass in data?

  select.attr = function(n, v) {
    n = ns.qualify(n);
    if (arguments.length < 2) {
      return items.length
          ? (n.space ? items[0].getAttributeNS(n.space, n.local)
          : items[0].getAttribute(n))
          : null;
    }
    if (n.space) {
      if (v == null) {
        for (var i = 0; i < items.length; i++) {
          items[i].removeAttributeNS(n.space, n.local);
        }
      } else if (typeof v == "function") {
        for (var i = 0; i < items.length; i++) {
          var e = items[i],
              x = v.call(select, data[i], i);
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
            x = v.call(select, data[i], i);
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
    if (arguments.length < 2) {
      return items.length
          ? items[0].style.getPropertyValue(n)
          : null;
    }
    if (arguments.length < 3) p = null;
    if (v == null) {
      for (var i = 0; i < items.length; i++) {
        items[i].style.removeProperty(n);
      }
    } else if (typeof v == "function") {
      for (var i = 0; i < items.length; i++) {
        var e = items[i],
            x = v.call(select, data[i], i);
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
    if (!arguments.length) {
      return items.length && items[0].firstChild
          ? items[0].firstChild.nodeValue
          : null;
    }
    if (v == null) {
      for (var i = 0; i < items.length; i++) {
        var e = items[i];
        if (e.firstChild) e.removeChild(e.firstChild);
      }
    } else if (typeof v == "function") {
      for (var i = 0; i < items.length; i++) {
        var e = items[i],
            x = v.call(select, data[i], i);
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
    return eo_transition(items, data);
  };

  return select;
};

function xpath(e, c, items) {
  var item,
      results = document.evaluate(
      e, // XPath expression
      c, // context node
      ns.resolve, // namespace resolver
      XPathResult.UNORDERED_NODE_ITERATOR_TYPE, // result type
      null); // result object
  while ((item = results.iterateNext()) != null) items.push(item);
  return items;
}

var empty = {};
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
eo.map = function(data) {
  var map = {},
      from,
      by;

  eo.dispatch(map);

  // TODO defensive copy of data?

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

    // TODO merge selections...

    var added = [], addedData = [],
        updated = [], updatedData = [];
    for (var i = 0; i < data.length; i++) {
      var d = data[i],
          s = eo_select(by.call(map, d, i)),
          n = s.length();
      if (n) {
        for (var j = 0; j < n; j++) {
          updated.push(s.item(j));
          updatedData.push(d);
        }
      } else {
        added.push(null);
        addedData.push(d);
      }
    }

    var removed = [], existing = eo_select(from);
    outer: for (var i = 0; i < existing.length(); i++) {
      var e = existing.item(i), found = false;
      for (var j = 0; j < added.length; j++) {
        if (added[j] === e) continue outer;
      }
      for (var j = 0; j < updated.length; j++) {
        if (updated[j] === e) continue outer;
      }
      removed.push(e);
    }

    if (added.length) map.dispatch({type: "enter", target: eo_select(added, addedData)});
    if (updated.length) map.dispatch({type: "update", target: eo_select(updated, updatedData)});
    if (removed.length) map.dispatch({type: "exit", target: eo_select(removed)});
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
