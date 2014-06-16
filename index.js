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
  'lib/node_wrap.js',
  'lib/fs.js',
  'lib/proxy.js',
  'lib/project.js',
  'lib/file.js',
  'lib/filetypes.js',
  'lib/appbuilder.js',
  'lib/api.js',
  'lib/framework.js',
  'lib/theme.js',
  'lib/installer.js'
];

// we need to install some new stuff in the running context

files.forEach(function (f) {
  env.loadFile(pathlib.join(dirname, f));
});

module.exports.__env = env;

var loadScConfigs = function (projectpath) {
  var appsPath = pathlib.join(projectpath, 'apps'),
    fslib = require('fs'),
    appList = fslib.readdirSync(appsPath);

  appList.forEach(function (fn) {
    var appConfig = pathlib.join(appsPath, fn, 'sc_config');
    if (fslib.existsSync(appConfig)) env.loadFile(appConfig);
  });
  
  var p = pathlib.join(projectpath, 'sc_config');
  env.loadFile(p);
};

module.exports.startDevServer = function (projectpath, opts) {
  env.setPath('BT.runMode', "debug");
  try {
    env.setPath('BT.projectPath', projectpath);
    env.setPath('BT.curPath', projectpath);
    env.setPath('BT.btPath', dirname);

    loadScConfigs(projectpath);

    // this should actually load the config
    //env.runCode("SC.Benchmark.verbose = true;");
    if (opts.hasDebugServer) {
      env.setPath("BT.debugServer", true);
    }
    if (opts.runBenchmarks) {
      env.setPath("BT.runBenchmarks", true);
    }
    if (opts.logLevel) {
      env.runCode("SC.Logger.logOutputLevel = '"+opts.logLevel+"'");
    }
    env.runCode("SC.run(function() { BT.projectManager.startServer(); })");
    if (opts.hasREPL) {
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
  if (opts.isSilent) {
    code += "isSilent: true, ";
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
      env.runCode("SC.Logger.logOutputLevel = '"+opts.logLevel+"'");
    }
    loadScConfigs(projectpath);

    var code = "SC.run(function() { BT.projectManager.startBuild(" + JSON.stringify(opts) + "); });";
    var r = env.runCode(code);
    //util.log('return value of r: ' + util.inspect(r));
    if (opts.REPL) env.repl();
    if (r === "done" && !opts.REPL) process.exit(0);
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