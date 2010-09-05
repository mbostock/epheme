eo.transform = function(e) {
  var transform = eo.dispatch({}),
      actions = [];

  e = document.createExpression(e, ns.resolve),

  // TODO transition duration, delay, etc.
  // TODO data binding
  // TODO optimize arguments to action implementation?
  // TODO use sizzle selectors rather than xpath?
  // TODO how to insert or replace elements?
  // TODO how to move elements around, sort, reverse or reorder?
  // TODO add returns select(added elements)?
  // TODO remove returns select(removed elements)?
  // TODO text is more efficient by reusing existing firstChild.nodeValue?
  // TODO sub-select

  // Somewhat confusing: the node name specified to the add and remove methods
  // is not the same as the XPath selector expressions. For example, "#text" is
  // used to create a text node, as this corresponds to the W3C nodeName.
  // However, to select text nodes in XPath, text() is used instead. CSS
  // selectors have the same problem, as #text refers to the ID "text".

  transform.attr = function(n, v) {
    actions.push({
      impl: eo_attr,
      name: n,
      value: v
    });
    return transform;
  };

  transform.style = function(n, v, p) {
    actions.push({
      impl: eo_style,
      name: n,
      value: v,
      priority: arguments.length < 3 ? null : p
    });
    return transform;
  };

  transform.add = function(n, v) {
    actions.push({
      impl: eo_add,
      name: n,
      value: v
    });
    return transform;
  };

  transform.remove = function(e) {
    actions.push({
      impl: eo_remove,
      expression: document.createExpression(e, ns.resolve)
    });
    return transform;
  };

  transform.value = function(v) {
    actions.push({
      impl: eo_value,
      value: v
    });
    return transform;
  };

  transform.text = function(v) {
    transform.remove("text()").add("#text", v);
    return transform;
  };

  transform.select = function(e) {
    return transform;
  };

  transform.apply = function() {
    var nodes = [],
        r = e.evaluate(document, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null),
        o;
    while ((o = r.iterateNext()) != null) nodes.push(o);
    for (var i = 0, n = actions.length; i < n; ++i) actions[i].impl(nodes);
    return transform;
  };

  return transform;
};

function eo_attr(nodes) {
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

function eo_style(nodes) {
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

function eo_add(nodes) {
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
        var o = nodes[i],
            x = v.call(o);
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
  return children;
}

function eo_remove(nodes) {
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

function eo_value(nodes) {
  var m = nodes.length,
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
