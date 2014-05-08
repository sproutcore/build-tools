/*jshint node:true*/
/*globals BT*/

BT.AppBuilder = SC.Object.extend({

// user settable options:

  useHtml5Manifest: false, // whether or not to generate a html5 manifest

  title: function () {
    return this.get('name');
  }.property(), // the title of the app

  language: 'en', // by default en?

  favicon: '', // favicon

  startupImageLandscape: '', // urls to startup image

  startupImagePortrait: '', // url to startup image

  touchEnabled: true, // apps should be touchEnabled by default

  statusBarStyle: 'default',

  useChromeFrame: false, // don't use chrome frame by default

  icon: '',

  precomposedIcon: '', // no clue what this is

  path: null, // path of the app inside the project

  frameworks: null, // frameworks needed for this application, will be instantiated in place

  modules: null, // modules belonging to this application, will be instantiated in place

  includeSC: true, // whether this app uses Sproutcore,

  theme: 'sproutcore:ace', // default theme

  htmlTemplate: null, // if not set, it will fall back to the main one in the BT, path should be relative to project

  html5History: false, // use HTML5 history (whatever that is)

  // PRIVATE
  // generate html5Manifestfile
  html5Manifest: function () {

  }.property('useHtml5Manifest', 'buildNumber').cacheable(),

  concatenatedProperties: ['frameworks', 'modules'],

  name: function () { // name of the application
    return require('path').basename(this.get('path'));
  }.property('path'),

  bootstrap: function () {
    var ret = [];
    this._bootstrap.get('scripts').forEach(function (f) {
      if (f.get('path').indexOf('system') > -1) {
        // prepend bootstrap/system/bench, browser and loader
        ret.push("<script>" + f.get('content') + "</script>");
      }
      // else {
      //   // add to end, after everything else... this should be core.js and setup_body_class_names
      //   scripts.push([f]); // in array for the moment, because of flatten issues...
      // }
    });
    return ret.join("\n");
  }.property(),

  bootstrapSetupClassNames: function () {
    return "if (SC.setupBodyClassNames) SC.setupBodyClassNames(); \n";
  }.property(),

  contentForBody: "", // empty for now...

  contentForLoading: '<p class="loading">Loading...</p>',

  contentForResources: "", // empty for now

  init: function () {
    BT.projectManager.addApp(this);
    if (this.frameworks && this.frameworks.indexOf('sproutcore') === -1) {
      this.frameworks.unshift("sproutcore");
    }
    if (!this.frameworks && this.includeSC) {
      this.frameworks = ["sproutcore"];
    }
    var p = this.get('path');
    var pathlib = require('path');
    this.set('path', pathlib.resolve(p)); // to make sure the path is absolute...
    //this.invokeNext('_instantiateFrameworks');
    this._instantiateFrameworks();
  },

  _findFrameworkDeps: function () {
    var deps = [];
    this.frameworks.forEach(function (fw) {
      var ddeps;
      // if(fw.prototype && fw.prototype.isApp) return; // don't process apps...
      var ref = (SC.typeOf(fw) === SC.T_STRING) ? fw : fw.ref;
      //SC.Logger.log("ref: " + ref);
      var fwclass = BT.projectManager.getFrameworkClass(ref);
      if (!fwclass) SC.Logger.log("Could not find referenced framework: " + ref);
      else {
        ddeps = fwclass.dependencies();
        // filter out any duplicates
        var ret = [];
        ddeps.forEach(function (dd) {
          var r = (SC.typeOf(dd) === SC.T_STRING) ? dd: dd.ref;
          // doesn't occur in ret in either string form or prop form
          if (ret.indexOf(r) === -1 && !ret.findProperty("ref", r)) {
            ret.push(dd);
          }
        });
        deps = deps.concat(ret);
        if (deps.indexOf(ref) === -1) deps.push(ref);
      }
    }, this);
    return deps;
  },

  _findThemeDeps: function () {
    var deps = [];
    var ddeps;
    var theme = this.get('theme');
    // if(fw.prototype && fw.prototype.isApp) return; // don't process apps...
    var ref = (SC.typeOf(theme) === SC.T_STRING) ? theme : theme.ref;
    var k = BT.projectManager.getThemeClass(ref);
    if (!k) SC.Logger.log("Could not find referenced theme: " + ref);
    else {
      ddeps = k.dependencies();
      // filter out any duplicates
      var ret = [];
      ddeps.forEach(function (dd) {
        var r = (SC.typeOf(dd) === SC.T_STRING) ? dd: dd.ref;
        // doesn't occur in ret in either string form or prop form
        if (ret.indexOf(r) === -1 && !ret.findProperty("ref", r)) {
          ret.push(dd);
        }
      });
      deps = deps.concat(ret);
    }
    deps.push(ref); // add main theme to deps
    return deps;
  },

  _instantiateFrameworks: function () {
    //SC.Logger.log("instantiating fws");

    // The idea here is that frameworks export their dependencies, so
    // a one dimensional list can be made here which orders them correctly
    // and make the list contain only unique values.
    // After that the frameworks are instantiated one by one

    var fwdeps = this._findFrameworkDeps();

    //SC.Logger.log("deps for %@ are: %@".fmt(this.get('name'), SC.inspect(fwdeps.getEach('ref'))));

    // take the frameworks, and instantiate
    this._fws = [];
    fwdeps.forEach(function (fwref) {
      var k;
      if (SC.typeOf(fwref) === SC.T_STRING) {
        k = BT.projectManager.getFrameworkClass(fwref);
        this._fws.push(k.create({ belongsTo: this })); // quick fix to allow for cross-fw lookups
      }
      else {
        k = BT.projectManager.getFrameworkClass(fwref.ref);
        fwref.ref = undefined;
        var allConfig = fwref[BT.runMode] || {};
        this._fws.push(k.create(allConfig, { belongsTo: this })); // apply either debug or production settings
      }
    }, this);

    if (this.includeSC) {
      var themedeps = this._findThemeDeps();
      themedeps.forEach(function (tref, td_i) {
        var k, i;
        if (SC.typeOf(tref) === SC.T_STRING) {
          k = BT.projectManager.getThemeClass(tref);
          i = k.create({ belongsTo: this });
        }
        else {
          k = BT.projectManager.getThemeClass(tref.ref);
          i = k.create(tref[BT.runMode], { belongsTo: this });
        }
        this._fws.push(i);
        if (td_i === (themedeps.get('length') - 1)) {
          this._theme = i; // set main theme instance as private, in order to be able to look up things
        }
      }, this);
    }

    this._fws.push(BT.Framework.create({
      path: this.path,
      combineScripts: false,
      isApp: true,
      belongsTo: this
    }));

    if (this.includeSC) {
      // we need it seperately in order to add the things in the right order
      this._bootstrap = BT.projectManager.getFrameworkClass("sproutcore:bootstrap").create({
        combineScripts: false // should not combine.
      });
    }

  },

  // generic computed properties + stuff the template needs
  scripts: function () {
    return this._fws.getEach('scripts').flatten();
  }.property(),

  stylesheets: function () {
    return this._fws.getEach('stylesheets').flatten();
  }.property(),

  resources: function () {
    return this._fws.getEach('resources').flatten();
  }.property(),

  files: function () {
    return this._fws.getEach('files').flatten();
  }.property(),

  imageUrls: function (opts) {
    //SC.Logger.log("imageUrls: " + require('util').inspect(opts));
    //SC.Logger.log("SC.typeOf(opts): " + SC.typeOf(opts));
    // opts are {
    // x2: true / false
    // sprited: true / false
    // }
    return []; // nothing for now, as we are doing dataurls only
  },

  stylesheetUrls: function (opts) {
    //SC.Logger.log("stylesheetUrls: " + require('util').inspect(opts));
    // opts are {
    // x2: true / false
    // }
    var ret;
    if (opts && opts.x2) {
      ret = []; // nothing atm
    } else {
      ret = this.get('stylesheets').getEach('url'); // no x2 support yet
    }
    //SC.Logger.log("ret is: " + SC.inspect(ret));
    return ret;
  },

  contentForPageStyles: "", // no clue what this is

  contentForPageJavascript: "", // no clue what this should be used for

  useWindowOnLoad: false, // if you need to use window.onload, set to true

  contentForFinal: "", // not sure what this is for

  contentForDesigner: "", // not sure what this is needed for, the greenhouse app?

  themeName: function () {
    var themefw = this._fws.findProperty('ref', this.get('theme'));
    if (!themefw) {
      SC.Logger.log("The template tried to insert the css theme name you defined for the theme, but the theme framework cannot be found");
      return "sc-theme"; // some sensible default value
    }
    else {
      return themefw.get('cssName');
    }
  }.property(),

  // //the implementation will obviously change, but it'll work for the moment
  // indexHtml: function () {
  //   // return some basic html, which also refers any files in the right order
  //   var pathlib = require('path');
  //   var appname = this.get('name');
  //   var scripts = this.get('scripts');
  //   var stylesheets = this.get('stylesheets');
  //   var ret = ['<!DOCTYPE html>\n<html class="no-js" lang="en">'];
  //   ret.push("<head>");
  //   ret.push('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
  //   ret.push("<script>");
  //   ret.push("  var SC_benchmarkPreloadEvents = { headStart: new Date().getTime() };");
  //   ret.push("  var docElem = window.documentElement || document.documentElement; ");
  //   ret.push("  if (docElem) { docElem.className = docElem.className.replace(/(^|\\s)no-js(\\s|$)/, '$1js$2'); ");
  //   ret.push("   docElem = null; } ");
  //   ret.push("</script>");
  //   ret.push('    <meta http-equiv="Content-type" content="text/html; charset=utf-8"  >');
  //   ret.push('    <meta http-equiv="Content-Script-Type" content="text/javascript"  >');
  //   ret.push('    <meta name="apple-mobile-web-app-capable" content="yes"  >');
  //   ret.push('    <meta name="apple-mobile-web-app-status-bar-style" content="default"  >');
  //   ret.push('    <meta name="viewport" content="initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, minimal-ui"  >');

  //   ret.push('    <title>%@</title>'.fmt(appname));
  //   ret.push('<script> window.SC = window.SC || { MODULE_INFO: {}, LAZY_INSTANTIATION: {} }; ');
  //   ret.push("SC.buildMode = 'debug';");
  //   ret.push("  SC.buildNumber = '1';");
  //   ret.push("  SC.buildLocale = 'en';");
  //   ret.push("</script>");
  //   ret.push('<script type="text/javascript">String.preferredLanguage = "en";</script>');
  //   // adding bootstrap system
  //   this._bootstrap.get('scripts').forEach(function (f) {
  //     if (f.get('path').indexOf('system') > -1) {
  //       // prepend bootstrap/system/bench, browser and loader
  //       ret.push("<script>" + f.get('content') + "</script>");
  //     }
  //     // else {
  //     //   // add to end, after everything else... this should be core.js and setup_body_class_names
  //     //   scripts.push([f]); // in array for the moment, because of flatten issues...
  //     // }
  //   });

  //   var stylesheets = this._fws.getEach('stylesheets'); // for some strange reason, flatten does not work??
  //   stylesheets.forEach(function (ssh) {
  //     // wrapper frameworks also need to have the controllers... :(
  //     // if (!ssh) {
  //     //   SC.Logger.log("no stylesheets for _fws index " + i);
  //     // }
  //     ssh.forEach(function (s) {
  //       var l = '<link href="%@" rel="stylesheet" type="text/css">';
  //       if (s) {
  //         var p = pathlib.join(appname, s.get('relativePath'));
  //         ret.push(l.fmt(BT.path2Url(p)));
  //       }
  //     });
  //   });
  //   ret.push("<script> SC.benchmarkPreloadEvents['headEnd'] = new Date().getTime(); </script>");
  //   ret.push("</head>");
  //   ret.push('<body class="sc-theme sc-focus">'); // we need to fix here something for theme insertion
  //   if (this.includeSC) {
  //     ret.push('<script type="text/javascript"> var SC = window.SC || {}; ');
  //     ret.push("  if (SC.setupBodyClassNames) SC.setupBodyClassNames() ;");
  //     ret.push("</script>");
  //   }
  //   ret.push('<div id="loading"> <p class="loading">Loading...<p></div>');
  //   var scripts = this._fws.getEach('scripts');


  //   //BT.util.log("scripts for " + this.get('name') + ": " + BT.util.inspect( scripts ));
  //   scripts.forEach(function (scs) {
  //     scs.forEach(function (s) {
  //       var l = '<script type="text/javascript" src="%@"></script>';
  //       var p = pathlib.join(appname, s.get('relativePath'));
  //       if (s) ret.push(l.fmt(BT.path2Url(p)));
  //     });
  //   });
  //   // this._fws.getEach('scripts').flatten().forEach(function(s){
  //   //   if(s) ret.push('<script type="text/javascript" src="%@"></script>'.fmt(s));
  //   // });
  //   //
  //   // this._fws.forEach(function(fw){
  //   //   ret.push("<p>%@</p>".fmt(fw.ref));
  //   //   ret.push("<ul>");
  //   //   ret.push("<ul>stylesheets");
  //   //   fw.get('stylesheets').forEach(function(s){
  //   //     ret.push('<li><a href="%@">%@</a> </li>'.fmt(s,s));
  //   //   });
  //   //   ret.push("</ul>");
  //   //   ret.push("<ul>scripts");
  //   //   fw.get('scripts').forEach(function(s){
  //   //     ret.push('<li><a href="%@">%@</a> </li>'.fmt(s,s));
  //   //   });
  //   //   // if(fw.files){
  //   //   //   Object.keys(fw.files).forEach(function(f){
  //   //   //     var url = BT.path.join(appname, f.replace(BT.projectPath,"").replace(/\/frameworks/g,""));
  //   //   //     ret.push('<li><a href="%@">%@</a> </li>'.fmt(url,f));
  //   //   //   });
  //   //   // }
  //   //   ret.push("</ul>");
  //   //   ret.push("</ul>");
  //   // });
  //   ret.push("<script>SC.benchmarkPreloadEvents['bodyEnd'] = new Date().getTime();</script>");
  //   ret.push("</body></html>");
  //   return ret.join("\n");
  // }.property(),
  //
  indexHtml: function () {
    // return an ejs generated template, never ever cache this
    var ejs = require('ejs');
    var pathlib = require('path');
    var fslib = require('fs');
    var template;
    if (this.get('htmlTemplate')) { // try to load it
      try {
        template = fslib.readFileSync(pathlib.join(BT.projectPath, this.get('htmlTemplate')));
      }
      catch (e) {
        if (e.code === "ENOENT") {
          SC.Logger.log("The buildtools could not find the configured template, falling back to the default one");
        }
        else throw e;
      }
    }
    if (!template) { // load the default one
      template = fslib.readFileSync(pathlib.join(BT.btPath, "templates", "app_index.ejs"));
    }
    var ret;
    try {
      ret = ejs.render(template.toString(), {
        app: this,
        BT: BT,
        compileDebug: true,
        sc_static: function (fn) {
          SC.Logger.log("arguments to sc_static: " + fn);
        }
      });
    }
    catch (er) {
      SC.Logger.log("Problem compiling the Html template: " + require('util').inspect(er));
      SC.Logger.log("ret: " + require('util').inspect(ret));
    }
    return ret;
  }.property(),

  // the url layout should be
  // [appname]/[fwname]/[subfwname]/[file]
  // which essentially means this app will get the request because of the file being in this app
  // fwname/subfwname allows us to detect which fw, can be translated to fwref format
  //
  fileFor: function (url) {
    //var fwurl = url.split("/").slice(1).join("/");
    var fwurl = url;
    var f, fw;
    //var ret = "fileContentsFor: " + url.split("/").slice(1).join("/");
    //SC.Logger.log("fileFor: " + fwurl);
    var frameworks = this._fws.concat(this._bootstrap);

    for (var i = 0, len = frameworks.length; i < len; i += 1) {
      fw = frameworks[i];
      f = null;
      if (fw) {
        //SC.Logger.log("trying fw " + fw.get('name'));
        f = fw.fileFor(fwurl);
        if (f) {
          //SC.Logger.log("file found...");
          return f;
        }
      }
    }

  }

});

