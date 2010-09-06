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
      if (listeners[i].handler == handler) return this; // already registered
    }
    listeners.push({handler: handler, on: true});
    return this;
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
    return this;
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

  return that;
};
eo.transform = function() {
  var transform = {},
      actions = [];

  // TODO transitions:
  // duration, delay, etc.
  // per-element delay would be great
  // are transitions scoped, or global?

  //
  // TODO data and indexes:
  //
  // Is the current index available in the callback?  Perhaps the `this` context
  // is a single-element wrapper, with similar behavior to NNS and eo.select?
  // It's a bit weird that data is a scoping action, as opposed to setting the
  // data on the current scope, but I sort of like it.
  //
  // Shorthand data properties?
  //
  // "copy" or "inherit" = function(i, d) { return d; }
  // "index" = function(i) { return i; } (unless overridden ... hmm)
  // "dereference" or "recurse" = function(i, d) { return d[i]; }
  //
  // Another possibility is that there are different aliases for `select` that
  // have different data properties. For example, if there were a `selectOne`
  // method, that could automatically use the "inherit" data property, as the
  // `add` method does currently. Maybe there is a `selectMany` that uses
  // "recurse" by default? Of course, the problem with recurse by default is
  // that it makes it difficult to override the behavior, since the indexes are
  // hidden.
  //

  // TODO api uncertainty:
  // remove returns select(removed elements)?
  // use sizzle selectors rather than xpath?
  // how to insert or replace elements?
  // how to move elements around, sort, reverse or reorder?

  // TODO performance:
  // text would be more efficient by reusing existing firstChild?
  // optimize arguments to action implementation?

  // Somewhat confusing: the node name specified to the add and remove methods
  // is not the same as the XPath selector expressions. For example, "#text" is
  // used to create a text node, as this corresponds to the W3C nodeName.
  // However, to select text nodes in XPath, text() is used instead. CSS
  // selectors have the same problem, as #text refers to the ID "text".

  function transform_scope(actions) {
    var scope = Object.create(transform);

    scope.data = function(v) {
      var action = {
        impl: eo_transform_data,
        value: v,
        actions: []
      }
      actions.push(action);
      return transform_scope(action.actions);
    };

    scope.key = function(n, v) {
      var action = {
        impl: eo_transform_key,
        name: document.createExpression(n, ns.resolve),
        value: v,
        actions: [],
        enterActions: [],
        exitActions: []
      }
      actions.push(action);
      var s = transform_scope(action.actions);
      s.enter = transform_scope(action.enterActions);
      s.exit = transform_scope(action.exitActions);
      return s;
    };

    scope.attr = function(n, v) {
      actions.push({
        impl: eo_transform_attr,
        name: n,
        value: v
      });
      return scope;
    };

    scope.style = function(n, v, p) {
      actions.push({
        impl: eo_transform_style,
        name: n,
        value: v,
        priority: arguments.length < 3 ? null : p
      });
      return scope;
    };

    scope.add = function(n, v) {
      var action = {
        impl: eo_transform_add,
        name: n,
        value: v,
        actions: []
      };
      actions.push(action);
      return transform_scope(action.actions);
    };

    scope.remove = function(e) {
      actions.push({
        impl: eo_transform_remove,
        expression: document.createExpression(e, ns.resolve)
      });
      return scope;
    };

    scope.value = function(v) {
      actions.push({
        impl: eo_transform_value,
        value: v
      });
      return scope;
    };

    scope.text = function(v) {
      scope.remove("text()").add("#text", v);
      return scope; // don't scope
    };

    scope.select = function(e) {
      var action = {
        impl: eo_transform_select,
        expression: document.createExpression(e, ns.resolve),
        actions: []
      };
      actions.push(action);
      return transform_scope(action.actions);
    };

    return scope;
  }

  transform.apply = function() {
    eo_transform_stack.unshift(null);
    eo_transform_actions(actions, [document], empty);
    eo_transform_stack.shift();
    return transform;
  };

  return transform_scope(actions);
};

function eo_transform_actions(actions, nodes, data) {
  for (var i = 0, n = actions.length; i < n; ++i) {
    var a = actions[i];
    // console.group(a.impl.name);
    a.impl(nodes, data);
    // console.groupEnd();
  }
}

function eo_transform_attr(nodes, data) {
  var m = nodes.length,
      n = ns.qualify(this.name),
      v = this.value,
      f = typeof v == "function" && v;
  if (n.space) {
    if (v == null) {
      for (var i = 0; i < m; ++i) {
        nodes[i].removeAttributeNS(n.space, n.local);
      }
    } else if (f) {
      for (var i = 0; i < m; ++i) {
        eo_transform_stack[0] = data[i];
        var o = nodes[i],
            x = v.apply(null, eo_transform_stack);
        x == null
            ? o.removeAttributeNS(n.space, n.local)
            : o.setAttributeNS(n.space, n.local, x);
      }
    } else {
      for (var i = 0; i < m; ++i) {
        nodes[i].setAttributeNS(n.space, n.local, v);
      }
    }
  } else if (v == null) {
    for (var i = 0; i < m; ++i) {
      nodes[i].removeAttribute(n);
    }
  } else if (f) {
    for (var i = 0; i < m; ++i) {
      eo_transform_stack[0] = data[i];
      var o = nodes[i],
          x = v.apply(null, eo_transform_stack);
      x == null
          ? o.removeAttribute(n)
          : o.setAttribute(n, x);
    }
  } else {
    for (var i = 0; i < m; ++i) {
      nodes[i].setAttribute(n, v);
    }
  }
}

function eo_transform_style(nodes, data) {
  var m = nodes.length,
      n = ns.qualify(this.name),
      v = this.value,
      f = typeof v == "function" && v,
      p = this.priority;
  if (v == null) {
    for (var i = 0; i < m; ++i) {
      nodes[i].style.removeProperty(n);
    }
  } else if (f) {
    for (var i = 0; i < m; ++i) {
      eo_transform_stack[0] = data[i];
      var o = nodes[i],
          x = v.apply(null, eo_transform_stack);
      x == null
          ? o.style.removeProperty(n)
          : o.style.setProperty(n, x, p);
    }
  } else {
    for (var i = 0; i < m; ++i) {
      nodes[i].style.setProperty(n, v, p);
    }
  }
}

function eo_transform_add(nodes, data) {
  var m = nodes.length,
      n = ns.qualify(this.name),
      children = [];
  if (n.space) {
    for (var i = 0; i < m; ++i) {
      children.push(nodes[i].appendChild(document.createElementNS(n.space, n.local)));
    }
  } else if (n == "#text") {
    var v = this.value,
        f = typeof v == "function" && v;
    if (f) {
      for (var i = 0; i < m; ++i) {
        eo_transform_stack[0] = data[i];
        var o = nodes[i],
            x = v.apply(null, eo_transform_stack);
        children.push(o.appendChild(document.createTextNode(x)));
      }
    } else {
      for (var i = 0; i < m; ++i) {
        children.push(nodes[i].appendChild(document.createTextNode(v)));
      }
    }
  } else {
    for (var i = 0; i < m; ++i) {
      children.push(nodes[i].appendChild(document.createElement(n)));
    }
  }
  // eo_transform_node_stack.unshift(children); // XXX
  eo_transform_actions(this.actions, children, data);
  // eo_transform_node_stack.shift();
}

function eo_transform_remove(nodes, data) {
  var m = nodes.length,
      e = this.expression,
      r = null,
      o;
  for (var i = 0; i < m; ++i) {
    r = e.evaluate(nodes[i], XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, r);
    for (var j = 0, k = r.snapshotLength; j < k; j++) {
      o = r.snapshotItem(j);
      o.parentNode.removeChild(o);
    }
  }
}

function eo_transform_value(nodes, data) {
  var m = nodes.length,
      v = this.value,
      f = typeof v == "function" && v;
  if (f) {
    for (var i = 0; i < m; ++i) {
      eo_transform_stack[0] = data[i];
      var o = nodes[i],
          x = v.apply(null, eo_transform_stack);
      o.nodeValue = x;
    }
  } else {
    for (var i = 0; i < m; ++i) {
      nodes[i].nodeValue = v;
    }
  }
}

function eo_transform_select(nodes, data) {
  var selectNodes = [],
      selectData = [],
      m = nodes.length,
      e = this.expression,
      r = null,
      d,
      o;
  eo_transform_stack.unshift(null);
  eo_transform_node_stack.unshift(null);
  for (var i = 0; i < m; ++i) {
    r = e.evaluate(nodes[i], XPathResult.UNORDERED_NODE_ITERATOR_TYPE, r);
    d = data[i];
    for (var j = 0; (o = r.iterateNext()) != null; j++) {
      selectNodes.push(o);
      selectData.push(j);
    }
    eo_transform_stack[1] = d;
    eo_transform_node_stack[0] = nodes[i];
    eo_transform_actions(this.actions, selectNodes, selectData);
    selectNodes.length = 0;
    selectData.length = 0;
  }
  eo_transform_stack.shift();
  eo_transform_node_stack.shift();
}

var eo_transform_stack = [],
    eo_transform_node_stack = [];

function eo_transform_data(nodes, data) {
  var v = this.value,
      m = nodes.length;
  if (typeof v == "function") {
    var t = eo_transform_stack.shift();
    v = v.apply(null, eo_transform_stack);
    eo_transform_stack.unshift(t);
  }
  eo_transform_actions(this.actions, nodes, v);
}

function eo_transform_key(nodes, data) {
  var n = this.name,
      v = this.value,
      enterNodes = [],
      enterData = [],
      updateNodes = [],
      updateData = [],
      exitNodes = [],
      exitData = [];

  var nodesByKey = {};
  for (var i = 0, m = nodes.length; i < m; ++i) {
    var o = nodes[i],
        key = n.evaluate(o, XPathResult.STRING_TYPE, null);
    if (key != null) {
      // console.log(key.stringValue, o, i);
      nodesByKey[key.stringValue] = o;
    }
  }

  var dataByKey = {};
  eo_transform_stack.unshift(null);
  for (var i = 0, m = data.length; i < m; ++i) {
    var d = data[i];
    eo_transform_stack[0] = i; // XXX passing index to key function
    eo_transform_stack[1] = d;
    var key = v.apply(null, eo_transform_stack);
    if (key != null) dataByKey[key] = d;
  }
  eo_transform_stack.shift();

  for (var key in dataByKey) {
    var d = dataByKey[key];
    if (key in nodesByKey) {
      updateNodes.push(nodesByKey[key]);
      updateData.push(d);
    } else {
      enterNodes.push(eo_transform_node_stack[0]); // XXX what about add?
      enterData.push(d);
    }
  }

  for (var key in nodesByKey) {
    if (!(key in dataByKey)) {
      exitNodes.push(nodesByKey[key]);
      exitData.push(null);
    }
  }

  // console.log("enter", enterData);
  // console.log("update", updateData);
  // console.log("exit", exitData);

  eo_transform_actions(this.enterActions, enterNodes, enterData);
  eo_transform_actions(this.actions, updateNodes, updateData);
  eo_transform_actions(this.exitActions, exitNodes, exitData);
}

var empty = {};
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

var digits = /([-0-9.]+)/;
})(org.epheme);
