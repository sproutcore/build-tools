/*global BT*/

BT._compassIsRunning = false;

BT._compassControllers = [];

BT.runCompass = function (ctrler) {
  if (!BT._compassControllers.contains(ctrler)) BT._compassControllers.push(ctrler);
  // trigger
  BT.invokeOnceLater('_startCompassRun', 100);
};

BT._startCompassRun = function () {
  if (BT._compassIsRunning) return; // don't do a thing
  BT._compassIsRunning = true;
  var pathlib = require('path');
  var tmpPath = pathlib.join(BT.projectPath, "tmpnode", "compass");
  BT.AsyncWrapper.from('child_process').perform('exec', "compass compile", { cwd: tmpPath })
     .notify(BT, '_compassDidRun').start();
},

BT._compassDidRun = function (err, stdout, stderr) {
  // first notify everyone
  SC.Logger.log("BT.compassDidRun...");
  //SC.Logger.log("_compassControllers: " + SC.inspect(BT._compassControllers));
  var fw;
  while (fw = BT._compassControllers.pop()) {
    SC.Logger.log("calling compassDidRun on fw " + fw.getPath('framework.name'));
    fw.compassDidRun(err, stdout, stderr);
  }
  BT._compassIsRunning = false;
};