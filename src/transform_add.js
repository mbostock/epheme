function eo_transform_add(nodes, data) {
  var m = nodes.length,
      n = this.name,
      childNodes = [],
      i; // current index
  if (n.local) {
    for (i = 0; i < m; ++i) {
      childNodes.push(nodes[i].appendChild(document.createElementNS(n.space, n.local)));
    }
  } else {
    for (i = 0; i < m; ++i) {
      childNodes.push(nodes[i].appendChild(document.createElement(n)));
    }
  }
  // XXX eo_transform_node_stack?
  eo_transform_actions(this.actions, childNodes, data);
}
