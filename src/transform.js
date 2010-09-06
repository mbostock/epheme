eo.transform = function() {
  var transform = {},
      actions = [];

  // TODO transitions:
  // duration, delay, etc.
  // per-element delay would be great
  // are transitions scoped, or global?

  // TODO data and indexes:
  //
  // Is the current index available in the callback?  Perhaps the `this` context
  // is a single-element wrapper, with similar behavior to NNS and eo.select?
  // It's a bit weird that data is a scoping action, as opposed to setting the
  // data on the current scope, but I sort of like it.

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
  for (var i = 0, n = actions.length; i < n; ++i) actions[i].impl(nodes, data);
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
  eo_transform_actions(this.actions, children, data);
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
  for (var i = 0; i < m; ++i) {
    r = e.evaluate(nodes[i], XPathResult.UNORDERED_NODE_ITERATOR_TYPE, r);
    d = data[i];
    for (var j = 0; (o = r.iterateNext()) != null; j++) {
      selectNodes.push(o);
      selectData.push(j);
    }
    eo_transform_stack[1] = d;
    eo_transform_actions(this.actions, selectNodes, selectData);
    selectNodes.length = 0;
    selectData.length = 0;
  }
  eo_transform_stack.shift();
}

var eo_transform_stack = [];

function eo_transform_data(nodes, data) {
  var results = this.value,
      m = nodes.length,
      v = results;
  if (typeof v == "function") {
    results = [];
    for (var i = 0; i < m; ++i) {
      eo_transform_stack[0] = data[i];
      results.push(v.apply(null, eo_transform_stack));
    }
  }
  eo_transform_actions(this.actions, nodes, results);
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
    if (key != null) nodesByKey[key.stringValue] = o;
  }

  var dataByKey = {};
  for (var i = 0, m = data.length; i < m; ++i) {
    var d = data[i];
    eo_transform_stack[0] = d;
    var key = v.apply(null, eo_transform_stack);
    if (key != null) dataByKey[key] = d;
  }

  for (var key in dataByKey) {
    var d = dataByKey[key];
    if (key in nodesByKey) {
      updateNodes.push(nodesByKey[key]);
      updateData.push(d);
    } else {
      enterNodes.push(document);
      enterData.push(d);
    }
  }

  for (var key in nodesByKey) {
    if (!(key in dataByKey)) {
      exitNodes.push(nodesByKey[key]);
      exitData.push(null);
    }
  }

  eo_transform_actions(this.enterActions, enterNodes, enterData);
  eo_transform_actions(this.actions, updateNodes, updateData);
  eo_transform_actions(this.exitActions, exitNodes, exitData);
}

var empty = {};
