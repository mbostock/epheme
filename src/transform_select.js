function eo_transform_select(nodes) {
  var selectedNodes = [],
      m = nodes.length,
      s = this.selector,
      i, // the node index
      o, // current item
      p, // current node
      c, // current selected item
      e; // current selected node
  for (i = 0; i < m; ++i) {
    e = (p = (o = nodes[i]).node).querySelector(s);
    if (e != null) {
      selectedNodes.push(c = Object.create(o));
      c.parentNode = p;
      c.node = e;
    }
  }
  eo_transform_actions(this.actions, selectedNodes);
}
