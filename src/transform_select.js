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
