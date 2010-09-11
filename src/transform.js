var eo_transform_stack = [];

function eo_transform() {
  var transform = {},
      actions = [];

  // TODO transitions:
  // duration, delay, etc.
  // per-element delay would be great
  // are transitions scoped, or global?

  // TODO api uncertainty:
  // convenience method for replacing elements?
  // how to insert new element at a given location?
  // how to move elements around, sort, reverse or reorder?

  function transform_scope(actions) {
    var scope = Object.create(transform);

    scope.data = function(v) {
      var subscope, action = {
        impl: eo_transform_data,
        value: v,
        actions: [],
        enterActions: [],
        exitActions: []
      };
      actions.push(action);
      subscope = transform_scope(action.actions);
      subscope.enter = transform_scope(action.enterActions);
      subscope.exit = transform_scope(action.exitActions);
      subscope.key = function(n, v) {
        action.key = {name: ns.qualify(n), value: v};
        return subscope;
      };
      return subscope;
    };

    scope.attr = function(n, v) {
      actions.push({
        impl: eo_transform_attr,
        name: ns.qualify(n),
        value: v
      });
      return scope;
    };

    scope.style = function(n, v, p) {
      actions.push({
        impl: eo_transform_style,
        name: n,
        value: v,
        priority: arguments.length < 3 ? null : p
      });
      return scope;
    };

    scope.add = function(n, v) {
      var action = {
        impl: eo_transform_add,
        name: ns.qualify(n),
        value: v,
        actions: []
      };
      actions.push(action);
      return transform_scope(action.actions);
    };

    scope.remove = function(s) {
      actions.push({
        impl: eo_transform_remove,
        selector: s
      });
      return scope;
    };

    scope.text = function(v) {
      actions.push({
        impl: eo_transform_text,
        value: v
      });
      return scope;
    };

    scope.filter = function(f) {
      var action = {
        impl: eo_transform_filter,
        filter: f,
        actions: []
      };
      actions.push(action);
      return transform_scope(action.actions);
    };

    scope.select = function(s) {
      var action = {
        impl: eo_transform_select,
        selector: s,
        actions: []
      };
      actions.push(action);
      return transform_scope(action.actions);
    };

    scope.selectAll = function(s) {
      var action = {
        impl: eo_transform_select_all,
        selector: s,
        actions: []
      };
      actions.push(action);
      return transform_scope(action.actions);
    };

    return scope;
  }

  transform.apply = function() {
    eo_transform_stack.unshift(null);
    eo_transform_actions(actions, [{node: document, index: 0}]);
    eo_transform_stack.shift();
    return transform;
  };

  return transform_scope(actions);
}

eo.select = function(s) {
  return eo_transform().select(s);
};

eo.selectAll = function(s) {
  return eo_transform().selectAll(s);
};
