var ns = {

  prefix: {
    svg: "http://www.w3.org/2000/svg",
    xhtml: "http://www.w3.org/1999/xhtml",
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  },

  resolve: function(prefix) {
    return ns.prefix[prefix] || null;
  },

  qualify: function(name) {
    var i = name.indexOf(":");
    return {
      space: ns.prefix[name.substring(0, i)],
      local: name.substring(i + 1)
    };
  },

  create: function(name) {
    name = ns.qualify(name);
    return name.space == null
        ? document.createElement(name.local)
        : document.createElementNS(name.space, name.local);
  }

};
