/*jshint node:true*/
/*globals BT*/

BT.AppBuilder = SC.Object.extend({

  /**
    The title of the app.

    @property
    @type String
  */
  title: function () {
    return this.get('name');
  }.property(),

  /**
    The path of the app inside the project.

    @property
    @type String
  */
  path: null,

  /**
    The name of the app.

    @property
    @type String
  */
  name: function () { // name of the application
    return require('path').basename(this.get('path'));
  }.property('path'),

  /**
    The url of the app served by the build tools in development mode.

    This might be usefull if you want to rewrite the URL your app.

    @property
    @type String
  */
  url: function () {
    return this.get('name');
  }.property('name').cacheable(),

  /**
    Languages to add to the build.  If null, the build tool will look
    for lproj folders and add every languages found.

    Example:

        languages: ['en', 'fr'],

    @property
    @type Array
    @default null
  */
  languages: null,

  /**
    The language of app to use in the server

    @property
    @type String
    @default 'en'
  */
  language: 'en',

  /**
    The default theme to use.

    @property
    @type String
    @default 'sproutcore:aki'
  */
  theme: 'sproutcore:aki',

  /**
    Frameworks needed for this application, will be instantiated in place.

    Example:

        frameworks: [
          'rich-text-editor'
        ],

    @property
    @type Array
    @default null
  */
  frameworks: null,

  /**
    Modules belonging to this application, will be instantiated in place.

    Example:

        modules: [
          'rich-text-editor'
        ],

    @property
    @type Array
    @default null
  */
  modules: null,

  /**
    The path of the favicon.

    Example:

        favicon: 'images/favicon.ico',

    @property
    @type String
    @default ''
  */
  favicon: '',

  /**
    Url to landscape startup image.

    @property
    @type String
    @default ''
  */
  startupImageLandscape: '',

  /**
    Url to portrait startup image.

    @property
    @type String
    @default ''
  */
  startupImagePortrait: '',

  /**
    Apple mobile web app status bar style to use.

    @property
    @type String
    @default 'default'
  */
  statusBarStyle: 'default',

  /**
    Url to the Apple touch icon.

    @property
    @type String
    @default ''
  */
  icon: '',

  /**
    Set it to true to build the app with relative URLs.  This is useful, for example, if you want to
    use a SproutCore application inside of an Apache Cordova application.

    @property
    @type Boolean
    @default false
  */
  relativeBuild: false,

  /**
    Set it to true if you want to includes the test files.

    @property
    @type Boolean
    @default false
  */
  includeTests: false,

  /**
    Set to true to enable HTML5 history

    @property
    @type Boolean
    @default false
  */
  html5History: false,

  /**
    Set to true if you want to enable the traceur compiler for all the files of the app.

    Note that you can use the flag `bt_traceur()` if you just want to enable it in one file.

    @property
    @type Boolean
    @default false
  */
  enableTraceur: false,

  /**
    The file name used by the build process for the index.html

    @property
    @type String
    @default 'index.html'
  */
  indexHtmlFileName: 'index.html',

  /**
    If not set, it will fall back to the main one in the BT, path should be relative to project

    @property
    @type String
    @default null
  */
  indexHtmlTemplate: null,

  /**
    The path of the SCSS variables file, relative to the resources directory, to use
    in the app to overide the variables of the theme.

    @type String
    @default '_variables.css'
  */
  scssVariablesPath: '_variables.css',

  /**
    The path of the build, relative to the project.

    @property
    @type String
    @default null
  */
  relativeBuildPath: 'build',

  /**
    The URL template of the files in development mode.

    @property
    @type String
    @default '/%{appUrl}/%{frameworkName}/%{relativePath}'
  */
  devUrlTemplate: "/%{appUrl}/%{frameworkName}/%{relativePath}",

  /**
    The URL template of the files in build mode.

    @property
    @type String
  */
  buildUrlTemplate: function() {
    var urlTemplate = "/static/%{frameworkName}/%{language}/";

    if (BT.serverConfig.buildNumberPath) urlTemplate += "%{frameworkBuildNumber}";
    else if (this.get('buildNumber')) {
      urlTemplate += "%{buildNumber}";
    }
    else urlTemplate += "%{frameworkContentHash}";

    return urlTemplate+"/%{relativePath}";
  }.property().cacheable(),

  /**
    The URL template of the files.

    @property
    @type String
  */
  urlTemplate: function() {
    if (BT.runMode === BT.RM_DEBUG) {
      return this.get('devUrlTemplate');
    }
    else {
      return this.get('buildUrlTemplate');
    }
  }.property().cacheable(),

  /**
    A delegate you can use to define specific URL templates depending
    on the file.

    @function
    @param {BT.File} file The file requesting an URL template.
  */
  urlTemplateFor: function(file) {
    return this.get('urlTemplate');
  },

  /**
    Minify the JS files.

    @type Boolean
    @default false in debug mode || true in build
  */
  minifyScripts: function () {
    if (BT.runMode === BT.RM_BUILD) {
      return true;
    }
    if (BT.runMode === BT.RM_DEBUG) {
      return false;
    }
  }.property().cacheable(),

  /**
    Minify the CSS files.

    @type Boolean
    @default false in debug mode || true in build
  */
  minifyStylesheets: function () {
    if (BT.runMode === BT.RM_BUILD) {
      return true;
    }
    if (BT.runMode === BT.RM_DEBUG) {
      return false;
    }
  }.property().cacheable(),

  /**
    Minify the HTML files.

    @type Boolean
    @default false in debug mode || true in build
  */
  minifyHtml: function () {
    if (BT.runMode === BT.RM_BUILD) {
      return true;
    }
    if (BT.runMode === BT.RM_DEBUG) {
      return false;
    }
  }.property().cacheable(),

  /**
    Combine all the JS files together.

    @type Boolean
    @default true in build mode || false
  */
  combineScripts: function () {
    if (BT.runMode === BT.RM_BUILD) return true;
    else return false;
  }.property(),

  /**
    Combine all the CSS files together.

    @type Boolean
    @default true in build mode || false
  */
  combineStylesheets: function () {
    if (BT.runMode === BT.RM_BUILD) return true;
    else return false;
  }.property(),

  /**
    The value of this property is the method name used for combining

    These are the combine modes:

      - BT.COMBINE_FWS_ALL: combine all css and js into single files
      - BT.COMBINE_FWS_WRAPPER: combine only wrapper frameworks, rest separate
      - BT.COMBINE_FWS_APPSUPP_SPROUTCORE: combine sproutcore in one, the app and the rest in another
      - BT.COMBINE_FWS_NONE:  no combining on app level


    @type Boolean
    @default BT.COMBINE_FWS_ALL in build mode || BT.COMBINE_FWS_NONE
  */
  combineFrameworks: function () {
    if (BT.runMode === BT.RM_BUILD) return BT.COMBINE_FWS_ALL;
    else return BT.COMBINE_FWS_NONE;
  }.property(),

  /**
    Don't use chrome frame by default

    @property
    @type Boolean
    @default false
  */
  useChromeFrame: false,

  /**
    Whether this app uses Sproutcore.

    @property
    @type Boolean
    @default true
  */
  includeSC: true,

  /**
    Default reference to sproutcore

    @property
    @type String
    @default "sproutcore"
  */
  sproutcoreRef: "sproutcore",

  /**
    Apps should be touchEnabled by default

    @property
    @type Boolean
    @default true
  */
  touchEnabled: true,

  /**
    no clue what this is

    @property
    @type String
    @default ""
  */
  precomposedIcon: '',

  /**
    This contains any HTML which should be inserted together with the styles
    See the app_index.ejs template to see where this is being inserted.

    @property
    @type String
    @default ""
  */
  contentForPageStyles: "",

  /**
    Use this to include script tags to third party scripts.
    See the app_index.ejs template to see where this is being inserted.

    @property
    @type String
    @default ""
  */
  contentForPageJavascript: "",

  /**
    Use this to include HTML at the bottom of the page
    See the app_index.ejs template to see where this is being inserted.

    @property
    @type String
    @default ""
  */
  contentForFinal: "",

  /**
    Not sure what this is needed for, the greenhouse app?

    @property
    @type String
    @default ""
  */
  contentForDesigner: "",

  /**
    Build number of the app

    @property
    @type Number
  */
  buildNumber: function() {
    if (this._appfw) return this._appfw.get('buildNumber');
  }.property(),

  /**
    @private
  */
  doNotRegister: false,

  /**
    @private
  */
  languagesToBuild: function () {
    return this.get('languages') || [this.get('language') || 'en'];
  }.property(),

  /**
    This function just returns the fileType needed.
    fileType is the type of files to get at the frameworks, being either "scripts" or "stylesheets".

    @private
  */
  combineNone: function (fileType) {
    return this._fws.getEach(fileType).flatten().filterProperty('content');
  }.property(),

  /**
    @private
  */
  combineAllFrameworks: function (fileType) {
    var files = this._fws.getEach(fileType).flatten().filterProperty('content'),
      cfKey = '_combineAllFrameworks_' + fileType,
      cf = this[cfKey];

    // We can't reuse this controller because in build mode, when filesToCombine
    // is updated, the changes are not propagate soon enough.
    if (cf) cf.destroy();

    var appname = this.get('name');
    var k, combinedName, minify;
    if (fileType === "scripts") {
      k = BT.ScriptFile;
      combinedName = appname + ".js";
      minify = this.get('minifyScripts');
    }
    else {
      k = BT.CSSFile;
      combinedName = appname + ".css";
      minify = this.get('minifyStylesheets');
    }
    cf = this[cfKey] = BT.CombinedFilesController.create({
      outputFileClass: k,
      minify: minify,
      filesToCombine: files,
      framework: this._appfw, // bring it under the apps fw control
      relpath: BT.path2Url(combinedName),
    });
    return cf;
  }.property(),

  /**
    @private
  */
  combineWrapperFrameworks: function (fileType) {
    var files = [],
      cfKey = '_combineWrapperFrameworks_' + fileType,
      cf = this[cfKey],
      k = fileType === "scripts" ? BT.ScriptFile: BT.CSSFile,
      minify = fileType === "scripts" ? this.get('minifyScripts') : this.get('minifyStylesheets'),
      ext = fileType === "scripts" ? ".js" : ".css";

    if (cf) cf.destroy();

    this._fws.filterProperty('isWrapperFramework').map(function (fw) {
      var ref = fw.get('ref');
      if (ref.indexOf(":") === -1) { // only contain top level wrapperfws
        cf = this[cfKey] = BT.CombinedFilesController.create({
          outputFileClass: k,
          minify: minify,
          filesToCombine: [], // empty for now, being filled later
          framework: fw,
          relpath: BT.path2Url(fw.get('shortname') + ext)
        });
        files.push(cf);
      }
      else return null;
    }, this);

    this._fws.forEach(function (fw) {
      var fwref = fw.get('ref');
      var baseref = fwref.split(":")[0];
      if (fw.isWrapperFramework) return; // don't do anything with wrapper frameworks, as they don't contain code
      if (fwref.indexOf(":") === -1) { // root fw, is not wrapperfw, so add as such
        files.push(fw.get(fileType));
      }
      else {
        files.findProperty('ref', baseref).filesToCombine.pushObjects(fw.get(fileType));
      }
    });
    return files.flatten().filterProperty('content');
  }.property(),

  /**
    @private
  */
  combineAppSproutCore: function (fileType) { // combine sproutcore in one, the app and the rest in another
    var cfKey = '_combineAppSproutCore_' + fileType;
    var cf = this[cfKey];
    var k = fileType === "scripts" ? BT.ScriptFile: BT.CSSFile;
    var minify = fileType === "scripts" ? this.get('minifyScripts') : this.get('minifyStylesheets');
    var ext = fileType === "scripts" ? ".js" : ".css";
    var scfws = [], appfws = [];
    this._fws.forEach(function (fw) {
      var fwref = fw.get('ref');
      if (fwref && fwref.indexOf("sproutcore:") > -1) scfws.push(fw);
      else appfws.push(fw);
    });

    if (cf) {
      cf[0].destroy();
      cf[1].destroy();
    }

    var app = BT.CombinedFilesController.create({
      outputFileClass: k,
      minify: minify,
      relpath: BT.path2Url(this.get('name') + ext),
      filesToCombine: appfws.getEach(fileType).flatten().filterProperty('content'),
      framework: this._appfw
    });

    var sc = BT.CombinedFilesController.create({
      outputFileClass: k,
      minify: minify,
      relpath: BT.path2Url("sproutcore" + ext),
      filesToCombine: scfws.getEach(fileType).flatten().filterProperty('content'),
      framework: this._appfw
    });

    cf = this[cfKey] = [sc, app].flatten();
    return cf;
  }.property(),

  /**
    @private
  */
  doRelativeBuild: function () {
    return BT.runMode === BT.RM_BUILD && this.get('relativeBuild');
  }.property('relativeBuild').cacheable(),

  /**
    @private
  */
  concatenatedProperties: ['frameworks', 'modules'],

  /**
    @private
  */
  lprojDirNames: function () {
    var language = this.get('language'),
      ret = [];

    BT.LANGUAGE_MAP[language].forEach(function (lang) {
      ret.push(lang + '.lproj');
    }, this);
    ret.push(language + '.lproj');

    return ret;
  }.property('language').cacheable(),

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

  /**
    @private
  */
  bootstrapSetupBodyClassNames: function () {
    return "<script>if (SC.setupBodyClassNames) SC.setupBodyClassNames();</script>\n";
  }.property(),

  /**
    @private
  */
  contentForBody: "", // empty for now...

  /**
    @private
  */
  contentForLoading: function () {
    // return an ejs generated template, never ever cache this, otherwise
    // we won’t pick up changes in the template
    var ejs = require('ejs'),
      pathlib = require('path'),
      fslib = require('fs'),
      path = this.get('path'),
      lprojDirNames = this.get('lprojDirNames'),
      templates = this.get('templates'),
      locPath, templatePath;

    for (var i = 0, len = lprojDirNames.get('length'); i < len; i++) {
      var lprojDirName = lprojDirNames.objectAt(i);
      locPath = pathlib.join(path, lprojDirName, "loading.ejs");
      if (templates.getEach('path').contains(locPath)) {
        templatePath = locPath;
        break;
      }
    }
    if (!templatePath) {

      locPath = pathlib.join(path, "loading.ejs");
      if (templates.getEach('path').contains(locPath)) templatePath = locPath;
    }
    if (!templatePath) templatePath = pathlib.join(BT.btPath, "templates", "loading.ejs");

    var template = fslib.readFileSync(templatePath),
      ret;

    try {
      ret = ejs.render(template.toString());
    }
    catch (er) {
      BT.Logger.error("Problem compiling the Html template: " + require('util').inspect(er));
      BT.Logger.error("ret: " + require('util').inspect(ret));
    }
    return ret;
  }.property(),

  /**
    @private
  */
  contentForResources: "", // empty for now

  /**
    @private
  */
  init: function () {
    sc_super();
    // don't do a thing if we're building and the app should not build
    if (BT.runMode === BT.RM_BUILD) {
      if (this.doNotBuild) return;
      // don't register if there are build-targets and we are not one of them.
      if (BT.BUILDTARGETS && BT.BUILDTARGETS.indexOf(this.get('name')) === -1) return;
    }

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

  /**
    @private
  */
  _findFrameworkDeps: function () {
    return this._findDeps(this.frameworks);
  },

  /**
    @private
  */
  _findModuleDeps: function () {
    return this._findDeps(this.modules);
  },

  /**
    @private
  */
  _findDeps: function (frameworks) {
    var util = require('util'),
      deps = [];

    if (!frameworks) return deps;
    BT.Logger.debug("_findDeps: frameworks:  " + util.inspect(this.frameworks));
    frameworks.forEach(function (fw) {
      var ddeps;
      // if(fw.prototype && fw.prototype.isApp) return; // don't process apps...
      var ref = (SC.typeOf(fw) === SC.T_STRING) ? fw : fw.ref;
      if (!ref) {
        throw new Error("You forgot to put a ref property in a framework configuration");
      }
      BT.Logger.trace("framework ref: " + ref);
      var fwclass = BT.projectManager.getFrameworkClass(ref);
      if (!fwclass) BT.Logger.warn("Could not find referenced framework: " + ref);
      else {
        ddeps = fwclass.dependencies(this.includeTests);
        // filter out any duplicates
        var ret = [];
        ddeps.forEach(function (dd) {
          var r = (SC.typeOf(dd) === SC.T_STRING) ? dd: dd.ref;
          // doesn't occur in the current fw deps in either string form or prop form
          if (ret.indexOf(r) === -1 && !ret.findProperty("ref", r)) {
            BT.Logger.trace('dd going in:  ' + util.inspect(dd));
            // if it doesn't occur in all the deps
            if (deps.indexOf(r) === -1 && !deps.findProperty("ref", r)) {
              // if we have configuration to copy over
              if (fwclass.prototype.isWrapperFramework && fw.all && fw.all[BT.runMode]) {
                if (SC.typeOf(dd) === SC.T_STRING) {
                  dd = { ref: dd };
                }
                BT.Logger.trace("fw.all[BT.runMode]: " + util.inspect(fw.all[BT.runMode]));
                dd = SC.merge(dd, fw.all[BT.runMode]);
              }
              BT.Logger.trace("dd going out: " + util.inspect(dd));
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

  /**
    @private
  */
  _findThemeDeps: function () {
    var deps = [];
    var ddeps;
    var theme = this.get('theme');
    // if(fw.prototype && fw.prototype.isApp) return; // don't process apps...
    var ref = (SC.typeOf(theme) === SC.T_STRING) ? theme : theme.ref;
    var k = BT.projectManager.getThemeClass(ref);
    if (!k) BT.Logger.warn("Could not find referenced theme: " + ref);
    else {
      ddeps = k.dependencies(this.includeTests);
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

  /**
    @private
  */
  _registerFrameworks: function () {
    BT.Logger.debug("instantiating fws");

    this._fws = [];
    this._fwModules = [];

    // The idea here is that frameworks export their dependencies, so
    // a one dimensional list can be made here which orders them correctly
    // and make the list contain only unique values.
    // After that the frameworks are instantiated one by one
    var fwdeps = this._findFrameworkDeps();

    BT.Logger.trace("deps for %@ are: %@".fmt(this.get('name'), require('util').inspect(fwdeps)));

    // take the frameworks, and instantiate
    this._instantiateFrameworks(this._fws, fwdeps, {
      belongsTo: this,
      includeTests: this.includeTests
    });

    var moduledeps = this._findModuleDeps();
    this._instantiateFrameworks(this._fwModules, moduledeps, {
      belongsTo: this,
      isModule: true,
      includeTests: this.includeTests
    });

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
      dependencies: this.get('frameworks'),
      includeTests: this.includeTests,
      isApp: true,
      belongsTo: this,
      name: this.get('name'),
      modules: this._fwModules
    });
    this._fws.push(this._appfw);

    this._allFws = this._fws.concat(this._fwModules);

    if (this.includeSC) {
      // we need it seperately in order to add the things in the right order
      this._bootstrap = BT.projectManager.getFrameworkClass(this.sproutcoreRef + ":bootstrap").create({
        combineScripts: false, // should not combine.
        belongsTo: this,
        includeTests: this.includeTests
      });
      this._allFws = this._allFws.concat(this._bootstrap);
    }
  },

  /**
    @private
  */
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

  /**
    generic computed properties + stuff the template needs

    @private
  */
  scripts: function () {
    var combinefws = this.get('combineFrameworks');
    var m = this[combinefws];
    if (!m) throw new Error("You defined a combining method which doesn't exist!!");
    return m.call(this, 'scripts');
  }.property(),

  /**
    @private
  */
  stylesheets: function () {
    var combinefws = this.get('combineFrameworks');
    var m = this[combinefws];
    if (!m) throw new Error("You defined a combining method which doesn't exist!!");
    return m.call(this, 'stylesheets');
  }.property(),

  /**
    @private
  */
  moduleScripts: function () {
    return this._fwModules.getEach('scripts').flatten().filterProperty('content');
  }.property(),

  /**
    @private
  */
  moduleStylesheets: function () {
    return this._fwModules.getEach('stylesheets').flatten().filterProperty('content');
  }.property(),

  /**
    @private
  */
  buildFiles: function () {
    var ret = [];

    ret.pushObjects(this.get('scripts'))
      .pushObjects(this.get('stylesheets'))
      .pushObjects(this.get('moduleScripts'))
      .pushObjects(this.get('moduleStylesheets'));

    return ret;
  }.property(),

  /**
    @private
  */
  resources: function () {
    return this._fws.getEach('resources').flatten();
  }.property(),

  /**
    @private
  */
  templates: function () {
    return this._fws.getEach('templates').flatten();
  }.property(),

  /**
    @private
  */
  files: function () {
    return this._fws.getEach('files').concat(this._fwModules.getEach('files')).flatten();
  }.property(),

  /**
    @private
  */
  imageUrls: function (opts) {
    //BT.Logger.debug("imageUrls: " + require('util').inspect(opts));
    //BT.Logger.debug("SC.typeOf(opts): " + SC.typeOf(opts));
    // opts are {
    // x2: true / false
    // sprited: true / false
    // }
    return []; // nothing for now, as we are doing dataurls only
  },

  /**
    @private
  */
  stylesheetUrls: function (opts) {
    //BT.Logger.debug("stylesheetUrls: " + require('util').inspect(opts));
    // opts are {
    // x2: true / false
    // }
    var ret;
    var styles = this.get('stylesheets');
    var isRelativeBuild = this.get('doRelativeBuild');
    if (opts && opts.x2) {
      ret = isRelativeBuild ? styles.getEach('relativeUrl2x') : styles.getEach('url2x');
    } else {
      ret = isRelativeBuild ? styles.getEach('relativeUrl') : styles.getEach('url');
    }
    return ret;
  },

  /**
    @private
  */
  themeName: function () {
    var theme = this.get('theme');
    theme = (theme === 'sc-theme')? "sproutcore:legacy": theme;
    var themefw = this._fws.findProperty('ref', theme);
    if (!themefw) {
      BT.Logger.warn("The template tried to insert the css theme name you defined for the theme (%@), but the theme framework cannot be found".fmt(this.get('theme')));
      return "sc-theme"; // some sensible default value
    }
    else {
      return themefw.get('cssName');
    }
  }.property(),

  /**
    @private
  */
  indexHtmlFile: function () {
    return BT.IndexHtmlFile.create({
      belongsTo: this,
    });
  }.property(),

  /**
    @private
  */
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
      //link_tests: this.includeTests ? "/" + appname + "/" + appname + "/tests/-index.json" : "",
      link_tests: "/" + appname + "/" + appname + "/tests/-index.json",
      name: "/" + this.get('name')
    };
  }.property(),

  /**
    There will have to be a test run mode, in which all frameworks are put at the root
    because running it in dev mode is not going to work...
    The reason is that the test runner app expects every framework to be on the root

    the url layout should be
    [appname]/[fwname]/[subfwname]/[file]
    which essentially means this app will get the request because of the file being in this app
    fwname/subfwname allows us to detect which fw, can be translated to fwref format

    @private
  */
  fileFor: function (url) {
    var fwurl = url;
    var f, fw;

    BT.Logger.trace("fileFor: " + url);

    var frameworks = this._allFws;

    for (var i = 0, len = frameworks.length; i < len; i += 1) {
      fw = frameworks[i];
      f = null;
      if (fw) {
        BT.Logger.traceGroup("trying fw " + fw.get('name'));
        f = fw.fileFor(fwurl);
        if (f) {
          BT.Logger.trace("file found...");
          BT.Logger.traceGroupEnd();
          if (f.get('isTest')) {
            // wrap it
            return BT.File.create({
              content: this.wrapTest(f),
              contentType: "text/html",
            });
          }
          else return f;
        }
        else {
          BT.Logger.traceGroupEnd();
        }
      }
    }

  },

  /**
    Returns the test file wrapped in the proper frameworks

    @private
  */
  wrapTest: function (testFile) {
    var fw = testFile.get('framework');
    var tmp;

    // var testingRef = this.sproutcoreRef + ":testing";
    var testingRef = "sproutcore:testing"; // for some reason this.sproutcoreRef suddenly contains double single quotes

    var deps = [];
    var findDeps = function (fwd) {
      var ret;
      BT.Logger.debug("fwdep: " + fwd);
      if (SC.typeOf(fwd) === SC.T_STRING) {
        deps.push(fwd);
        ret = this._fws.findProperty('ref', fwd);
      }
      else {
        ret = this._fws.findProperty('ref', fwd.get('ref'));
        deps.push(fwd.get('ref'));
      }
      if (!ret) {
        BT.Logger.warn("Something is fishy, because cannot find a instance for ref. Use --log-level debug to find out more");
      }
      else {
        if (ret.dependencies) {
          ret.dependencies.forEach(findDeps, this);
          if (ret.testDependencies) ret.testDependencies.forEach(findDeps, this);
        }
      }
    };

    // the test dependencies are only used in the appBuilder itself to make sure everything is loaded, but
    // is not available in the class, so re-use the information as is configured.
    var fwdeps = fw.dependencies || [];
    if (this.includeTests && fw.testDependencies) {
      fwdeps = fwdeps.concat(fw.testDependencies);
    }
    fwdeps.forEach(findDeps, this); // now all deps are in deps, doesn't need to be unique

    var fws = this._fws.filter(function (f) {
      if (deps.contains(f.get('ref'))) return true;
    });
    // deps.forEach(findDepInstance, this);
    if (!this._fws.contains(fw)) {
      fws.push(this._fws.findProperty('ref', fw.get('ref')));
    }
    else fws.push(fw);

    if (!fws.findProperty('ref', testingRef)) {
      BT.Logger.debug("cannot find testingRef in fws, pushing");
      fws.push(this._fws.findProperty('ref', testingRef));
    }

    // assume that the current app loads all necessary frameworks, and that they are in order in _fws
    //var fws = this._fws.slice(0, this._fws.indexOf(fw) + 1);
    tmp = BT.AppBuilder.create({
      doNotRegister: true, // prevent re-use
      _fws: fws,
      language: "en",
      //theme: "sc-theme",
      theme: this.get('theme'),
      title: testFile.get('url'),
      init: function () {},
      path: "", // let it not be null
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
    return tmp.getPath('indexHtmlFile.content');
  }

});
