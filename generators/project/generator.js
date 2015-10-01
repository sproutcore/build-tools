/*jshint node:true */
// generator for a project. essentially creates the folder, create an apps folder, and puts the sc_config in

var util = require('util'),
   path = require('path'),
   fs = require('fs'),
   ejs = require('ejs'),
   generatorDir = __dirname,
   commander = require('commander');

function mkDir(path) {
  try {
    fs.mkdirSync(path);
  }
  catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
}

commander
  .version('0.0.1')
  .arguments("<folder> <name>")
  .action(function (folder, name) {
    if (! (folder && name) ) { // this check is probably not neccesary, as commander already does the checking IIRC
      console.log("The project generator needs both a folder and a name");
      return;
    }
    var projFolder = path.join(folder, name);
    var config = fs.readFileSync(path.join(generatorDir, "sc_config.ejs")).toString();
    // console.log('projFolder: ' + projFolder);
    // console.log('config: ' + config);

    mkDir(projFolder);
    mkDir(path.join(projFolder, "apps"));
    try {
      // we're not using the ejs options here (yet), so no ejs parsing required
      fs.writeFileSync(path.join(projFolder, "sc_config"), config);
    }
    catch (er) {
      if (er.code !== 'EEXIST') {
        throw er;
      }
    }
  })
  .parse(process.argv);