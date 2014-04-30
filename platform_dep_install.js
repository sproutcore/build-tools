// is a real
var os = require('os');
var cp = require('child-process');
if (os.platform() === "darwin") {
  cp.spawn("npm install git://github.com/mauritslamers/fsevents-bin");
}