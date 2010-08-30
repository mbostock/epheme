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
    return eo_select.apply(null, eo_subselect(items, data, e));
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
    return eo_transitioner().select(items, data);
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

function eo_subselect(items, data, e) {
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
  return [subitems, subdata];
}

var empty = {};
