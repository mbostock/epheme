if (!Object.create) Object.create = function(o) {
  /** @constructor */ function f() {}
  f.prototype = o;
  return new f();
};
(function(_) {
  var eo = (_.org || (_.org = {})).epheme = {};
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
var eo_transform_stack = [];

function eo_transform() {
  var transform = {},
      actions = [];

  // TODO transitions:
  // duration, delay, etc.
  // per-element delay would be great
  // are transitions scoped, or global?

  // TODO api uncertainty:
  // convenience method for replacing elements?
  // how to insert new element at a given location?
  // how to move elements around, sort, reverse or reorder?

  function transform_scope(actions) {
    var scope = Object.create(transform);

    scope.data = function(v) {
      var subscope, action = {
        impl: eo_transform_data,
        value: v,
        actions: [],
        enterActions: [],
        exitActions: []
      };
      actions.push(action);
      subscope = transform_scope(action.actions);
      subscope.enter = transform_scope(action.enterActions);
      subscope.exit = transform_scope(action.exitActions);
      subscope.key = function(n, v) {
        action.key = {name: ns.qualify(n), value: v};
        return subscope;
      };
      return subscope;
    };

    scope.attr = function(n, v) {
      actions.push({
        impl: eo_transform_attr,
        name: ns.qualify(n),
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
        name: ns.qualify(n),
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
    eo_transform_actions(actions, [{node: document, index: 0}]);
    eo_transform_stack.shift();
    return transform;
  };

  return transform_scope(actions);
}

eo.select = function(s) {
  return eo_transform().select(s);
};

eo.selectAll = function(s) {
  return eo_transform().selectAll(s);
};
function eo_transform_actions(actions, nodes) {
  var n = actions.length,
      i; // current index
  for (i = 0; i < n; ++i) actions[i].impl(nodes);
}
function eo_transform_add(nodes) {
  var m = nodes.length,
      n = this.name,
      childNodes = [],
      i, // current index
      o, // current node
      c; // current child
  if (n.local) {
    for (i = 0; i < m; ++i) {
      childNodes.push(c = Object.create(o = nodes[i]));
      c.node = (c.parentNode = o.node).appendChild(document.createElementNS(n.space, n.local));
    }
  } else {
    for (i = 0; i < m; ++i) {
      childNodes.push(c = Object.create(o = nodes[i]));
      c.node = (c.parentNode = o.node).appendChild(document.createElement(n));
    }
  }
  eo_transform_actions(this.actions, childNodes);
}
function eo_transform_attr(nodes) {
  var m = nodes.length,
      n = this.name,
      v = this.value,
      i, // current index
      o, // current node
      x; // current value (for value functions)
  if (n.local) {
    if (v == null) {
      for (i = 0; i < m; ++i) {
        nodes[i].node.removeAttributeNS(n.space, n.local);
      }
    } else if (typeof v == "function") {
      for (i = 0; i < m; ++i) {
        eo_transform_stack[0] = (o = nodes[i]).data;
        x = v.apply(o, eo_transform_stack);
        x == null
            ? o.node.removeAttributeNS(n.space, n.local)
            : o.node.setAttributeNS(n.space, n.local, x);
      }
    } else {
      for (i = 0; i < m; ++i) {
        nodes[i].node.setAttributeNS(n.space, n.local, v);
      }
    }
  } else if (v == null) {
    for (i = 0; i < m; ++i) {
      nodes[i].node.removeAttribute(n);
    }
  } else if (typeof v == "function") {
    for (i = 0; i < m; ++i) {
      eo_transform_stack[0] = (o = nodes[i]).data;
      x = v.apply(null, eo_transform_stack);
      x == null
          ? o.node.removeAttribute(n)
          : o.node.setAttribute(n, x);
    }
  } else {
    for (i = 0; i < m; ++i) {
      nodes[i].node.setAttribute(n, v);
    }
  }
}
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
      updateNodes = [],
      exitNodes = [],
      nodesByKey, // map key -> node
      dataByKey, // map key -> data
      indexesByKey; // map key -> index

  if (typeof data == "function") {
    d = eo_transform_stack.shift();
    data = data.apply(null, eo_transform_stack);
    eo_transform_stack.unshift(d);
  }

  n = data.length;

  if (key) {
    kn = key.name;
    kv = key.value;
    nodesByKey = {};
    dataByKey = {};
    indexesByKey = {};

    // compute map from key -> node
    if (kn.local) {
      for (i = 0; i < m; ++i) {
        o = nodes[i].node;
        if (o) {
          k = o.getAttributeNS(kn.space, kn.local);
          if (k != null) nodesByKey[k] = o;
        }
      }
    } else {
      for (i = 0; i < m; ++i) {
        o = nodes[i].node;
        if (o) {
          k = o.getAttribute(kn);
          if (k != null) nodesByKey[k] = o;
        }
      }
    }

    // compute map from key -> data
    for (i = 0; i < n; ++i) {
      eo_transform_stack[0] = d = data[i];
      k = kv.apply(null, eo_transform_stack);
      if (k != null) {
        dataByKey[k] = d;
        indexesByKey[k] = i;
      }
    }

    // compute entering and updating nodes
    for (k in dataByKey) {
      d = dataByKey[k];
      i = indexesByKey[k];
      if (o = nodesByKey[k]) {
        updateNodes.push({
          node: o,
          data: d,
          key: k,
          index: i
        });
      } else {
        enterNodes.push({
          node: nodes.parentNode,
          data: d,
          key: k,
          index: i
        });
      }
    }

    // compute exiting nodes
    for (k in nodesByKey) {
      if (!(k in dataByKey)) {
        exitNodes.push({node: nodesByKey[k]});
      }
    }
  } else {
    k = n < m ? n : m;

    // compute updating nodes
    for (i = 0; i < k; ++i) {
      (o = nodes[i]).data = data[i];
      if (o.node) {
        updateNodes.push(o);
      } else {
        o.node = o.parentNode;
        enterNodes.push(o);
      }
    }

    // compute entering nodes
    for (j = i; j < n; ++j) {
      enterNodes.push({
        node: nodes.parentNode,
        data: data[j],
        index: j
      });
    }

    // compute exiting nodes
    for (j = i; j < m; ++j) {
      exitNodes.push(nodes[j]);
    }
  }

  eo_transform_actions(this.enterActions, enterNodes);
  eo_transform_actions(this.actions, updateNodes);
  eo_transform_actions(this.exitActions, exitNodes);
}
function eo_transform_remove(nodes) {
  var m = nodes.length,
      s = this.selector,
      r, // the selected nodes (for selectors)
      i, // current node index
      j, // current selector index
      k, // current selector length
      o; // current node to remove
  if (s == null) {
    for (i = 0; i < m; ++i) {
      o = nodes[i].node;
      o.parentNode.removeChild(o);
    }
  } else {
    for (i = 0; i < m; ++i) {
      r = nodes[i].node.querySelectorAll(s);
      for (j = 0, k = r.length; j < k; j++) {
        o = r[j];
        o.parentNode.removeChild(o);
      }
    }
  }
}
function eo_transform_select(nodes) {
  var selectedNodes = [],
      m = nodes.length,
      s = this.selector,
      i, // the node index
      o, // current node
      c; // current child
  for (i = 0; i < m; ++i) {
    selectedNodes.push(c = Object.create(o = nodes[i]));
    c.node = (c.parentNode = o.node).querySelector(s);
  }
  eo_transform_actions(this.actions, selectedNodes);
}
function eo_transform_select_all(nodes) {
  var m = nodes.length,
      s = this.selector,
      i, // the node index
      o, // the current node
      p; // the current node
  eo_transform_stack.unshift(null);
  for (i = 0; i < m; ++i) {
    eo_transform_stack[1] = (o = nodes[i]).data;
    eo_transform_actions(this.actions, eo_transform_nodes((p = o.node).querySelectorAll(s), p));
  }
  eo_transform_stack.shift();
}

function eo_transform_nodes(x, p) {
  var nodes = [],
      i = 0,
      n = x.length;
  nodes.parentNode = p;
  for (; i < n; i++) nodes.push({node: x[i], index: i});
  return nodes;
}
function eo_transform_style(nodes) {
  var m = nodes.length,
      n = this.name,
      v = this.value,
      p = this.priority,
      i, // current index
      o, // current node
      x; // current value (for value functions)
  if (v == null) {
    for (i = 0; i < m; ++i) {
      nodes[i].node.style.removeProperty(n);
    }
  } else if (typeof v == "function") {
    for (i = 0; i < m; ++i) {
      o = nodes[i];
      eo_transform_stack[0] = o.data;
      x = v.apply(null, eo_transform_stack);
      x == null
          ? o.node.style.removeProperty(n)
          : o.node.style.setProperty(n, x, p);
    }
  } else {
    for (i = 0; i < m; ++i) {
      nodes[i].node.style.setProperty(n, v, p);
    }
  }
}
function eo_transform_text(nodes) {
  var m = nodes.length,
      v = this.value,
      i, // current node index
      o, // current node
      x; // current value (for value functions)
  if (typeof v == "function") {
    for (i = 0; i < m; ++i) {
      o = nodes[i];
      eo_transform_stack[0] = o.data;
      x = v.apply(null, eo_transform_stack);
      o = o.node;
      while (o.lastChild) o.removeChild(o.lastChild);
      o.appendChild(document.createTextNode(x));
    }
  } else {
    for (i = 0; i < m; ++i) {
      o = nodes[i].node;
      while (o.lastChild) o.removeChild(o.lastChild);
      o.appendChild(document.createTextNode(v));
    }
  }
}
})(this);
