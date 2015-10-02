/*
file to serve as default settings for the generators
 */

exports.company = 'My Company, Inc.';
exports.extra = "";

var fslib = require('fs'),
    pathlib = require('path'),
    btDir = pathlib.resolve(__dirname, ".."),
    spawn = require('child_process').spawnSync;

/*
The BT automatically detects the project folder using the following procedure
- check the current folder for a sc_config. Quit if current folder is root, or matches /[C-Z]:\\/
- if no, go one directory up, and repeat
- if yes, check whether the sc_config has a BT.serverConfig definition.
  - if yes, this is the project folder
  - if no, go one directory up, and repeat (recursively)
 */


function discoverProjectRoot(startdir) {
  var flist = fslib.readdirSync(startdir);
  if (flist.indexOf('sc_config') > -1) {
    var c = fslib.readFileSync(pathlib.join(startdir, 'sc_config')).toString();
    if (c.indexOf("BT.serverConfig") > -1) {
      return startdir;
    }
  }
  if (pathlib.parse(startdir).root === startdir) { // root
    return; // undefined
  }
  return discoverProjectRoot(pathlib.join(startdir, "..")); // default
};

function runAppGenerator(projectFolder, appName) {
  var scriptname = pathlib.join(btDir, 'generators', 'app', 'generator.js');
  var proc = spawn('node', [scriptname, projectFolder, appName], { stdio: 'inherit', customFds: [0, 1, 2] });

  if (proc.error) {
    if (proc.error.code == "ENOENT") {
      console.error('\n  app generator does not exist, try --help\n');
    }
    process.exit(1);
  }
  return true;
}

exports.discoverProjectRoot = discoverProjectRoot;
exports.runAppGenerator = runAppGenerator;