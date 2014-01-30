

var frameworkObj = {
  type: "object",
  properties: { // we do not have known properties, only unknown
  },
  additionalProperties: { // but these unknown properties need to match
    type: "object",
    properties: {
      name: { type: "string"},
      path: { type: "string"}, // no additional checks
      combineScripts: { type: "boolean"},
      combineStylesheets: { type: "boolean" },
      minifyScripts: { type: "boolean"},
      minifyStylesheets: {type: "boolean"},
      stylesheetProcessor: {type: "string"},
      watchForChanges: {type: "boolean"},
      dontProcess: { type: "boolean"},
      dependencies: { type: "array", items: { type: "string"}},
      testDependencies: { type: "array", items: { type: "string"}}
    }
  }
};

var frameworkArray = {
  type: "array",
  items: {
    type: "string"
  }
};

var appObj = {
  type: "object",
  properties: {
    name: { type: "string" },
    path: { type: "string" },
    theme: { type: "string" },
    buildLanguage: { type: "string" },
    htmlHead: {
      oneOf: [
        { type: "string"},
        { type: "array", items: { type: "string"}}
      ]
    },
    htmlBody: { type: "string"},
    urlPrefix: { type: "string" },
    includeSC: { type: "boolean"},
    include: { type: "boolean"},
    combineScripts: { type: "boolean"},
    combineStylesheets: { type: "boolean" },
    minifyScripts: { type: "boolean"},
    minifyStylesheets: {type: "boolean"},
    stylesheetProcessor: {type: "string"},
    dependencies: {
      oneOf: [
        frameworkArray,
        frameworkObj
      ]
    }
  }
};

var pluginObj = {
  type: "object",
  properties: {
    type: { type: "string" },
    extension: { type: "string"},
    node_module: { type: "string "}
  }
};

var serverObj = {
  type: "object",
  properties: {
    proxies: {
      type: "array",
      items: {
        prefix: { type: "string" },
        host: { type: "string" },
        port: { type: "number" },
        proxyPrefix: { type: "string" }
      }
    },
    port: { type: "number"},
    allowFromAll: { type: "boolean"}
  }
};


