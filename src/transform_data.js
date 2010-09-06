function eo_transform_data(nodes) {
  var data = this.value,
      m = nodes.length,
      n, // data length
      key = this.key,
      kn, // key name
      kv, // key value
      k, // current key
      i, // current index
      j, // current index
      d, // current datum
      o, // current node
      enterNodes = [],
      enterData = [],
      updateNodes = [],
      updateData = [],
      exitNodes = [],
      exitData = [],
      nodesByKey, // map key -> node
      dataByKey; // map key -> data

  if (typeof data == "function") {
    eo_transform_stack[0] = eo_transform_index_stack[0];
    data = data.apply(null, eo_transform_stack);
  }

  n = data.length;

  if (key) {
    kn = key.name;
    kv = key.value;
    nodesByKey = {};
    dataByKey = {};

    // compute map from key -> node
    if (kn.local) {
      for (i = 0; i < m; ++i) {
        o = nodes[i];
        k = o.getAttributeNS(kn.space, kn.local);
        if (k != null) nodesByKey[k] = o;
      }
    } else {
      for (i = 0; i < m; ++i) {
        o = nodes[i];
        k = o.getAttribute(kn);
        if (k != null) nodesByKey[k] = o;
      }
    }

    // compute map from key -> data
    for (i = 0; i < n; ++i) {
      eo_transform_stack[0] = d = data[i];
      k = kv.apply(null, eo_transform_stack);
      if (k != null) dataByKey[k] = d;
    }

    // compute entering and updating nodes
    for (k in dataByKey) {
      d = dataByKey[k];
      if (k in nodesByKey) {
        updateNodes.push(nodesByKey[k]);
        updateData.push(d);
      } else {
        enterNodes.push(eo_transform_node_stack[0]);
        enterData.push(d);
      }
    }

    // compute exiting nodes
    for (k in nodesByKey) {
      if (!(k in dataByKey)) {
        exitNodes.push(nodesByKey[k]);
        exitData.push(null);
      }
    }
  } else {
    k = n < m ? n : m;

    // compute updating nodes
    for (i = 0; i < k; ++i) {
      updateNodes.push(nodes[i]);
      updateData.push(data[i]);
    }

    // compute entering nodes
    for (j = i; j < n; ++j) {
      enterNodes.push(eo_transform_node_stack[0]);
      enterData.push(data[j]);
    }

    // compute exiting nodes
    for (j = i; j < m; ++j) {
      exitNodes.push(nodes[j]);
      exitData.push(null);
    }
  }

  // console.log("enter", enterData);
  // console.log("update", updateData);
  // console.log("exit", exitData);

  eo_transform_actions(this.enterActions, enterNodes, enterData);
  eo_transform_actions(this.actions, updateNodes, updateData);
  eo_transform_actions(this.exitActions, exitNodes, exitData);
}
