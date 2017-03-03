/*jshint node:true*/

var os = require('os');
var cp = require('child_process');
var util = require('util');
var pathlib = require('path');
var fslib = require('fs');

// as moving the canvas-bin library in the pre_install doesn't work, we move it here.

if (!fslib.existsSync(pathlib.join(__dirname, '..', 'canvas-bin'))) {
  try {
    fslib.renameSync(pathlib.join(__dirname, 'node_modules', 'canvas-bin'), pathlib.join(__dirname, '..', 'canvas-bin')); // move to main node_modules folder
  }
  catch (e) {
    console.log(e);
    console.log("Error when trying to move canvas-bin into place. Please report this issue");
    process.exit(1);
  }
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
