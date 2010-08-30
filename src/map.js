eo.map = function(data) {
  var map = {},
      from,
      by;

  eo.dispatch(map);

  // TODO defensive copy of data?
  // TODO is it right to expose the length & datum methods?

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

    var added = [], addedData = [],
        updated = [], updatedData = [];
    for (var i = 0; i < data.length; i++) {
      var d = data[i],
          s = eo.select(by.call(map, d, i)),
          n = s.length();
      if (n) {
        for (var j = 0; j < n; j++) {
          updated.push(s.item(j));
          updatedData.push(d);
        }
      } else {
        added.push(null);
        addedData.push(d);
      }
    }

    var removed = [], existing = eo.select(from);
    outer: for (var i = 0; i < existing.length(); i++) {
      var e = existing.item(i), found = false;
      for (var j = 0; j < added.length; j++) {
        if (added[j] === e) continue outer;
      }
      for (var j = 0; j < updated.length; j++) {
        if (updated[j] === e) continue outer;
      }
      removed.push(e);
    }

    if (added.length) map.dispatch({type: "enter", target: eo.select(added, addedData)});
    if (updated.length) map.dispatch({type: "update", target: eo.select(updated, updatedData)});
    if (removed.length) map.dispatch({type: "exit", target: eo.select(removed)});
    return map;
  };

  return map;
};
