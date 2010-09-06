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
