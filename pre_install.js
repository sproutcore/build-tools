// use preinstall to install the right node-canvas-bin package

var release = "v1.0rc2";
var os = require('os');
var node_version = process.version.split(".").filter(function (p, i) {
  if (i < 2) {
    return p;
  }
}).join(".");
var arch = os.arch();
var platform = os.platform();
var filename;

switch (platform) {
  case "darwin":
    filename = "osx_" + node_version; break;
  case "linux":
    filename = "linux_" + arch + "_" + node_version; break;
  case "win32":
    filename = "win_" + arch + "_" + node_version; break;
    if (arch === "x64" && node_version === "0.10") {
      throw new Error("This version of the SproutCore buildtools cannot run on 64bit Windows and node 0.10 because of compilation errors.");
    }
}

filename += ".tar.gz";

var base_url = "https://github.com/mauritslamers/node-canvas-builder/releases/download/";
var url = base_url + release + "/" + filename;

var spawn = require('child_process').spawn,
    npm   = spawn('npm', ['install', url]);

npm.stdout.on('data', function (data) {
  console.log('stdout: ' + data);
});

npm.stderr.on('data', function (data) {
  console.log('stderr: ' + data);
});

npm.on('close', function (code) {
  console.log('child process exited with code ' + code);
});

