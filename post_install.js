var os = require('os');
var cp = require('child_process');
var util = require('util');

var doneInstalling = function () {
  util.log("SproutCore has been installed and is ready to use!");
};

// the first thing to do is to checkout sproutcore
var buildtools = require('index.js');
util.log('Installing sproutcore as global dependency...');
buildtools.startInstall("git://github.com/sproutcore/sproutcore#team/mauritslamers/newbt", true, {
  silent: true,
  frameworkName: 'sproutcore'
});
util.log("SproutCore has been installed.");

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