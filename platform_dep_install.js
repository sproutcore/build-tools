// is a real
var os = require('os');
var cp = require('child_process');
if (os.platform() === "darwin") {
  var proc = cp.spawn("npm", ["install", "git://github.com/mauritslamers/fsevents-bin"]);
  proc.stdout.on('data', function (d) {
    console.log(d.toString());
  });
  proc.stderr.on('data', function (d) {
    console.log(d.toString());
  });
}