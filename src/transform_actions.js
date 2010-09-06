function eo_transform_actions(actions, nodes, data) {
  var n = actions.length,
      i; // current index
  for (i = 0; i < n; ++i) actions[i].impl(nodes, data);
}
