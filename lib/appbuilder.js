/*jshint node:true*/
/*globals BT*/

BT.AppBuilder = SC.Object.extend({

// user settable options:
//
  doNotRegister: false,

  combineScripts: function () {
    if (BT.runMode === BT.RM_BUILD) return true;
    else return false;
  }.property(),

  combineStylesheets: function () {
    if (BT.runMode === BT.RM_BUILD) return true;
    else return false;
  }.property(),

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

  sproutcoreRef: "sproutcore", // default reference to sproutcore

  htmlTemplate: null, // if not set, it will fall back to the main one in the BT, path should be relative to project

  html5History: false, // use HTML5 history (whatever that is)

  minifyScripts: function () {
    if (BT.runMode === BT.RM_BUILD) {
      return true;
    }
    if (BT.runMode === BT.RM_DEBUG) {
      return false;
    }
  }.property().cacheable(),

  minifyStylesheets: function () {
    if (BT.runMode === BT.RM_BUILD) {
      return true;
    }
    if (BT.runMode === BT.RM_DEBUG) {
      return false;
    }
  }.property().cacheable(),

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

  bootstrapSetupBodyClassNames: function () {
    return "<script>if (SC.setupBodyClassNames) SC.setupBodyClassNames();</script>\n";
  }.property(),

  contentForBody: "", // empty for now...

  contentForLoading: '<p class="loading">Loading...</p>',

  contentForResources: "", // empty for now

  init: function () {
    sc_super();

    if (!this.doNotRegister) BT.projectManager.addApp(this);
    var fws = this.get('frameworks');
    // if SC should be included, there are framework dependencies declared,
    // but sproutcore is not one of them, add it to the front
    if (fws && fws.indexOf(this.sproutcoreRef) === -1 && !fws.findProperty('ref', this.sproutcoreRef) && this.includeSC) {
      this.frameworks.unshift(this.sproutcoreRef);
    }
    if (!this.frameworks && this.includeSC) {
      this.frameworks = [this.sproutcoreRef];
    }
    var p = this.get('path');
    if (!p) {
      SC.warn("BT.AppBuilder: You didn't specify a path in an app with name: " + this.get('name'));
      process.exit(1);
    }

    var pathlib = require('path');
    this.set('path', pathlib.resolve(p)); // to make sure the path is absolute...
    this._registerFrameworks();
  },

  _findFrameworkDeps: function () {
    return this._findDeps(this.frameworks);
  },

  _findModuleDeps: function () {
    return this._findDeps(this.modules);
  },

  _findDeps: function (frameworks) {
    //var util = require('util');
    var deps = [];
    if (!frameworks) return deps;
    //SC.Logger.log("_findFrameworkDeps: frameworks:  " + require('util').inspect(this.frameworks));
    frameworks.forEach(function (fw) {
      var ddeps;
      // if(fw.prototype && fw.prototype.isApp) return; // don't process apps...
      var ref = (SC.typeOf(fw) === SC.T_STRING) ? fw : fw.ref;
      if (!ref) {
        throw new Error("You forgot to put a ref property in a framework configuration");
      }
      //SC.Logger.log("ref: " + ref);
      var fwclass = BT.projectManager.getFrameworkClass(ref);
      if (!fwclass) SC.Logger.log("Could not find referenced framework: " + ref);
      else {
        ddeps = fwclass.dependencies();
        // filter out any duplicates
        var ret = [];
        ddeps.forEach(function (dd) {
          var r = (SC.typeOf(dd) === SC.T_STRING) ? dd: dd.ref;
          // doesn't occur in the current fw deps in either string form or prop form
          if (ret.indexOf(r) === -1 && !ret.findProperty("ref", r)) {
            //util.log('dd going in:  ' + util.inspect(dd));
            // if it doesn't occur in all the deps
            if (deps.indexOf(r) === -1 && !deps.findProperty("ref", r)) {
              // if we have configuration to copy over
              if (fwclass.prototype.isWrapperFramework && fw.all && fw.all[BT.runMode]) {
                if (SC.typeOf(dd) === SC.T_STRING) {
                  dd = { ref: dd };
                }
                //util.log("fw.all[BT.runMode]: " + util.inspect(fw.all[BT.runMode]));
                dd = SC.merge(dd, fw.all[BT.runMode]);
              }
              //util.log("dd going out: " + util.inspect(dd));
              ret.push(dd);
            }
          }
        });
        deps = deps.concat(ret);
        if (deps.indexOf(ref) === -1 && !deps.findProperty('ref', ref)) deps.push(fw);
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

  _registerFrameworks: function () {
    SC.Logger.log("instantiating fws");

    this._fws = [];
    this._fwModules = [];

    // The idea here is that frameworks export their dependencies, so
    // a one dimensional list can be made here which orders them correctly
    // and make the list contain only unique values.
    // After that the frameworks are instantiated one by one
    var fwdeps = this._findFrameworkDeps();

    //SC.Logger.log("deps for %@ are: %@".fmt(this.get('name'), require('util').inspect(fwdeps)));

    // take the frameworks, and instantiate
    this._instantiateFrameworks(this._fws, fwdeps, { belongsTo: this });

    var moduledeps = this._findModuleDeps();
    this._instantiateFrameworks(this._fwModules, moduledeps, { belongsTo: this, isModule: true });

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

    this._appfw = BT.Framework.create({ // store seperately so we can reach it easily, for example from the saving procedure
      path: this.path,
      combineScripts: this.get('combineScripts'),
      combineStylesheets: this.get('combineStylesheets'),
      minifyScripts: this.get('minifyScripts'),
      minifyStylesheets: this.get('minifyStylesheets'),
      isApp: true,
      belongsTo: this,
      modules: this._fwModules
    });
    this._fws.push(this._appfw);

    if (this.includeSC) {
      // we need it seperately in order to add the things in the right order
      this._bootstrap = BT.projectManager.getFrameworkClass(this.sproutcoreRef + ":bootstrap").create({
        combineScripts: false // should not combine.
      });
    }

    this._allFws = this._fws.concat(this._bootstrap).concat(this._fwModules);
  },

  _instantiateFrameworks: function (ret, deps, options) {
    deps.forEach(function (dep) {
      var k, i;
      if (SC.typeOf(dep) === SC.T_STRING) {
        k = BT.projectManager.getFrameworkClass(dep);
        i = k.create(options); // quick fix to allow for cross-fw lookups
      }
      else {
        k = BT.projectManager.getFrameworkClass(dep.ref);
        dep.ref = undefined;
        var allConfig = dep[BT.runMode] || {};
        i = k.create(allConfig, options); // apply either debug or production settings
      }
      ret.push(i);
    }, this);
  },

  // generic computed properties + stuff the template needs
  scripts: function () {
    return this._fws.getEach('scripts').flatten().filterProperty('content');
  }.property(),

  stylesheets: function () {
    return this._fws.getEach('stylesheets').flatten().filterProperty('content');
  }.property(),

  moduleScripts: function () {
    return this._fwModules.getEach('scripts').flatten().filterProperty('content');
  }.property(),

  moduleStylesheets: function () {
    return this._fwModules.getEach('stylesheets').flatten().filterProperty('content');
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
      //ret = []; // nothing atm
      ret = this.get('stylesheets').getEach('url'); // return the normal to have at least something...
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

  indexHtml: function () {
    return this.renderIndexHtml(this);
  }.property(),

  renderIndexHtml: function (appObj) {
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
        app: appObj,
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
  },

  targets: function () {
    var appname = this.get('name');
    // var ret = this._fws.map(function (fw) {
    //   var r = fw.get('targets');
    //   r.parent = "/" + appname;
    //   return fw.isApp ? null : r;
    // }, this).without(null);
    return {
      kind: 'app',
      parent: "",
      link_root: "/" + appname + "/" + appname,
      link_tests: "/" + appname + "/" + appname + "/tests/-index.json",
      name: "/" + this.get('name')
    };
  }.property(),

  // there will have to be a test run mode, in which all frameworks are put at the root
  // because running it in dev mode is not going to work...
  // The reason is that the test runner app expects every framework to be on the root
  //
  // the url layout should be
  // [appname]/[fwname]/[subfwname]/[file]
  // which essentially means this app will get the request because of the file being in this app
  // fwname/subfwname allows us to detect which fw, can be translated to fwref format
  //
  fileFor: function (url) {
    var fwurl = url;
    var f, fw;

    SC.Logger.log("fileFor: " + url);

    var frameworks = this._allFws;

    for (var i = 0, len = frameworks.length; i < len; i += 1) {
      fw = frameworks[i];
      f = null;
      if (fw) {
        //SC.Logger.log("trying fw " + fw.get('name'));
        f = fw.fileFor(fwurl);
        if (f) {
          //SC.Logger.log("file found...");
          if (f.get('isTest')) {
            // wrap it
            return BT.File.create({
              content: this.wrapTest(f),
              contentType: "text/html",
            });
          }
          else return f;


        }
      }
    }

  },

  // returns the test file wrapped in the proper frameworks
  wrapTest: function (testFile) {
    var fw = testFile.get('framework');

    var debugRef = this.sproutcoreRef + ":debug";
    var testingRef = this.sproutcoreRef + ":testing";

    var deps = [];
    var findDeps = function (fwd) {
      var ret;
      SC.Logger.log("fwdep: " + fwd);
      if (SC.typeOf(fwd) === SC.T_STRING) {
        deps.push(fwd);
        ret = this._fws.findProperty('ref', fwd);
      }
      else {
        ret = this._fws.findProperty('ref', fwd.get('ref'));
        deps.push(fwd.get('ref'));
      }
      if (!ret) SC.Logger.log("Something is fishy, because cannot find a instance for ref");
      if (ret.dependencies) {
        ret.dependencies.forEach(findDeps, this);
        if (ret.testDependencies) ret.testDependencies.forEach(findDeps, this);
      }
    };
    //var deps = fw.dependencies.concat(["sproutcore:debug");
    var fwdeps = fw.dependencies;
    if (fw.testDependencies) fwdeps = fwdeps.concat(fw.testDependencies);
    fwdeps.forEach(findDeps, this); // now all deps are in deps, doesn't need to be unique

    var fws = this._fws.filter(function (f) {
      if (deps.contains(f.get('ref'))) return true;
    });
    // deps.forEach(findDepInstance, this);
    if (!this._fws.contains(fw)) {
      fws.push(this._fws.findProperty('ref', fw.get('ref')));
    }
    else fws.push(fw);

    if (!fws.findProperty('ref', debugRef)) fws.push(this._fws.findProperty("ref", debugRef));
    if (!fws.findProperty('ref', testingRef)) fws.push(this._fws.findProperty('ref', testingRef));

    // assume that the current app loads all necessary frameworks, and that they are in order in _fws
    //var fws = this._fws.slice(0, this._fws.indexOf(fw) + 1);
    var tmp = BT.AppBuilder.create({
      doNotRegister: true, // prevent re-use
      _fws: fws,
      language: "en",
      title: testFile.get('url'),
      init: function () {},
      _bootstrap: this._bootstrap,
      contentForFinal: "<script>" + testFile.get('content') + "</script>"
    });
    // var styles = fws.getEach('stylesheets').flatten().getEach('url').map(function (s) { return '<link rel="stylesheet" src="%@">'.fmt(s); }).join("\n");
    // var scripts = fws.getEach('scripts').flatten().getEach('url').map(function (s) { return '<script src="%@"></script>'.fmt(s); }).join('\n');
    // var c = "<html><head>%{stylesheets}\n %{bootstrap}</head><body>%{scripts}\n<script>%{test}</script></body></html>".fmt({
    //   stylesheets: styles,
    //   scripts: scripts,
    //   test: testFile.get('content'),
    //   bootstrap: this.get('bootstrap')
    // });
    // return c;
    return tmp.get('indexHtml');
  }

});

