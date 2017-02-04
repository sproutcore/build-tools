/*jshint node:true*/

var os = require('os');
var cp = require('child_process');
var util = require('util');
var pathlib = require('path');

// the first thing to do is to checkout sproutcore
//
var buildtools = require(pathlib.join(__dirname, 'index.js'));
util.log('Installing sproutcore as global dependency, this can take a while...');
buildtools.startInstall(process.cwd(), {
  gitUrl: "git://github.com/sproutcore/sproutcore",
  isGlobal: true,
  logLevel: "none",
  branch: "team/mauritslamers/newbt"
});
