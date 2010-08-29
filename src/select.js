eo.select = function(e) {
  var select = {},
      items;

  if (typeof e == "string") {
    items = xpath(e);
  } else if (e instanceof Array) {
    items = e.slice();
  } else {
    items = [e];
  }

  select.add = function(n) {
    var children = [];
    for (var i = 0; i < items.length; i++) {
      var e = items[i];
      children.push(e.appendChild(ns.create(n)));
    }
    return eo.select(children);
  };

  // TODO argument to value function should be a selector? Alternatively, the
  // selector could track the index internally, and thus calling attr("opacity")
  // would return the value of the opacity attribute on the active node.

  select.attr = function(n, v) {
    if (v == null) {
      for (var i = 0; i < items.length; i++) {
        items[i].removeAttribute(n);
      }
    } else if (typeof v == "function") {
      for (var i = 0; i < items.length; i++) {
        var e = items[i],
            x = v.call(select, e);
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
            x = v.call(select, e);
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
            x = v.call(select, e);
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

  return select;
};

function xpath(e) {
  var items = [],
      item,
      xpr = document.evaluate(
          e, // XPath expression
          document, // context node
          ns.resolve, // namespace resolver
          XPathResult.UNORDERED_NODE_ITERATOR_TYPE, // result type
          null); // result object
  while ((item = xpr.iterateNext()) != null) items.push(item);
  return items;
}
