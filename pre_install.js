// use preinstall to install the right node-canvas-bin package
//https://github.com/mauritslamers/node-canvas-builder/releases/download/v1.0r3/osx_0.12.tar.gz
//https://github.com/mauritslamers/node-canvas-builder/releases/download/v1.0rc3/osx_0.12.tar.gz

var release = "v1.0";
var last_supported_node_version = 7;
var os = require('os');
var fslib = require('fs');
var pathlib = require('path');
var node_version = process.versions.node.split(".").filter(function (p, i) {
  if (i < 2) {
    return p;
  }
});
if (node_version[0] !== '0') {
  node_version[1] = '0';
}
// In case the installed version of node does not have a corresponding 'node-canvas-builder'.
if (Number(node_version[0]) > last_supported_node_version) {
  node_version[0] = last_supported_node_version;
}
node_version = node_version.join(".");

var arch = os.arch();
var platform = os.platform();
var filename;

switch (platform) {
  case "darwin":
    filename = "osx_" + node_version; break;
  case "linux":
    filename = "linux_" + arch + "_" + node_version; break;
  case "win32":
    if (arch === "ia32") arch = "x86";
    filename = "win_" + arch + "_" + node_version; break;
    if (arch === "x64" && node_version === "0.10") {
      throw new Error("This version of the SproutCore buildtools cannot run on 64bit Windows and node 0.10 because of compilation errors.");
    }
}

filename += ".tar.gz";

var base_url = "https://github.com/mauritslamers/node-canvas-builder/releases/download/";
var url = base_url + release + "/" + filename;


console.log("Installing canvas-bin for your platform (", platform, ",", arch, ") and node version: ", node_version);
var execSync = require('child_process').execSync;
var result;

try {
  // we install first in the node_modules in the BT root, then move the folder
  // Doing it directly in the main node_modules folder interferes with the npm install process we are
  // running inside of.
  result = execSync("npm install " + url, { cwd: __dirname });
}
catch (e) {
  console.log("Error installing canvas-bin for your platform. Please report this issue!");
  console.log(result);
  console.log(e);
  process.exit(1);
}


console.log("Successfully installed canvas-bin for your platform.");
