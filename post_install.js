/*jshint node:true*/

var os = require('os');
var cp = require('child_process');
var util = require('util');
var pathlib = require('path');
var fslib = require('fs');

var node_version = process.versions.node.split(".").filter(function (p, i) {
  if (i < 2) {
    return p;
  }
});
if (node_version[0] !== '0') {
  node_version[1] = '0';
}

// checkout sproutcore
//
var buildtools = require(pathlib.join(__dirname, 'index.js'));
util.log('Installing sproutcore as global dependency, this can take a while...');
buildtools.startInstall(process.cwd(), {
  gitUrl: "git://github.com/sproutcore/sproutcore",
  isGlobal: true,
  logLevel: "none",
  branch: "team/mauritslamers/newbt"
});
