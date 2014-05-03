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
  'lib/project.js',
  'lib/file.js',
  'lib/filetypes.js',
  'lib/appbuilder.js',
  'lib/api.js',
  'lib/framework.js',
  'lib/installer.js'
];

// we need to install some new stuff in the running context

files.forEach(function (f) {
  env.loadFile(pathlib.join(dirname, f));
});

module.exports.startDevServer = function (projectpath, opts) {
  env.setPath('BT.runMode', "debug");
  try {
    env.setPath('BT.projectPath', projectpath);
    env.setPath('BT.curPath', projectpath);
    env.setPath('BT.btPath', dirname);
    var p = pathlib.join(projectpath, 'sc_config');
    env.loadFile(p); // this should actually load the config
    //env.runCode("SC.Benchmark.verbose = true;");
    if (opts.hasDebugServer) {
      env.setPath("BT.debugServer", true);
    }
    if (opts.runBenchmarks) {
      env.setPath("BT.runBenchmarks", true);
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

module.exports.startInstall = function (projectpath, args) {
  // sproutcore install giturl destination
  env.setPath('BT.runMode', "install");
  env.setPath('BT.projectPath', projectpath);
  env.setPath('BT.curPath', projectpath);
  env.setPath('BT.btPath', dirname);
  var url, code;
  var indexOfGlobal = args.indexOf("--global");
  var indexOfG = args.indexOf("-g");
  var isGlobal = (indexOfG > -1 || indexOfGlobal > -1);
  if (indexOfGlobal === -1 && indexOfG === -1) { // no global opts, args[0] === url
    url = args[0];
  }
  else {
    if (indexOfGlobal === 0 || indexOfG === 0) { // -g or --global first
      url = args[1];
    }
    else {
      url = args[0];
    }
  }
  if (!url) {
    util.puts("No url found, please provide an url");
    return;
  }
  code = "SC.run(function () { BT.startInstall('" + url + "', " + isGlobal + "); });";
  try {
    env.runCode(code);
  }
  catch (e) {
    throw e;
  }
};