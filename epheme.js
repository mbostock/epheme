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
var eo_transform_stack = [],
    eo_transform_node_stack = [],
    eo_transform_index_stack = [],
    eo_transform_empty = [];

eo.transform = function() {
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
    eo_transform_actions(actions, [document], eo_transform_empty);
    eo_transform_stack.shift();
    return transform;
  };

  return transform_scope(actions);
};
function eo_transform_actions(actions, nodes, data) {
  var n = actions.length,
      i; // current index
  for (i = 0; i < n; ++i) actions[i].impl(nodes, data);
}
function eo_transform_add(nodes, data) {
  var m = nodes.length,
      n = this.name,
      childNodes = [],
      i; // current index
  if (n.local) {
    for (i = 0; i < m; ++i) {
      childNodes.push(nodes[i].appendChild(document.createElementNS(n.space, n.local)));
    }
  } else {
    for (i = 0; i < m; ++i) {
      childNodes.push(nodes[i].appendChild(document.createElement(n)));
    }
  }
  // XXX eo_transform_node_stack?
  eo_transform_actions(this.actions, childNodes, data);
}
function eo_transform_attr(nodes, data) {
  var m = nodes.length,
      n = this.name,
      v = this.value,
      i, // current index
      o, // current node
      x; // current value (for value functions)
  if (n.local) {
    if (v == null) {
      for (i = 0; i < m; ++i) {
        nodes[i].removeAttributeNS(n.space, n.local);
      }
    } else if (typeof v == "function") {
      for (i = 0; i < m; ++i) {
        eo_transform_stack[0] = data[i];
        o = nodes[i];
        x = v.apply(null, eo_transform_stack);
        x == null
            ? o.removeAttributeNS(n.space, n.local)
            : o.setAttributeNS(n.space, n.local, x);
      }
    } else {
      for (i = 0; i < m; ++i) {
        nodes[i].setAttributeNS(n.space, n.local, v);
      }
    }
  } else if (v == null) {
    for (i = 0; i < m; ++i) {
      nodes[i].removeAttribute(n);
    }
  } else if (typeof v == "function") {
    for (i = 0; i < m; ++i) {
      eo_transform_stack[0] = data[i];
      o = nodes[i];
      x = v.apply(null, eo_transform_stack);
      x == null
          ? o.removeAttribute(n)
          : o.setAttribute(n, x);
    }
  } else {
    for (i = 0; i < m; ++i) {
      nodes[i].setAttribute(n, v);
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
      enterData = [],
      updateNodes = [],
      updateData = [],
      exitNodes = [],
      exitData = [],
      nodesByKey, // map key -> node
      dataByKey; // map key -> data

  if (typeof data == "function") {
    eo_transform_stack[0] = eo_transform_index_stack[0];
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
        enterNodes.push(eo_transform_node_stack[0]);
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
      enterNodes.push(eo_transform_node_stack[0]);
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
function eo_transform_remove(nodes, data) {
  var m = nodes.length,
      s = this.selector,
      r, // the selected nodes (for selectors)
      i, // current node index
      j, // current selector index
      k, // current selector length
      o; // current node to remove
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
function eo_transform_select(nodes, data) {
  var selectedNodes = [],
      m = nodes.length,
      s = this.selector,
      i; // the node index
  for (i = 0; i < m; ++i) selectedNodes.push(nodes[i].querySelector(s));
  // XXX eo_transform_node_stack?
  eo_transform_actions(this.actions, selectedNodes, data);
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
function eo_transform_style(nodes, data) {
  var m = nodes.length,
      n = this.name,
      v = this.value,
      p = this.priority,
      i, // current index
      o, // current node
      x; // current value (for value functions)
  if (v == null) {
    for (i = 0; i < m; ++i) {
      nodes[i].style.removeProperty(n);
    }
  } else if (typeof v == "function") {
    for (i = 0; i < m; ++i) {
      eo_transform_stack[0] = data[i];
      o = nodes[i];
      x = v.apply(null, eo_transform_stack);
      x == null
          ? o.style.removeProperty(n)
          : o.style.setProperty(n, x, p);
    }
  } else {
    for (i = 0; i < m; ++i) {
      nodes[i].style.setProperty(n, v, p);
    }
  }
}
function eo_transform_text(nodes, data) {
  var m = nodes.length,
      v = this.value,
      i, // current node index
      o, // current node
      x; // current value (for value functions)
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
})(this);
