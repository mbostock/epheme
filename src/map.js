eo.map = function(data) {
  var map = {},
      from,
      by;

  eo.dispatch(map);

  map.length = function() {
    return data.length;
  };

  map.datum = function(i) {
    return data[i];
  };

  map.from = function(e) {
    if (!arguments.length) return from;
    from = e;
    return map;
  };

  map.by = function(f) {
    if (!arguments.length) return by;
    by = f;
    return map;
  };

  // TODO Should the map object reorder elements to match the data order?
  // Perhaps the map object should have a sort property (or method) that
  // determines (or applies) the desired element order. Alternatively, this
  // could be handled in the `enter` handler.

  // TODO There should be a way to index the existing (from) elements, so that
  // we don't have to do an n^2 equality check to find out which elements need
  // removal. Is there a way to determine the data for the given element?

  map.apply = function(update) {
    if (!arguments.length) update = map.dispatch;
    var froms = eo.select(from); // select before update

    var items = [];
    for (var i = 0; i < data.length; i++) {
      var d = data[i],
          s = eo.select(by.call(map, d, i)),
          n = s.length();
      if (n) {
        update.call(map, {type: "update", target: s, data: d, index: i});
        for (var j = 0; j < n; j++) items.push(s.item(j));
      } else {
        map.dispatch({type: "enter", data: d, index: i});
      }
    }

    for (var i = 0; i < froms.length(); i++) {
      var e = froms.item(i), found = false;
      for (var j = 0; j < items.length; j++) {
        if (items[j] === e) {
          found = true;
          break;
        }
      }
      if (!found) map.dispatch({type: "exit", target: e});
    }

    return map;
  };

  return map;
};
