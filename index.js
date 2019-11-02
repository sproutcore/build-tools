/*jshint node:true */

// the basic setup of the build tools is to first parse the configuration
// the configuration should contain specific settings for either dev or deploy / serve or build

//var vm = require('vm');

var util = require('util');
//var http = require('http');
//var repl = require('repl');
var dirname = __dirname; // dirname of this file
//var events = require('events');
var pathlib = require('path');

var env = require('sproutnode');

var files = [
  'lib/core.js',
  'lib/logger.js',
  'lib/node_wrap.js',
  'lib/proxy.js',
  'lib/bt_socketio.js',
  'lib/project.js',
  'lib/file.js',
  'lib/filetypes.js',
  'lib/appbuilder.js',
  'lib/framework.js',
  'lib/theme.js',
  'lib/installer.js'
];

// we need to install some new stuff in the running context

files.forEach(function (f) {
  env.loadFile(pathlib.join(dirname, f));
});

module.exports.__env = env;

var loadScConfigs = function (projectpath, opts) {
  var p = opts.configFile || 'sc_config';
  if (p[0] !== '/') p = pathlib.join(projectpath, p);
  env.loadFile(p);
};

module.exports.startDevServer = function (projectpath, opts) {
  env.setPath('BT.runMode', "debug");
  try {
    env.setPath('BT.projectPath', projectpath);
    env.setPath('BT.curPath', projectpath);
    env.setPath('BT.btPath', dirname);
    env.setPath('BT.startTime', Date.now());
    if (opts.disableSocket) {
      env.setPath('BT.noSocket', true);
    }

    if (opts.logFile || opts.daemonize) {
      if (typeof opts.logFile !== 'string') opts.logFile = 'serve.log';
      env.runCode("BT.Logger.logFile = '"+opts.logFile+"'");
    }

    if (opts.includeTests) {
      // tests are off by default, change the appbuilder prototype to add tests to all loaded apps
      env.runCode("BT.AppBuilder.prototype.includeTests = true");
    }
    // this needs to be done _before_ the configs are loaded, otherwise we never get the traces
    // of the inits of the appBuilders or frameworks
    if (opts.logLevel) {
      env.runCode("BT.Logger.logOutputLevel = '"+opts.logLevel+"'");
    }
    loadScConfigs(projectpath, opts);

    // this should actually load the config
    //env.runCode("SC.Benchmark.verbose = true;");
    if (opts.outputFiles) {
      env.setPath("BT.outputFiles", opts.outputFiles);
    }
    if (opts.runBenchmarks) {
      env.setPath("BT.runBenchmarks", true);
      env.runCode("SC.Benchmark.start('BT_startup')");
      env.runCode("SC.Benchmark.start('sc_config_load')");
    }
    if (opts.localOnly !== undefined) {
      var lo;
      // prevent injection of code from the command line
      if (opts.localOnly === "true") {
        lo = "true";
      }
      if (opts.localOnly === "false") {
        lo = "false";
      }
      env.runCode("BT.serverConfig.localOnly = " + lo);
    }
    if (opts.port) {
      var p = parseInt(opts.port, 10); // make sure this is a number
      env.runCode("BT.serverConfig.port = " + p);
    }

    if (opts.daemonize) {
      require('daemon')();
    }

    env.runCode("SC.run(function() { BT.projectManager.startServer(); })");
    if (opts.hasREPL && !opts.daemonize) {
      env.repl();
    }
    //env.runCode("console.log(__dirname);");
  }
  catch (e) {
    util.log('error caught: ' + util.inspect(e, true, 10));
    if (e.code === 'ENOENT') {
      util.log("You did not create a valid project config file");
      throw e;
    }
    else if (e.message.indexOf("EMFILE") > -1 && e.message.indexOf("Too many opened files") > -1) {
      util.log("It seems your OS only allows a very limited number of open files. On OSX and Linux please run ulimit -n 4096");
      process.exit(1);
      //throw e;
    }
    else {
      throw e;
    }
  }
};


module.exports.startInstall = function (projectpath, opts) {
  env.setPath('BT.runMode', "install");
  env.setPath('BT.projectPath', projectpath);
  env.setPath('BT.curPath', projectpath);
  env.setPath('BT.btPath', dirname);
  var code = "SC.run(function () { BT.startInstall('";
  code += opts.gitUrl + "', { ";
  if (opts.isGlobal) code += "isGlobal: true, ";
  if (opts.logLevel) {
    code += "logLevel: '" + opts.logLevel + "', ";
  }
  if (opts.branch) {
    code += "branch: '" + opts.branch + "'";
  }
  code += "}); });";
  //util.log("about to run code: " + code);
  try {
    env.runCode(code);
  }
  catch (e) {
    throw e;
  }
};

module.exports.startBuild = function (projectpath, opts) {
  var util = require('util');
  env.setPath('BT.runMode', "build");
  env.setPath('BT.projectPath', projectpath);
  env.setPath('BT.curPath', projectpath);
  env.setPath('BT.btPath', dirname);
  env.setPath('BT.startTime', Date.now());
  try {
    if (opts.runBenchmarks) {
      env.setPath("BT.runBenchmarks", true);
    }
    if (opts.logLevel) {
      env.runCode("BT.Logger.logOutputLevel = '"+opts.logLevel+"'");
    }
    if (opts.apps.length > 0) {
      env.runCode("BT.BUILDTARGETS = " + JSON.stringify(opts.apps));
    }
    loadScConfigs(projectpath, opts);
    var code = "SC.run(function() { BT.projectManager.startBuild(" + JSON.stringify(opts) + "); });";
    var r = env.runCode(code);
    //util.log('return value of r: ' + util.inspect(r));
    if (opts.hasREPL) env.repl();
    if (r === "done" && !opts.hasREPL) process.exit(0);
  }
  catch (err) {
    util.log('error caught: ' + util.inspect(err, true, 10));
    if (err.code === 'ENOENT') {
      util.log("You did not create a valid project config file");
      throw err;
    }
    else if (err.message.indexOf("EMFILE") > -1 && err.message.indexOf("Too many opened files") > -1) {
      util.log("It seems your OS only allows a very limited number of open files. On OSX and Linux please run ulimit -n 4096");
      process.exit(1);
      //throw e;
    }
    else {
      throw err;
    }
  }
};
