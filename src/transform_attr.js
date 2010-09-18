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
      x = v.apply(o, eo_transform_stack);
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

function eo_transform_attr_tween(nodes) {
  var m = nodes.length,
      n = this.name,
      v = this.value,
      T = this.tween,
      t = this.tweens,
      i, // current index
      o; // current node

  if (!t) {
    t = this.tweens = [];
    if (n.local) {
      if (typeof v == "function") {
        for (i = 0; i < m; ++i) {
          eo_transform_stack[0] = (o = nodes[i]).data;
          t.push(T(o.node.getAttributeNS(n.space, n.local), v.apply(o, eo_transform_stack)));
        }
      } else {
        for (i = 0; i < m; ++i) {
          t.push(T(nodes[i].node.getAttributeNS(n.space, n.local), v));
        }
      }
    } else if (typeof v == "function") {
      for (i = 0; i < m; ++i) {
        eo_transform_stack[0] = (o = nodes[i]).data;
        t.push(T(o.node.getAttribute(n), v.apply(o, eo_transform_stack)));
      }
    } else {
      for (i = 0; i < m; ++i) {
        t.push(T(nodes[i].node.getAttribute(n), v));
      }
    }
  }

  if (n.local) {
    for (i = 0; i < m; ++i) {
      nodes[i].node.setAttributeNS(n.space, n.local, t[i]());
    }
  } else {
    for (i = 0; i < m; ++i) {
      nodes[i].node.setAttribute(n, t[i]());
    }
  }
}
