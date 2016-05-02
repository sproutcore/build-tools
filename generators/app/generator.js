/*jshint node:true */

/*
Generator for an app. Will generate the app layout, including core.js, main.js, the resources folder, a main_page.js
 */

var util = require('util'),
   path = require('path'),
   fs = require('fs'),
   ejs = require('ejs'),
   basics = require('../generator_basics'),
   commander = require('commander');

var camelize = function (str) {
  var ret = str.replace(/([\s|\-|\_|\n])([^\s|\-|\_|\n]?)/g, function (str, separater, character) {
    return character ? character.toUpperCase() : '';
  });

  var first = ret.charAt(0),
      lower = first.toLowerCase();

  return first !== lower ? lower + ret.slice(1) : ret;
};

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
  .arguments("<home> <name>")
  .action(function (home, name) {
    if (!home && !name) {
      util.puts("The app needs to have a name!");
      return;
    }
    var appPath = path.join(home, "apps", name);
    mkDir(appPath);
    // generate the app folders
    ['resources','controllers','states','views','fixtures'].forEach(function (d) {
      mkDir(path.join(appPath, d));
    });

    var namespace = camelize(name);
    namespace = namespace.charAt(0).toUpperCase() + namespace.slice(1);
    var cssname = name.replace(/_/g, "-");
    //console.log("appPath %s, resourcesPath %s, namespace: %s, cssname: %s", appPath, resourcesPath, namespace, cssname);

    // now start writing files to the new app
    // first the root
    ['core.js.ejs', 'main.js.ejs', 'theme.js.ejs'].forEach(function (f) {
      var filepath = path.join(__dirname, f);
      var c = fs.readFileSync(filepath).toString();
      basics.namespace = namespace;
      basics.css_name = cssname;
      basics.filename = filepath;
      var newc = ejs.render(c, basics);
      var fn = path.basename(f, path.extname(f));
      fs.writeFileSync(path.join(appPath, fn), newc);
    });

    ///then the resources
    ['loading.ejs.ejs', '_theme.css.ejs', 'main_page.js.ejs', 'main_page.css.ejs'].forEach(function (f) {
      var filepath = path.join(__dirname, f);
      var c = fs.readFileSync(filepath).toString();
      basics.namespace = namespace;
      basics.css_name = cssname;
      basics.filename = filepath;
      var newc = ejs.render(c, basics);
      var fn = path.basename(f, path.extname(f));
      fs.writeFileSync(path.join(appPath, 'resources', fn), newc);
    });

    // statechart
    ['statechart.js.ejs', 'ready_state.js.ejs'].forEach(function (f) {
      var filepath = path.join(__dirname, f);
      var c = fs.readFileSync(filepath).toString();
      basics.namespace = namespace;
      basics.css_name = "";
      basics.filename = filepath;
      var newc = ejs.render(c, basics);
      var fn = path.basename(f, path.extname(f));
      if (f.indexOf("ready") > -1) {
        fs.writeFileSync(path.join(appPath, 'states', fn), newc);
      }
      else {
        fs.writeFileSync(path.join(appPath, fn), newc);
      }
    });

    // config file
    var filepath = path.join(__dirname, 'appconfig.ejs');
    var c = fs.readFileSync(filepath).toString();
    basics.appName = name;
    var newc = ejs.render(c, basics);
    var appconfigPath = path.join(appPath, 'sc_config');
    fs.writeFileSync(appconfigPath, newc);
    // now add a sc_require line to the project config, but only if it doesn't exist yet
    var projConfig = fs.readFileSync(path.join(home, 'sc_config')).toString();
    var relPathToAppConfig = path.relative(home, appconfigPath);
    var lineToAdd = "sc_require('" + relPathToAppConfig + "');";
    if (projConfig.indexOf(lineToAdd) === -1) {
      projConfig = lineToAdd + "\n" + projConfig;
      fs.writeFileSync(path.join(home, 'sc_config'), projConfig);
    }
  })
  .parse(process.argv);
