function eo_transform_select_all(nodes, data) {
  var m = nodes.length,
      s = this.selector,
      i, // the node index
      o; // the current node
  eo_transform_stack.unshift(null);
  eo_transform_node_stack.unshift(null);
  for (i = 0; i < m; ++i) {
    eo_transform_stack[1] = data[i];
    eo_transform_node_stack[0] = o = nodes[i];
    eo_transform_actions(this.actions, o.querySelectorAll(s), data);
  }
  eo_transform_stack.shift();
  eo_transform_node_stack.shift();
}
