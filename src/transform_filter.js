function eo_transform_filter(nodes) {
  var filteredNodes = [],
      m = nodes.length,
      f = this.filter,
      i, // the node index
      o; // current item
  for (i = 0; i < m; ++i) {
    eo_transform_stack[0] = (o = nodes[i]).data;
    if (f.apply(o, eo_transform_stack)) filteredNodes.push(o);
  }
  eo_transform_actions(this.actions, filteredNodes);
}
