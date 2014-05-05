/*jshint node:true*/

var os = require('os');
var cp = require('child_process');
var util = require('util');
var pathlib = require('path');

var doneInstalling = function () {
  util.log("SproutCore has been installed and is ready to use!");
};

// the first thing to do is to checkout sproutcore
//
var buildtools = require(pathlib.join(__dirname, 'index.js'));
util.log('Installing sproutcore as global dependency...');
var code = "SC.run( function() { \n";
code += "  BT.startInstall('git://github.com/sproutcore/sproutcore', true, {\n";
code += "    silent: true, frameworkName: 'sproutcore', branch: 'team/mauritslamers/newbt'}); \n";
code += "  });\n";

buildtools.__env.setPath('BT.runMode', "install");
buildtools.__env.setPath('BT.btPath', __dirname);
buildtools.__env.setPath('BT._installDidFinish', doneInstalling);
buildtools.__env.runCode(code);

// util.log("SproutCore has been installed.");

if (os.platform() === "darwin") {
  util.log("OSX detected, installing fsevents...");
  var proc = cp.spawn("npm", ["install", "git://github.com/mauritslamers/fsevents-bin"]);
  proc.stdout.on('data', function (d) {
    util.log(d.toString());
  });
  proc.stderr.on('data', function (d) {
    util.log(d.toString());
  });
  proc.on('exit', doneInstalling);
}
else {
  doneInstalling();
}