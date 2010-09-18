eo.selectAll = function(s) {
  return eo_transform().selectAll(s);
};

function eo_transform_select_all(nodes, pass) {
  var m = nodes.length,
      s = this.selector,
      i, // the node index
      o, // the current node
      p; // the current node
  eo_transform_stack.unshift(null);
  for (i = 0; i < m; ++i) {
    eo_transform_stack[1] = (o = nodes[i]).data;
    pass(this.actions, eo_transform_nodes((p = o.node).querySelectorAll(s), p));
  }
  eo_transform_stack.shift();
}

function eo_transform_nodes(x, p) {
  var nodes = [],
      i = 0,
      n = x.length;
  nodes.parentNode = p;
  for (; i < n; i++) nodes.push({node: x[i], index: i});
  return nodes;
}
