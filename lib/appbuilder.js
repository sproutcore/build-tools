/*jshint node:true*/
/*globals BT*/

BT.AppBuilder = SC.Object.extend({

// user settable options:
//
  doNotRegister: false,

  includeTests: false,

  combineScripts: function () {
    if (BT.runMode === BT.RM_BUILD) return true;
    else return false;
  }.property(),

  combineStylesheets: function () {
    if (BT.runMode === BT.RM_BUILD) return true;
    else return false;
  }.property(),

  // how this works:
  // the value of this property is the method name used for combining
  combineFrameworks: function () {
    if (BT.runMode === BT.RM_BUILD) return BT.COMBINE_FWS_ALL;
    else return BT.COMBINE_FWS_NONE;
  }.property(),

  // as an example, this function just returns the fileType needed
  // fileType is the type of files to get at the frameworks.
  // being either "scripts" or "stylesheets"
  combineNone: function (fileType) {
    return this._fws.getEach(fileType).flatten().filterProperty('content');
  }.property(),

  // needs to be cacheable, as we are returning an object which will auto-update itself
  combineAllFrameworks: function (fileType) {
    var files = this._fws.getEach(fileType).flatten().filterProperty('content'),
      cfKey = '_combineAllFrameworks_' + fileType,
      cf = this[cfKey];

    // We can't reuse this controller because in build mode, when filesToCombine
    // is updated, the changes are not propagate soon enough.
    if (cf) cf.destroy();

    var appname = this.get('name');
    var k, combinedName;
    if (fileType === "scripts") {
      k = BT.ScriptFile;
      combinedName = appname + ".js";
    }
    else {
      k = BT.CSSFile;
      combinedName = appname + ".css";
    }
    cf = this[cfKey] = BT.CombinedFilesController.create({
      outputFileClass: k,
      filesToCombine: files,
      framework: this._appfw, // bring it under the apps fw control
      relpath: BT.path2Url(combinedName),
    });
    return cf;
  }.property(),

  combineWrapperFrameworks: function (fileType) {
    var files = [],
      cfKey = '_combineWrapperFrameworks_' + fileType,
      cf = this[cfKey],
      k = fileType === "scripts" ? BT.ScriptFile: BT.CSSFile,
      ext = fileType === "scripts" ? ".js" : ".css";

    if (cf) cf.destroy();

    this._fws.filterProperty('isWrapperFramework').map(function (fw) {
      var ref = fw.get('ref');
      if (ref.indexOf(":") === -1) { // only contain top level wrapperfws
        cf = this[cfKey] = BT.CombinedFilesController.create({
          outputFileClass: k,
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

  combineAppSproutCore: function (fileType) { // combine sproutcore in one, the app and the rest in another
    var cfKey = '_combineAppSproutCore_' + fileType;
    var cf = this[cfKey];
    var k = fileType === "scripts" ? BT.ScriptFile: BT.CSSFile;
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
      relpath: BT.path2Url(this.get('name') + ext),
      filesToCombine: appfws.getEach(fileType).flatten().filterProperty('content'),
      framework: this._appfw
    });

    var sc = BT.CombinedFilesController.create({
      outputFileClass: k,
      relpath: BT.path2Url("sproutcore" + ext),
      filesToCombine: scfws.getEach(fileType).flatten().filterProperty('content'),
      framework: this._appfw
    });

    cf = this[cfKey] = [sc, app].flatten();
    return cf;
  }.property(),

  /**
    Set it to true to automatically generate a cache manifest file.

    @property
    @type Boolean
    @default false
  */
  useHtml5Manifest: false,

  /**
    You can specify here special rules for your cache manifest :

    - entries: Additional files you want to be cached.

    - caches: Files listed here will be explicitly cached after they're downloaded for the first time.

    - networks: Online whitelist section of the cache manifest. "*" is set by default, which allows all URLs.

    - fallbacks: Specify fallback pages if a resource is inaccessible.

    Example:

        html5ManifestOptions: {
          entries: ['http://example.com/path/to/a/resource'],
          caches: [],
          networks: ['*'],
          fallbacks: [],
        },

    @property
    @type Object
    @default null
  */
  html5ManifestOptions: null,

  title: function () {
    return this.get('name');
  }.property(), // the title of the app

  /**
    Languages to add to the build.  If null, the build tool will look
    for lproj folders and add every languages found.

    @property
    @type Array
    @default null
  */
  languages: null,

  /**
    @private
  */
  languagesToBuild: function () {
    return this.get('languages');
  }.property(),

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

  html5History: false, // use HTML5 history (whatever that is),

  indexHtmlFileName: 'index.html', // the file name used by the build process for the index.html

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

  minifyHtml: function () {
    if (BT.runMode === BT.RM_BUILD) {
      return true;
    }
    if (BT.runMode === BT.RM_DEBUG) {
      return false;
    }
  }.property().cacheable(),

  /**
    @private
  */
  addHtml5Manifest: function () {
    if (BT.runMode === BT.RM_BUILD) return this.get('useHtml5Manifest');
    else return false;
  }.property(),

  /**
    @private
  */
  html5Manifest: function () {
    return BT.AppCacheFile.create({ app: this, });
  }.property(),

  /**
    @private
  */
  html5ManifestFile: function () {
    var language = this.get('language'),
      aKey = '_html5ManifestFile_' + language,
      appC = this[aKey];

    if (appC) return appC;

    appC = this[aKey] = BT.AppCacheFile.create({
      framework: this._appfw,
      app: this,
      language: language
    });

    return appC;
  }.property('language').cacheable(),

  /**
    @private
  */
  html5ManifestUrl: function () {
    return this.getPath('html5ManifestFile.url');
  }.property('language').cacheable(),

  concatenatedProperties: ['frameworks', 'modules'],

  name: function () { // name of the application
    return require('path').basename(this.get('path'));
  }.property('path'),

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

  bootstrapSetupBodyClassNames: function () {
    return "<script>if (SC.setupBodyClassNames) SC.setupBodyClassNames();</script>\n";
  }.property(),

  contentForBody: "", // empty for now...

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
      SC.Logger.error("Problem compiling the Html template: " + require('util').inspect(er));
      SC.Logger.error("ret: " + require('util').inspect(ret));
    }
    return ret;
  }.property(),

  contentForResources: "", // empty for now

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
    //SC.Logger.info("_findFrameworkDeps: frameworks:  " + require('util').inspect(this.frameworks));
    frameworks.forEach(function (fw) {
      var ddeps;
      // if(fw.prototype && fw.prototype.isApp) return; // don't process apps...
      var ref = (SC.typeOf(fw) === SC.T_STRING) ? fw : fw.ref;
      if (!ref) {
        throw new Error("You forgot to put a ref property in a framework configuration");
      }
      //SC.Logger.info("ref: " + ref);
      var fwclass = BT.projectManager.getFrameworkClass(ref);
      if (!fwclass) SC.Logger.warn("Could not find referenced framework: " + ref);
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
    if (!k) SC.Logger.warn("Could not find referenced theme: " + ref);
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
    SC.Logger.debug("instantiating fws");

    this._fws = [];
    this._fwModules = [];

    // The idea here is that frameworks export their dependencies, so
    // a one dimensional list can be made here which orders them correctly
    // and make the list contain only unique values.
    // After that the frameworks are instantiated one by one
    var fwdeps = this._findFrameworkDeps();

    //SC.Logger.debug("deps for %@ are: %@".fmt(this.get('name'), require('util').inspect(fwdeps)));

    // take the frameworks, and instantiate
    this._instantiateFrameworks(this._fws, fwdeps, {
      belongsTo: this,
      relativeBuild: this.relativeBuild,
      includeTests: this.includeTests
    });

    var moduledeps = this._findModuleDeps();
    this._instantiateFrameworks(this._fwModules, moduledeps, {
      belongsTo: this,
      isModule: true,
      relativeBuild: this.relativeBuild,
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
      includeTests: this.includeTests,
      relativeBuild: this.relativeBuild,
      isApp: true,
      belongsTo: this,
      modules: this._fwModules
    });
    this._fws.push(this._appfw);

    if (this.includeSC) {
      // we need it seperately in order to add the things in the right order
      this._bootstrap = BT.projectManager.getFrameworkClass(this.sproutcoreRef + ":bootstrap").create({
        combineScripts: false, // should not combine.
        includeTests: this.includeTests
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
    var combinefws = this.get('combineFrameworks');
    var m = this[combinefws];
    if (!m) throw new Error("You defined a combining method which doesn't exist!!");
    return m.call(this, 'scripts');
  }.property(),

  stylesheets: function () {
    var combinefws = this.get('combineFrameworks');
    var m = this[combinefws];
    if (!m) throw new Error("You defined a combining method which doesn't exist!!");
    return m.call(this, 'stylesheets');
  }.property(),

  moduleScripts: function () {
    return this._fwModules.getEach('scripts').flatten().filterProperty('content');
  }.property(),

  moduleStylesheets: function () {
    return this._fwModules.getEach('stylesheets').flatten().filterProperty('content');
  }.property(),

  buildFiles: function () {
    var ret = [];

    ret.pushObjects(this.get('scripts'))
      .pushObjects(this.get('stylesheets'))
      .pushObjects(this.get('moduleScripts'))
      .pushObjects(this.get('moduleStylesheets'));

    return ret;
  }.property(),

  resources: function () {
    return this._fws.getEach('resources').flatten();
  }.property(),

  templates: function () {
    return this._fws.getEach('templates').flatten();
  }.property(),

  files: function () {
    return this._fws.getEach('files').concat(this._fwModules.getEach('files')).flatten();
  }.property(),

  imageUrls: function (opts) {
    //SC.Logger.debug("imageUrls: " + require('util').inspect(opts));
    //SC.Logger.debug("SC.typeOf(opts): " + SC.typeOf(opts));
    // opts are {
    // x2: true / false
    // sprited: true / false
    // }
    return []; // nothing for now, as we are doing dataurls only
  },

  stylesheetUrls: function (opts) {
    //SC.Logger.debug("stylesheetUrls: " + require('util').inspect(opts));
    // opts are {
    // x2: true / false
    // }
    var ret;
    var styles = this.get('stylesheets');
    var isRelativeBuild = BT.runMode === BT.RM_BUILD && this.get('relativeBuild');
    if (opts && opts.x2) {
      ret = isRelativeBuild ? styles.getEach('relativeUrl2x') : styles.getEach('url2x');
    } else {
      ret = isRelativeBuild ? styles.getEach('relativeUrl') : styles.getEach('url');
    }
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
      SC.Logger.info("The template tried to insert the css theme name you defined for the theme, but the theme framework cannot be found");
      return "sc-theme"; // some sensible default value
    }
    else {
      return themefw.get('cssName');
    }
  }.property(),

  _indexFile: null,

  indexHtmlFile: function () {
    SC.Logger.debug("indexHtmlFile in %@ called for the %@ time".fmt(this.get('name'), (!!this._indexFile ? "second": "first")));
    if (!this._indexFile) {
      this._indexFile = BT.File.create({
        framework: this._appfw,
        isResource: true,
        relativePath: this.get('indexHtmlFileName'), //"index.html",
        parseContent: function () { return this.content; }, // catch building issues
        // we cannot immediately add content, as that would cause an endless loop, as the process of filling needs the url
        // to this file. So we set the content immediately after, so the url can be returned without issues...
        content: ""
        //content: this.get('indexHtml')
      });
      this._indexFile.content = this.get('indexHtml'); // this should make the index have content without
    }
    return this._indexFile;
  }.property(),

  indexHtmlUrl: function () {
    // looking up the cached indexFile is better than trying to get the index file, because that requires
    // a refresh of the content, which is something you'd normally want, but not if you just want the url.
    return this._indexFile? this._indexFile.get('url') : this.get('indexHtmlFile').get('url');
  }.property('indexHtmlFile').cacheable(),

  indexHtml: function () {
    return this.renderIndexHtml(this);
  }.property(),

  renderIndexHtml: function (appObj) {
    if (BT.runBenchmarks) SC.Benchmark.start('appBuilder:renderIndexHtml');
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
          SC.Logger.warn("The buildtools could not find the configured template, falling back to the default one");
        }
        else throw e;
      }
    }
    if (!template) { // load the default one
      template = fslib.readFileSync(pathlib.join(BT.btPath, "templates", "app_index.ejs"));
    }
    var ret;
    try {
      if (BT.runBenchmarks) SC.Benchmark.start('appBuilder:ejsRender');
      ret = ejs.render(template.toString(), {
        app: appObj,
        BT: BT,
        //compileDebug: true,
        // sc_static: function (fn) {
        //   // SC.Logger.log("sc_Static in ejs Render");
        //   // if (BT.runBenchmarks) SC.Benchmark.start('appBuilder:ejsRender(sc_static)');
        //   var appfw = this.app._appfw,
        //       deps = appfw.getPath('scripts.firstObject.resourceDependencies'),
        //       file = appfw.findResourceFor(fn);

        //   if (file.get('length') !== 1) {
        //     SC.Logger.warn("no resource found for: " + fn);
        //     return '';
        //   }
        //   file = file[0];
        //   deps.addObject(file);
        //   // if (BT.runBenchmarks) SC.Benchmark.end('appBuilder:ejsRender(sc_static)');
        //   return file.get('url');
        // }
      });
      if (BT.runBenchmarks) SC.Benchmark.end('appBuilder:ejsRender');
      if (this.get('minifyHtml')) {
        if (BT.runBenchmarks) SC.Benchmark.start('appBuilder:minifyHtml');
        var minify = require('html-minifier').minify;
        ret = minify(ret, {
          removeComments: true,
          collapseWhitespace: true,
          minifyJS: true,
          minifyCSS: true
        });
        if (BT.runBenchmarks) SC.Benchmark.end('appBuilder:minifyHtml');
      }
    }
    catch (er) {
      SC.Logger.error("Problem compiling the Html template: " + require('util').inspect(er));
      SC.Logger.error("ret: " + require('util').inspect(ret));
    }
    if (BT.runBenchmarks) SC.Benchmark.end('appBuilder:renderIndexHtml');
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
      link_tests: this.includeTests ? "/" + appname + "/" + appname + "/tests/-index.json" : "",
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

    SC.Logger.debug("fileFor: " + url);

    if (url === this.get('html5ManifestUrl')) {
      return this.get('html5Manifest');
    }

    var frameworks = this._allFws;

    for (var i = 0, len = frameworks.length; i < len; i += 1) {
      fw = frameworks[i];
      f = null;
      if (fw) {
        //SC.Logger.debug("trying fw " + fw.get('name'));
        f = fw.fileFor(fwurl);
        if (f) {
          //SC.Logger.debug("file found...");
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
    //var util = require('util');
    var tmp;

    // var debugRef = this.sproutcoreRef + ":debug";
    // var testingRef = this.sproutcoreRef + ":testing";
    var debugRef = "sproutcore:debug";
    var testingRef = "sproutcore:testing"; // for some reason this.sproutcoreRef suddenly contains double single quotes

    //util.log("debugRef: " + util.inspect(debugRef));

    var deps = [];
    var findDeps = function (fwd) {
      var ret;
      SC.Logger.debug("fwdep: " + fwd);
      if (SC.typeOf(fwd) === SC.T_STRING) {
        deps.push(fwd);
        ret = this._fws.findProperty('ref', fwd);
      }
      else {
        ret = this._fws.findProperty('ref', fwd.get('ref'));
        deps.push(fwd.get('ref'));
      }
      if (!ret) SC.Logger.warn("Something is fishy, because cannot find a instance for ref");
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

    if (!fws.findProperty('ref', debugRef)) {
      SC.Logger.log("cannot find debug ref in fws, pushing");
      tmp = this._fws.findProperty('ref', debugRef);
      if (!tmp) {
        SC.Logger.log("all fws: " + this._fws.getEach('ref'));
        SC.Logger.log("this app: " + this.get('name'));

      }
      //SC.Logger.log("tmp is " + tmp.get('ref'));
      fws.push(tmp);
    }
    if (!fws.findProperty('ref', testingRef)) {
      SC.Logger.log("cannot find testingRef in fws, pushing");
      fws.push(this._fws.findProperty('ref', testingRef));
    }

    SC.Logger.log("debugRef : "  + debugRef);

    // assume that the current app loads all necessary frameworks, and that they are in order in _fws
    //var fws = this._fws.slice(0, this._fws.indexOf(fw) + 1);
    tmp = BT.AppBuilder.create({
      doNotRegister: true, // prevent re-use
      _fws: fws,
      language: "en",
      theme: "sproutcore:ace",
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
    return tmp.get('indexHtml');
  }

});

