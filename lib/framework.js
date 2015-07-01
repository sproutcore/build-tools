/*jshint node:true*/
/*globals BT */

sc_require('controllers/combined_files.js');
sc_require('controllers/scripts.js');
sc_require('controllers/stylesheets.js');
sc_require('controllers/files.js');
sc_require('controllers/dependencies');

BT.Framework = SC.Object.extend({

  /**
    Walk like a duck.

    @type Boolean
    @default true
  */
  isFramework: true,

  /**
    Set to true if the current framework should be treated like a module.

    @type Boolean
    @default false
  */
  isModule: false,

  /**
    Used for url finding (sproutcore:desktop => sproutcore/desktop)

    Should be set on extend.

    Example:

        ref: 'sproutcore:desktop'


    @type String
    @default null
  */
  ref: null,

  /**
    The path of the framework.

    Example:

        path: dirname()

    @type String
  */
  path: function () {
    var ret = BT._resolveReference(this.get('ref'), "framework");
    BT.Logger.debug("The ref '%@' has been resolved to '%@'".fmt(this.get('ref'), ret));
    return ret;
  }.property('ref').cacheable(),

  /**
    Combine all the JS files together.

    @type Boolean
    @default true
  */
  combineScripts: true,

  /**
    Combine all the CSS files together.

    @type Boolean
    @default true
  */
  combineStylesheets: true,

  /**
    Set to true if you want to enable the traceur compiler for all the files of the frameworks.

    Note that you can use the flag `bt_traceur()` if you just want to enable it in one file.

    @type Boolean
    @default false
  */
  enableTraceur: false,

  /**
    Minify the JS files.

    @type Boolean
    @default true in debug mode || false
  */
  minifyScripts: function () {
    if (BT.runMode === BT.RM_DEBUG) return false;
    else return true;
  }.property(),

  /**
    Minify the CSS files.

    @type Boolean
    @default true in debug mode || false
  */
  minifyStylesheets: function () {
    if (BT.runMode === BT.RM_DEBUG) return false;
    else return true;
  }.property(),

  /**
    Set to true if the current framework warps other frameworks.

    @type Boolean
    @default false
  */
  isWrapperFramework: false,

  /**
    Hook to put any config on in case of isWrapperFramework, to copy out to all subfws

    Example:

        all: {
          debug: {
            combinedScripts: true,
            combinedStylesheets: true,
          },
          production: {
            combinedScripts: true,
            combinedStylesheets: true,
          }
        },

    @type Object
    @default null
  */
  all: null,

  /**
    Set to true if you want to includes fixtures.

    @type Boolean
    @default true in debug mode || false
  */
  includeFixtures: function () {
    if (BT.runMode === BT.RM_DEBUG) return true;
    else return false;
  }.property(),

  /**
    Gets overridden by the app config

    @type Boolean
    @default false
    @readOnly
  */
  includeTests: false,

  /**
    Adds watchers on every directories of the framework in order to notify
    the BT when a file changes.

    @type Boolean
    @default true in debug mode || false
  */
  watchFiles: function () {
    if (BT.runMode === BT.RM_DEBUG) return true;
    else return false;
  }.property(),

  /**
    @private
  */
  scriptExtensions: function () {
    return BT.projectManager.get('scriptExtensions');
  }.property(),

  /**
    @private
  */
  stylesheetExtensions: function () {
    return BT.projectManager.get('stylesheetExtensions');
  }.property(),

  /**
    @private
  */
  resourceExtensions: function () {
    return BT.projectManager.get('resourceExtensions');
  }.property(),

  /**
    @private
  */
  templateExtensions: function () {
    return BT.projectManager.get('templateExtensions');
  }.property(),

  /**
    Dependencies is an array and can contain
    - framework refs, such as "sproutcore:desktop"
    - framework config, such as { ref: "sproutcore:desktop", combineScripts: false }
    or a combination of both

    @private
  */
  dependencies: null,

  /**
    To which app this framework belongs

    @private
  */
  belongsTo: null,

  /**
    @private
  */
  modules: null,

  /**
    @private
  */
  resources: function () {
    return this.getPath('files.resources');
  }.property('files'), // don't cache... the files controller will do that

  /**
    @private
  */
  templates: function () {
    return this.getPath('files.templates');
  }.property('files'),

  /**
    Just get the last name from the path and take that
    so "frameworks/sproutcore/frameworks/desktop" should become "desktop"

    @private
  */
  name: function () {
    var pathlib = require('path');
    var p = this.get('path'); // assume we have one, as init checks
    return pathlib.basename(p);

  }.property('path').cacheable(),

  /**
    Get the full name from the path, so frameworks/sproutcore/frameworks/desktop
    should become sproutcore/desktop

    @private
  */
  fullname: function () {
    if (this.isApp) {
      return this.get('name');
    }
    else return this.get('ref').replace(/:/g, "/");
  }.property('ref').cacheable(),

  /**
    @private
  */
  init: function () {
    sc_super();
    //var fullfwname = this.get('fullname');
    var shortname = this.get('name');
    //var pathlib = require('path');

    var p = this.get('path');
    if (SC.typeOf(p) === SC.T_STRING) {
      p = BT.url2Path(p);
      this.set('path', p);
    }

    this.files = BT.FrameworkFilesController.create({ framework: this });
    this._scripts = BT.FrameworkScriptsController.create({ framework: this });
    this._scripts.contentBinding = this._scripts.bind('content', this.files, 'scripts');
    this._stylesheets = BT.FrameworkStylesheetsController.create({ framework: this });
    this._stylesheets.contentBinding = this._stylesheets.bind('content', this.files, 'stylesheets');

    var combinedName, combineStylesheets;
    if (this.get('combineScripts')) {
      combinedName = shortname + ".js";
      //combinedName = fwname + ".js";
      this.scripts = BT.CombinedFilesController.create({
        framework: this,
        minify: this.get('minifyScripts'),
        outputFileClass: BT.ScriptFile,
        relpath: BT.path2Url(combinedName),
        contentType: 'application/javascript'
      });
      this.scripts.filesToCombineBinding = this.scripts.bind('filesToCombine', this._scripts, 'arrangedObjects');
      this.scripts.filesDidChangeBinding = this.scripts.bind('filesDidChange', this._scripts, 'filesHaveChanged');
      this.scripts.finishedLoadingBinding = this.scripts.bind('finishedLoading', this._scripts, 'finishedLoading');
    }
    else {
      this.scripts = this._scripts;
    }

    if (this.get('combineStylesheets')) {
      combinedName = shortname + ".css";
      //combinedName = fwname + ".css";
      combineStylesheets = BT.CombinedFilesController.create({
        relpath: BT.path2Url(combinedName),
        minify: this.get('minifyStylesheets'),
        outputFileClass: BT.CSSFile,
        framework: this,
        contentType: 'text/css'
      });
      combineStylesheets.filesToCombineBinding = combineStylesheets.bind('filesToCombine', this._stylesheets, 'arrangedObjects');
      combineStylesheets.filesDidChangeBinding = combineStylesheets.bind('filesDidChange', this._stylesheets, 'filesHaveChanged');
      combineStylesheets.finishedLoadingBinding = combineStylesheets.bind('finishedLoading', this._stylesheets, 'finishedLoading');
      this.stylesheets = combineStylesheets;
    }
    else this.stylesheets = this._stylesheets;
    if (this.isWrapperFramework) this.initWrapperFramework();
    else this.initFramework();
    //this.invokeNext('initFramework');
  },

  /**
    @private
  */
  initFramework: function () {
    //BT.Logger.debug('initFramework for ' + this.get('ref'));
    if (BT.runBenchmarks) SC.Benchmark.start('framework:initFramework');
    // perhaps the skipdirs could be better put as a private var, or even public var, with concatenatedProperties
    // this.scanFiles({
    //   skipDirs: ['apps']
    // });
    if (BT.runBenchmarks) SC.Benchmark.start('framework:initFramework:registeringPath');
    var rawfiles = BT.fileManager.registerPath(this.get('path'), this, {
      skipDir: ['apps'],
      shouldWatch: this.get('watchFiles'),
      includeTests: this.get('includeTests'),
      includeFixtures: this.get('includeFixtures')
    });
    if (BT.runBenchmarks) SC.Benchmark.end('framework:initFramework:registeringPath');
    // // set the languages to build for this app only if they are not preset
    // if (app && !app.get('languages')) {
    //   app.languagesToBuild = languages.get('length') ? languages : ['en'];
    // }
    //
    if (BT.runBenchmarks) SC.Benchmark.start('framework:initFramework:buildingLanguagesToBuild');
    var app = this.get('belongsTo');
    if (app && !app.get('languages')) {
      var fileLangs = [];
      rawfiles.forEach(function (r) {
        var l = r.get('language');
        if (fileLangs.indexOf(l) === -1) fileLangs.push(l);
      });
      fileLangs = fileLangs.without("any");
      app.languagesToBuild = fileLangs.get('length') ? fileLangs : ['en'];
    }
    if (BT.runBenchmarks) SC.Benchmark.end('framework:initFramework:buildingLanguagesToBuild');
    // wrap the raw files in fw files
    if (BT.runBenchmarks) SC.Benchmark.start('framework:initFramework:buildingFWFiles');
    var files = [];
    rawfiles.forEach(function (rf) {
      // var ext = require('path').extname(rf.get('path'));
      // ext = (ext[0] === ".") ? ext.slice(1) : ext;
      var k = BT.projectManager.fileClassFor(rf.get('extension'));
      if (k) { // only create when the file class is known.
        var f = k.create({ _debugPath: rf.get('path'), rawFile: rf, framework: this });
        files.push(f);
      }
    }, this);
    if (BT.runBenchmarks) SC.Benchmark.end('framework:initFramework:buildingFWFiles');

    this.allFiles = files;
    this.files.set('content', files);

    //this.setFilesForLanguage();

    // now we set the rawContent of all the files. If we do it earlier
    // we get into trouble with slicing. so we start with resources on purpose
    // as slicing will need access to the content during css parsing
    // files.filterProperty('isResource').forEach(function (f) {
    //   f.set('rawContent', fslib.readFileSync(f.get('path')));
    // });
    // // now the rest, we don't do filterProperty because that would require passing
    // // through everything three times instead of two
    // files.forEach(function (f) {
    //   if (!f.get('rawContent')) {
    //     f.set('rawContent', fslib.readFileSync(f.get('path')));
    //   }
    // });

    // var belongsTo = this.belongsTo;
    // if (belongsTo) belongsTo.addObserver('language', this, 'setFilesForLanguage');
    if (BT.runBenchmarks) SC.Benchmark.end('framework:initFramework');
  },

  /**
    Run special init: which means that we won't check a few more directories, such as frameworks
    reason would be that we still want to load a few things that otherwise not get loaded...
    my primary example here is sproutcore, which has nothing to load for the app
    not even the index.html template, so it might be that a wrapper framework is just
    an empty shell...
    even the combining of all subframeworks should better be done by the saving process, if they want to do that
    at all.

    @private
  */
  initWrapperFramework: function () {
  },


  /**
   * called by the file manager when a new file is detected for this framework
   * @param {BT.RawFile} rawFile instance of BT.RawFile to be added
   */
  addFile: function (rawFile) {
    var filename = rawFile.get('path');
    var ext = require('path').extname(filename);
    ext = (ext[0] === ".") ? ext.slice(1) : ext;
    var k = BT.projectManager.fileClassFor(ext);
    if (k) { // only create when the file class is known.
      if (!this.getPath('files.filenames')[filename]) {
        var f = k.create({ rawFile: rawFile, framework: this });
        this.get('files').pushObject(f);
      }
    }
  },

  removeFile: function (rawFile) {
    var f = this.get('files').findProperty('path', rawFile.get('path'));
    if (f) {
      this.get('files').removeObject(f);
      f.destroy();
    }
  },

  /**
    @private
  */
  relativePath: function () {
    return "/" + this.getPath('belongsTo.name') + "/" + this.get('fullname');
  }.property().cacheable(),

  /**
    @private
  */
  targets: function () {
    // creating our own url, because otherwise we would have to grab a file first
    var relativePath = this.get('relativePath');
    return {
      kind: 'framework',
      name: "/" + this.get('fullname'),
      //link_docs: "",
      link_root: relativePath,
      link_tests: relativePath + "/tests/-index.json"
    };
  }.property().cacheable(),

  /**
    @private
  */
  indexJSON: function () {
    return this.getPath('files.tests').map(function (f) {
      return { url: f.get('url'), filename: f.get('relativePath') };
    });
  }.property(),

  /**
    @private
  */
  hasModule: function () {
    var modules = this.get('modules');
    return this.isApp && modules && modules.get('length');
  }.property(),


  /**
    @private
  */
  setFilesForLanguage: function () {
    var language = this.getPath('belongsTo.language'),
      locFiles = this.allFiles.filter(function (f) {
        var l = f.get('language');
        return l === 'any' || l === language;
      });
    this.files.set('content', locFiles);
    //this._scripts.notifyPropertyChange('content');
  },


  /**
    Keep track of all the files of the framework.

    @private
  */
  files : null,

  /**
    @private
  */
  fileFor: function (fn) {
    var pathlib = require('path');
    var f;


    // check for language first

    if (BT.runMode === BT.RM_DEBUG) {
      if (fn.indexOf(this.get('fullname') + "/tests/-index.json") > -1) {
        return BT.JSONFile.create({
          content: JSON.stringify(this.get('indexJSON'))
        });
      }
    }


    if (this.get('combineScripts') && pathlib.extname(fn) === ".js") {
      f = this.get('scripts').objectAt(0);
      if (fn === f.get('url')) return f;
    }
    if (this.get('combineStylesheets') && pathlib.extname(fn) === ".css") {
      f = this.get('stylesheets').objectAt(0);
      if (fn === f.get('url')) return f;
      if (fn === f.get('url2x')) return f;
    }
    return this.files.fileFor(fn);
  },

  /**
    convenience method, used by slicing
    if basepath is not given, assume the root path of the current framework

    @private
  */
  findResourceFor: function (filename, basepath) {
    //BT.Logger.debug('findResources for filename: ' + filename);
    var resources = this.getPath('files.resources');
    var pathlib = require('path');
    // if not given, assume the root path
    if (!basepath) basepath = this.get('path');
    var filepath = pathlib.join(basepath, filename);
    // first try to find the filename on basepath, only then try the more expensive filter
    var firstTry = resources.findProperty('path', filepath);
    if (firstTry) return [firstTry];

    var ret = resources.filter(function (f) {
      var p = f.get('path');
      if (p.indexOf(filename) > -1) return true;
    });
    return ret;
  },

  /**
    @private
  */
  contentHash: function () {
    return this.getPath('files.contentHash');
  }.property('files.contentHash').cacheable()

});


BT.Framework.mixin({

  // this is ackward, but I don't know a better solution.
  // the problem is that dependencies are on the class, and
  // I'd either have to instantiate to not have to look at the prototype
  // or add this method which will auto-load any needed classes in order to
  // retrieve the dependencies from those classes...
  // ergo: i need to know the settings on the class without instantiating...
  // another way would be to mis-use the extend function to do this...
  //
  // Assuming we use this method, the loading of the classes could be done by the appBuilder
  // and this function then just returns the dependencies, and could also include any "all"
  // settings. This would save the
  dependencies: function () {
    var deps = this.prototype.dependencies;

    var isTheme = this.prototype.isTheme;
    var all = this.prototype.all;
    var ret = [];

    if (deps && deps.length > 0) {
      deps.forEach(function (d) {
        var ddeps;
        var ref = (SC.typeOf(d) === SC.T_STRING) ? d : d.ref;
        var k = isTheme ? BT.projectManager.getThemeClass(ref): BT.projectManager.getFrameworkClass(ref);
        if (!k) BT.Logger.warn("Could not find referenced framework: " + ref);
        else {
          ddeps = k.dependencies();
          // first ddeps, then d, causing the load order to be correct, because deepest will be first
          ret = ret.concat(ddeps, d);
        }
      });

      ret = ret.map(function (d) {
        if (all) {
          return SC.mixin({
            ref: d
          }, all);
        }
        else {
          return d;
        }
      });
    }


    return ret;
  }

});
