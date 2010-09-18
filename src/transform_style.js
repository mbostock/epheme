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
      x = v.apply(o, eo_transform_stack);
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

function eo_transform_style_tween(nodes) {
  var m = nodes.length,
      n = this.name,
      v = this.value,
      p = this.priority,
      T = this.tween,
      t = this.tweens,
      i, // current index
      o; // current node

  if (!t) {
    t = this.tweens = [];
    if (typeof v == "function") {
      for (i = 0; i < m; ++i) {
        eo_transform_stack[0] = (o = nodes[i]).data;
        t.push(T(o.style.getPropertyValue(n), v.apply(o, eo_transform_stack)));
      }
    } else {
      for (i = 0; i < m; ++i) {
        t.push(T(nodes[i].node.style.getPropertyValue(n), v));
      }
    }
  }

  for (i = 0; i < m; ++i) {
    nodes[i].node.style.setProperty(n, t[i](), p);
  }
}
