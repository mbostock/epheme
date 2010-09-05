eo.transform = function(e) {
  var transform = {},
      actions = [];

  // TODO features:
  // transition duration, delay, etc.
  // data binding

  // TODO api uncertainty:
  // can transitions be scoped, or global to the transform?
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

  function transform_scope(nodes) {
    var scope = Object.create(transform);

    scope.attr = function(n, v) {
      actions.push({
        impl: eo_transform_attr,
        nodes: nodes,
        name: n,
        value: v
      });
      return scope;
    };

    scope.style = function(n, v, p) {
      actions.push({
        impl: eo_transform_style,
        nodes: nodes,
        name: n,
        value: v,
        priority: arguments.length < 3 ? null : p
      });
      return scope;
    };

    scope.add = function(n, v) {
      var action = {
        impl: eo_transform_add,
        nodes: nodes,
        results: [],
        name: n,
        value: v
      };
      actions.push(action);
      return transform_scope(action.results);
    };

    scope.remove = function(e) {
      actions.push({
        impl: eo_transform_remove,
        nodes: nodes,
        expression: document.createExpression(e, ns.resolve)
      });
      return scope;
    };

    scope.value = function(v) {
      actions.push({
        impl: eo_transform_value,
        nodes: nodes,
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
        nodes: nodes,
        results: [],
        expression: document.createExpression(e, ns.resolve)
      };
      actions.push(action);
      return transform_scope(action.results);
    };

    return scope;
  }

  transform.apply = function() {
    for (var i = 0, n = actions.length; i < n; ++i) actions[i].impl();
    return transform;
  };

  return transform_scope([document]);
};

function eo_transform_attr() {
  var nodes = this.nodes,
      m = nodes.length,
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
        var o = nodes[i],
            x = v.call(o);
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
      var o = nodes[i],
          x = v.call(o);
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

function eo_transform_style() {
  var nodes = this.nodes,
      m = nodes.length,
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
      var o = nodes[i],
          x = v.call(o);
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

function eo_transform_add() {
  var nodes = this.nodes,
      m = nodes.length,
      n = ns.qualify(this.name),
      results = this.results;
  results.length = 0;
  if (n.space) {
    for (var i = 0; i < m; ++i) {
      results.push(nodes[i].appendChild(document.createElementNS(n.space, n.local)));
    }
  } else if (n == "#text") {
    var v = this.value,
        f = typeof v == "function" && v;
    if (f) {
      for (var i = 0; i < m; ++i) {
        var o = nodes[i],
            x = v.call(o);
        results.push(o.appendChild(document.createTextNode(x)));
      }
    } else {
      for (var i = 0; i < m; ++i) {
        results.push(nodes[i].appendChild(document.createTextNode(v)));
      }
    }
  } else {
    for (var i = 0; i < m; ++i) {
      results.push(nodes[i].appendChild(document.createElement(n)));
    }
  }
}

function eo_transform_remove() {
  var nodes = this.nodes,
      m = nodes.length,
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

function eo_transform_value() {
  var nodes = this.nodes,
      m = nodes.length,
      v = this.value,
      f = typeof v == "function" && v;
  if (f) {
    for (var i = 0; i < m; ++i) {
      var o = nodes[i],
          x = v.call(o);
      o.nodeValue = x;
    }
  } else {
    for (var i = 0; i < m; ++i) {
      nodes[i].nodeValue = v;
    }
  }
}

function eo_transform_select() {
  var nodes = this.nodes,
      results = this.results,
      m = nodes.length,
      e = this.expression,
      r = null,
      o;
  results.length = 0;
  for (var i = 0; i < m; ++i) {
    r = e.evaluate(nodes[i], XPathResult.UNORDERED_NODE_ITERATOR_TYPE, r);
    while ((o = r.iterateNext()) != null) results.push(o);
  }
}
