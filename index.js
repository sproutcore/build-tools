

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
  'lib/framework.js'
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
    env.runCode("SC.Benchmark.verbose = true;");
    if (opts.hasDebugServer) {
      env.setPath("BT.debugServer", true);
    }
    env.runCode("BT.projectManager.startServer();");
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
