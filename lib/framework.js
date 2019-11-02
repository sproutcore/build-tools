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
   * testDependencies is an array containing dependencies which just need
   * to be included whenever tests are required (includeTests is set to true)
   * and can contain
   * - framework refs, such as "sproutcore:debug"
   * - framework config, such as { ref: "sproutcore:debug", combineScripts: false }
   * or a combination of both
   * @type {Array}
   */
  testDependencies: null,

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
    if (this.get('isApp')) {
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
    if (BT.runBenchmarks) SC.Benchmark.start('framework:scanFiles');
    // perhaps the skipdirs could be better put as a private var, or even public var, with concatenatedProperties
    this.scanFiles({
      skipDirs: ['apps', 'modules']
    });
    var belongsTo = this.belongsTo;
    if (belongsTo) belongsTo.addObserver('language', this, 'setFilesForLanguage');
    if (BT.runBenchmarks) SC.Benchmark.end('framework:scanFiles');
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
      return { url: f.get('url').replace('.js', '.html'), filename: f.get('relativePath') };
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
  scanFiles: function (opts) {
    var pathlib = require('path'),
      fslib = require('fs'),
      files = [],
      me = this,
      fwPath = this.get('path'),
      app = this.get('belongsTo'),
      //language = app ? app.get('language') : null,
      languages = SC.Set.create(),

      // get all registered extensions first
      exts = BT.projectManager.get('extensions'),
      skipDirs = opts.skipDirs || [];

    skipDirs.push('.git');
    if (!this.get('includeFixtures')) skipDirs.push('fixtures');
    if (!this.includeTests) skipDirs.push('tests');

    var allDirs = [fwPath];

    if (this.get('hasModule')) {
      var modulePath = pathlib.join(this.get('path'), "module_info.js");
      files.push(BT.ModuleScriptFile.create({ path: modulePath, framework: me, }));
    }

    var scanDir = function (dir, language) {
      var fileList = fslib.readdirSync(dir);
      fileList.forEach(function (fn) {
        var p = pathlib.join(dir, fn);
        var ext = pathlib.extname(p);
        ext = (ext[0] === ".") ? ext.slice(1) : ext;
        var stat = fslib.statSync(p);
        if (stat.isFile()) {
          if (exts.contains(ext)) {
            var k = BT.projectManager.fileClassFor(ext);
            var f = k.create({ path: p,
              framework: me,
              language: language || 'any'
              //watchForChanges: this.get('watchFiles'), // this works differently now
            });
            files.push(f);
          }
        }
        else if (stat.isDirectory()) {
          var lang = null;
          if (!skipDirs.contains(fn)) {
            allDirs.push(p); // store full path for dir, for watchers
            if (fn.slice(fn.length - 6, fn.length) === '.lproj') {
              lang = BT.languageFor(fn.slice(0, fn.length - 6));
              languages.add(lang);
            }
            scanDir(p, lang);
          }
        }
      });
    };

    scanDir(fwPath);
    this.allFiles = files;

    this.setFilesForLanguage();

    // now we set the rawContent of all the files. If we do it earlier
    // we get into trouble with slicing. so we start with resources on purpose
    // as slicing will need access to the content during css parsing
    files.filterProperty('isResource').forEach(function (f) {
      f.set('rawContent', fslib.readFileSync(f.get('path')));
    });
    // now the rest, we don't do filterProperty because that would require passing
    // through everything three times instead of two
    files.forEach(function (f) {
      if (!f.get('rawContent')) {
        f.set('rawContent', fslib.readFileSync(f.get('path')));
      }
    });

    // find folders and add watchers
    if (this.get('watchFiles')) {
      this.setupDirectoryWatchers(allDirs);
    }
  },

  /**
    @private
  */
  setFilesForLanguage: function () {
    var language = this.getPath('belongsTo.language'),
      locFiles = this.allFiles.filter(function (f) {
        var l = f.get('language');
        return l === 'any' || l === language;
      });
    this.files.set('content', locFiles);
    //this._scripts.notifyPropertyChange('content');
  },

  /**
    The system of directory watchers is going to be difficult
    it seems there is only one event (on osx?), which is "rename", and doesn't provide any extra information
    on what has changed or has been created. This means that the only way to figure out what has changed is to
    scan the directory non-recursively. There is the second parameter called filename which essentially does seem
    to work on osx (even if it is not mentioned in the official node docs), and the docs warn that it might not always
    be available on all platforms, and that a fallback implementation is wise to have.
    so, what seems to be the best approach to begin with is to use filename anyhow.
        the fallback implementation would need to keep a list around of the items in the directory (result of fs.readDirSync())
    and whenever things change do another readDirSync() and compare the lists. The list should also per directory contain a
    property on what type (file or directory) in order to know what to remove.
    There is one smallish thing: a file rename will cause two calls in quick succession, one with the original file name
    one with the new file name. It is unlikely that this can be used reliably.
    the fallback would first compare the old list to the new list (anything new or removed):
    - anything new: fs.statSync the new thing to check what it is.
      - new file? => create file
      - new directory => add a watch
    - anything removed:
      - file? destroy the file
      - directory? remove the watcher
    - anything renamed: => means the lists are of the same length, but there is a content difference
      - if the original is a file, look up the file and adjust the path
      - if the original is a directory, look up the original watcher, get rid of it, and create a new watcher
    we don't have to do anything else, as the files will watch themselves
        It seems that having directory watchers around on mac osx is enough...
    What is unclear however is whether this also counts for anything under 10.7 (Lion).
    A quick test under linux reveals that there are differences in how this is called exactly
    for linux directory watchers are also sufficient.
        MAC OSX
    under mac osx a file rename will send
     - a rename event to the file watcher with fn null
     - a rename event to the directory watcher with the original file name
     - a rename event to the directory watcher with the new file name
     - a change event with filename null to the file watcher
    a file create sends a single "rename" event to the watcher, as with a file delete
    Note that the watcher itself will keep working correctly after the rename...
        LINUX
    under linux every event gets sent twice (why?) and the signature is different (a bit)
    a file create will send to the directory watcher:
     - a rename event with filename
     - a change event with filename
        a filename change will send to the directory watcher
     - a rename event with the original file name
     - a rename event with the new file name
     and to the file watcher
     - a rename event with the original file name
    Note that the watcher itself will keep working correctly after the rename...
        a file delete will send to the file watcher
     - a change event with the filename
     - two rename events with the filename
     and to the directory watcher
     - a rename event with the filename
        var fslib = require('fs');

    @private
  */
  setupDirectoryWatchers: function (alldirs) {
    if (!this._dirWatchers) this._dirWatchers = {};

    alldirs.forEach(function (dir) {
      this.watchDirectory(dir);
    }, this);
  },

  watchDirectory: function (dir) {
    var fslib = require('fs');

    this._dirWatchers[dir] = fslib.watch(dir, this._createWatcherForwarder(dir));
    BT.Framework.watchCount++;
  },

  unwatchDirectory: function (dir) {
    this._dirWatchers[dir].close();
    this._dirWatchers[dir] = null;
    BT.Framework.watchCount--;
  },

  /**
    a function on the class, as it is needed also to add new watchers on the fly

    @private
  */
  _createWatcherForwarder: function (dirname) {
    var me = this;
    return function (event, filename) {
      SC.RunLoop.begin();
      me.fsDirDidChange.call(me, dirname, event, filename);
      SC.RunLoop.end();
    };
  },

  fsDirDidChange: function (directory, event, filename) {
    BT.Logger.debug("BT.Framework#fsDirDidChange: " + event + ' file: ' + directory + '/' + filename);
    var fslib = require('fs');
    var pathlib = require('path');
    if (!filename) {
      // we have to figure out which file has changed
      // we can use the frameworks files controller to keep track of files
      // and Object.keys(this._dirWatchers) for directories
      BT.Logger.error("You are using an OS which doesn't provide file names with filenames with events,");
      BT.Logger.error("You will have to restart the build tools for the changes to take effect.");
      BT.Logger.error("Please report which OS this is exactly...");
      return; // don't do anything at the moment
    }
    var fullpath = pathlib.join(directory, filename);
    if (event === "change") {
      this.fsDidChangeFile(fullpath);
    }
    else { // event is rename
      // two options:
      // - filename is a dir
      // - filename is a file
      var stat;
      var dirnames = Object.keys(this._dirWatchers);
      try {
        stat = fslib.statSync(fullpath);
      }
      catch (e) {
        if (e.code === "ENOENT") {
          stat = null;
        }
        else {
          throw e; // no clue what to do otherwise, it should just work in normal circumstances.
          // if it didn't, it is not safe to continue and we better crash here :)
        }
      }
      var isKnownDir = dirnames.contains(fullpath);
      var isKnownFile = this.get('files').findProperty('path', fullpath); // I need the file here anyway

      if (stat === null) {
        if (isKnownDir) { // was a known dir, should be unwatched
          this.unwatchDirectory(fullpath);
        }
        if (isKnownFile) { // file has been deleted
          this.fsDidDeleteFile(fullpath);
        }
      }
      else {
        if (stat.isDirectory()) {
          this.watchDirectory(fullpath);
        }
        else if (stat.isFile()) {
          if (isKnownFile) {
            // when discarding changes on a file with git, fs.watch send a rename event instead of a change.
            // In this case, the file already exist, so we just notify that the file has changed.
            this.fsDidChangeFile(fullpath);
          }
          else { // new file
            this.fsDidCreateFile(fullpath);
          }
        }
      }
    }
  },

  /**
    methods for watchers to call

    @private
  */
  fsDidCreateFile: function (filename) {
    BT.Logger.debug("fsDidCreateFile: " + filename);
    var ext = require('path').extname(filename);
    ext = (ext[0] === ".") ? ext.slice(1) : ext;
    var k = BT.projectManager.fileClassFor(ext);
    if (k) { // only create when the file class is known.
      if (!this.getPath('files.filenames')[filename]) {
        BT.Logger.debug("creating new file...");
        var f = k.create({ path: filename, framework: this });
        this.get('files').pushObject(f);
        f.fileDidChange(); // trigger initial loading of content
        BT.Logger.debug("should be in files now...");
      }
    }
  },

  /**
    @private
  */
  fsDidDeleteFile: function (filename) {
    BT.Logger.debug("fsDidDeleteFile: " + filename);
    // first search for the file:
    var f = this.get('files').findProperty('path', filename);
    if (f) {
      this.get('files').removeObject(f); // get rid of it in the lists
      f.destroy(); // f#destroy() will take care of what is needed for the file
    }
    // we don't care about files unknown to us
  },

  /**
    @private
  */
  fsDidChangeFile: function (filename) {
    BT.Logger.debug("fsDidChangeFile: " + filename);
    var f = this.get('files').findProperty('path', filename);
    if (f) f.fileDidChange();
  },

  /**
    @private
  */
  fsDidRenameFile: function (file, newFilename, calltype) {
    //BT.Logger.debug("arguments to this function: " + require('util').inspect(arguments));
    BT.Logger.debug("fsDidRenameFile: " + newFilename);
    if (calltype === "fs") { // called by the default fs implementation
      file.set('path', newFilename);
    }
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

    if (BT.runMode === BT.RM_DEBUG) {
      BT.Logger.trace("fileFor %@: '%@'".fmt(this.get('fullname'), fn));
      BT.Logger.trace("index-json check on '%@'".fmt(this.get('fullname') + "/tests/-index.json"));
      BT.Logger.trace("isApp is %@".fmt(this.get('isApp')));
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
    var resources = this.get('resources');
    var pathlib = require('path');
    // if not given, assume the root path
    if (!basepath) basepath = this.get('path');
    var filepath = pathlib.join(basepath, filename);
    // first try to find the filename on basepath, only then try the more expensive filter
    var firstTry = resources.findProperty('path', filepath);
    if (firstTry) return [firstTry];

    // first try a full match on the file name
    var ret = resources.filter(function (f) {
      var p = f.get('path');
      if (p.indexOf(filename, p.length - filename.length) !== -1) return true;
    });

    // if still not found, try a partial match. This is useful because often resources are required without
    // file extension.
    if (ret.length === 0) {
      ret = resources.filter(function (f) {
        var p = f.get('path');
        if (p.indexOf(filename) !== -1) return true;
      });
    }
    return ret;
  },

  /**
    @private
  */
  contentHash: function () {
    return this.getPath('files.contentHash');
  }.property('files.contentHash').cacheable(),

  /**
    @private
  */
  buildNumber: function () {
    var contentHash = this.get('contentHash'),
      app = this.get('belongsTo'),
      name = this.isApp ? app.get('name') : this.get('ref'),
      buildNumberPath = BT.serverConfig.buildNumberPath;

    if (!buildNumberPath) {
      BT.Logger.error("Cannot compute the buildNumber as buildNumberPath is not defined for the app '%@'.".fmt(app.get('name')));
      return contentHash;
    }

    var pathlib = require('path'),
      fslib = require('fs'),
      bnPath = pathlib.join(BT.projectPath, buildNumberPath),
      bnData,
      didChange = false,
      buildNumber;

    if (BT.fileExist(bnPath)) {
      bnData = JSON.parse(fslib.readFileSync(bnPath).toString());
    }
    else {
      bnData = {};
    }

    if (!name) {
      BT.Logger.error("Could not find either a ref or a name the framework '%@'.".fmt(this.get('path')));
      return contentHash;
    }

    if (!bnData[name]) bnData[name] = {};
    buildNumber = bnData[name][contentHash];

    if (!buildNumber) {
      didChange = true;
      buildNumber = 0;
      for (var hash in bnData[name]) if (bnData[name].hasOwnProperty(hash)) {
        buildNumber = Math.max(buildNumber, bnData[name][hash]);
      }
      buildNumber++;
      bnData[name][contentHash] = buildNumber;
    }

    if (didChange) {
      fslib.writeFileSync(bnPath, JSON.stringify(bnData));
    }

    return buildNumber;
  }.property('contentHash').cacheable(),

  /**
    A delegate you can use to define specific URL templates depending
    on the file.

    @function
    @param {BT.File} file The file requesting an URL template.
  */
  urlTemplateFor: function(file) {
    return this.get('belongsTo').urlTemplateFor(file);
  }

});


BT.Framework.mixin({

  /**
    The number of directory being watch.
  */
  watchCount: 0,

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
  dependencies: function (includeTests) {
    var deps = this.prototype.dependencies;

    if (includeTests && this.prototype.testDependencies) {
      deps = deps.concat(this.prototype.testDependencies);
      BT.Logger.trace("Framework " + this.prototype.ref +
        " has testDependencies and includeTests is true, adding " + this.prototype.testDependencies);
    }

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
          ddeps = k.dependencies(includeTests);
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
