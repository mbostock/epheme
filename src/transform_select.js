function eo_transform_select(nodes, data) {
  var selectedNodes = [],
      m = nodes.length,
      s = this.selector,
      i; // the node index
  for (i = 0; i < m; ++i) selectedNodes.push(nodes[i].querySelector(s));
  // XXX eo_transform_node_stack?
  eo_transform_actions(this.actions, selectedNodes, data);
}
