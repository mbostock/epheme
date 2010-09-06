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
  // have different data properties. For example, if there were a `selectAll`
  // method, then `select` (as in, "selectFirst") could automatically use the
  // "inherit" data property, as the `add` method does currently.
  //

  // TODO api uncertainty:
  // remove returns select(removed elements)?
  // how to insert or replace elements?
  // how to move elements around, sort, reverse or reorder?

  // TODO performance:
  // text would be more efficient by reusing existing firstChild?
  // optimize arguments to action implementation?

  // Somewhat confusing: the node name specified to the add and remove methods
  // is not the same as the selector expressions. For example, "#text" is used
  // to create a text node, as this corresponds to the W3C nodeName. However,
  // selectors use #text refers to the element with the ID "text".

  function transform_scope(actions) {
    var scope = Object.create(transform);

    scope.data = function(v) {
      var action = {
        impl: eo_transform_data,
        value: v,
        actions: [],
        enterActions: [],
        exitActions: []
      }
      actions.push(action);
      var s = transform_scope(action.actions);
      s.enter = transform_scope(action.enterActions);
      s.exit = transform_scope(action.exitActions);
      s.key = function(n, v) {
        action.key = {name: ns.qualify(n), value: v};
        return s;
      };
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

    scope.remove = function(s) {
      actions.push({
        impl: eo_transform_remove,
        selector: s
      });
      return scope;
    };

    scope.text = function(v) {
      actions.push({
        impl: eo_transform_text,
        value: v
      });
      return scope;
    };

    scope.select = function(s) {
      var action = {
        impl: eo_transform_select,
        selector: s,
        actions: []
      };
      actions.push(action);
      return transform_scope(action.actions);
    };

    scope.selectAll = function(s) {
      var action = {
        impl: eo_transform_select_all,
        selector: s,
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
  if (n.local) {
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
  if (n.local) {
    for (var i = 0; i < m; ++i) {
      children.push(nodes[i].appendChild(document.createElementNS(n.space, n.local)));
    }
  } else {
    for (var i = 0; i < m; ++i) {
      children.push(nodes[i].appendChild(document.createElement(n)));
    }
  }
  // XXX eo_transform_node_stack?
  eo_transform_actions(this.actions, children, data);
}

function eo_transform_remove(nodes, data) {
  var m = nodes.length,
      s = this.selector,
      r, // the selector results for the current node
      i, // the node index
      j, // the result index
      k, // the result length
      o; // the node being removed
  if (s == null) {
    for (i = 0; i < m; ++i) {
      o = nodes[i];
      o.parentNode.removeChild(o);
    }
  } else {
    for (i = 0; i < m; ++i) {
      r = nodes[i].querySelectorAll(s);
      for (j = 0, k = r.length; j < k; j++) {
        o = r[j];
        o.parentNode.removeChild(o);
      }
    }
  }
}

function eo_transform_text(nodes, data) {
  var m = nodes.length,
      v = this.value,
      i,
      o,
      x;
  if (typeof v == "function") {
    for (i = 0; i < m; ++i) {
      eo_transform_stack[0] = data[i];
      x = v.apply(null, eo_transform_stack);
      o = nodes[i];
      while (o.lastChild) o.removeChild(o.lastChild);
      o.appendChild(document.createTextNode(x));
    }
  } else {
    for (i = 0; i < m; ++i) {
      o = nodes[i];
      while (o.lastChild) o.removeChild(o.lastChild);
      o.appendChild(document.createTextNode(v));
    }
  }
}

function eo_transform_select(nodes, data) {
  var selectNodes = [],
      m = nodes.length,
      s = this.selector,
      i; // the node index
  for (i = 0; i < m; ++i) {
    selectNodes.push(nodes[i].querySelector(s));
  }
  // XXX eo_transform_node_stack?
  eo_transform_actions(this.actions, selectNodes, data);
}

function eo_transform_select_all(nodes, data) {
  var m = nodes.length,
      s = this.selector,
      i, // the node index
      o; // the current node
  eo_transform_stack.unshift(null);
  eo_transform_node_stack.unshift(null);
  eo_transform_index_stack.unshift(null);
  for (i = 0; i < m; ++i) {
    eo_transform_stack[1] = data[i];
    eo_transform_node_stack[0] = o = nodes[i];
    eo_transform_index_stack[0] = i;
    eo_transform_actions(this.actions, o.querySelectorAll(s), data);
  }
  eo_transform_stack.shift();
  eo_transform_node_stack.shift();
  eo_transform_index_stack.shift();
}

var eo_transform_stack = [],
    eo_transform_node_stack = [],
    eo_transform_index_stack = [];

function eo_transform_data(nodes) {
  var data = this.value,
      m = nodes.length,
      n, // data length
      key = this.key,
      kn, // key name
      kv, // key value
      k, // current key
      i, // current index
      j, // current index
      d, // current datum
      o, // current node
      enterNodes = [],
      enterData = [],
      updateNodes = [],
      updateData = [],
      exitNodes = [],
      exitData = [],
      nodesByKey,
      dataByKey;

  if (typeof data == "function") {
    eo_transform_stack[0] = eo_transform_index_stack[0]; // XXX
    data = data.apply(null, eo_transform_stack);
  }

  n = data.length;

  if (key) {
    kn = key.name;
    kv = key.value;
    nodesByKey = {};
    dataByKey = {};

    // compute map from key -> node
    if (kn.local) {
      for (i = 0; i < m; ++i) {
        o = nodes[i];
        k = o.getAttributeNS(kn.space, kn.local);
        if (k != null) nodesByKey[k] = o;
      }
    } else {
      for (i = 0; i < m; ++i) {
        o = nodes[i];
        k = o.getAttribute(kn);
        if (k != null) nodesByKey[k] = o;
      }
    }

    // compute map from key -> data
    for (i = 0; i < n; ++i) {
      eo_transform_stack[0] = d = data[i];
      k = kv.apply(null, eo_transform_stack);
      if (k != null) dataByKey[k] = d;
    }

    // compute entering and updating nodes
    for (k in dataByKey) {
      d = dataByKey[k];
      if (k in nodesByKey) {
        updateNodes.push(nodesByKey[k]);
        updateData.push(d);
      } else {
        enterNodes.push(eo_transform_node_stack[0]); // XXX what about add?
        enterData.push(d);
      }
    }

    // compute exiting nodes
    for (k in nodesByKey) {
      if (!(k in dataByKey)) {
        exitNodes.push(nodesByKey[k]);
        exitData.push(null);
      }
    }
  } else {
    k = n < m ? n : m;

    // compute updating nodes
    for (i = 0; i < k; ++i) {
      updateNodes.push(nodes[i]);
      updateData.push(data[i]);
    }

    // compute entering nodes
    for (j = i; j < n; ++j) {
      enterNodes.push(eo_transform_node_stack[0]); // XXX what about add?
      enterData.push(data[j]);
    }

    // compute exiting nodes
    for (j = i; j < m; ++j) {
      exitNodes.push(nodes[j]);
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
