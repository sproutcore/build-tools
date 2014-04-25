/*globals BT, process */

sc_require('controllers/combined_files.js');
sc_require('controllers/scripts.js');
sc_require('controllers/stylesheets.js');
sc_require('controllers/files.js');

BT.Framework = SC.Object.extend({
  ref: null, // should be set on extend. Used for url finding (sproutcore:desktop => sproutcore/desktop)
  isFramework: true,
  isFrameworkBundle: false, // replace by isWrapperFramework?
  isWrapperFramework: false,
  all: null, // hook to put any config on in case of isWrapperFramework, to copy out to all subfws
  combineScripts: false,
  combineStylesheets: true,
  minifyScripts: false,
  minifyStylesheets: false,
  includeTests: false,
  includeFixtures: true,
  watchFiles: false,
  defaultLanguage: 'english',
  createSprite: false,
  scriptExtensions: function () {
    return BT.projectManager.get('scriptExtensions');
  }.property(),
  //scriptExtensions: ["js"],
  stylesheetExtensions: ["css"],
  resourceExtensions: ["png", "jpg", "jpeg", "gif", "svg"],
  /*
    Dependencies is an array and can contain
    - framework refs, such as "sproutcore:desktop"
    - framework config, such as { ref: "sproutcore:desktop", combineScripts: false }
    or a combination of both
   */
  dependencies: null,

  resources: function () {
    return this.getPath('files.resources');
  }.property('files'), // don't cache... the files controller will do that

  path: function () {
    var ret = BT._resolveReference(this.get('ref'), "framework");
    //SC.Logger.log("ref is " + this.get('ref'));
    //SC.Logger.log("ret is " + ret);
    return ret;
  }.property('ref').cacheable(),

  init: function () {
    sc_super();
    //SC.Logger.log("init in BT.Framework for " + this.get('path'));
    this.files = BT.FrameworkFilesController.create({ framework: this });
    this._scripts = BT.FrameworkScriptsController.create({ framework: this });
    this._scripts.contentBinding = this._scripts.bind('content', this.files, 'scripts');
    this._stylesheets = BT.FrameworkStylesheetsController.create({ framework: this });
    this._stylesheets.contentBinding = this._stylesheets.bind('content', this.files, 'stylesheets');

    var fullfwname = this.get('fullname');
    var shortname = this.get('name');
    var pathlib = require('path');
    var combinedName, combineStylesheets;
    if (this.combineScripts) {
      combinedName = pathlib.join(fullfwname, shortname + ".js");
      //combinedName = fwname + ".js";
      this.scripts = BT.CombinedFilesController.create({
        relpath: combinedName,
        contentType: 'application/javascript'
      });
      this.scripts.filesToCombineBinding = this.scripts.bind('filesToCombine', this._scripts, 'arrangedObjects');
      this.scripts.filesDidChangeBinding = this.scripts.bind('filesDidChange', this._scripts, 'filesHaveChanged');
      //this.scripts = combineScripts;
    }
    else {
      this.scripts = this._scripts;
    }

    if (this.combineStylesheets) {
      combinedName = pathlib.join(fullfwname, shortname + ".css");
      //combinedName = fwname + ".css";
      combineStylesheets = BT.CombinedFilesController.create({
        relpath: combinedName,
        contentType: 'text/css'
      });
      combineStylesheets.filesToCombineBinding = combineStylesheets.bind('filesToCombine', this._stylesheets, 'arrangedObjects');
      combineStylesheets.filesDidChangeBinding = combineStylesheets.bind('filesDidChange', this._stylesheets, 'filesHaveChanged');
      this.stylesheets = combineStylesheets;
    }
    else this.stylesheets = this._stylesheets;

    this.scanFiles();
  },

  scanFiles: function () {
    if (this.isWrapperFramework) return; // don't do anything
    var pathlib = require('path');
    var fslib = require('fs');
    var files = [];
    var me = this;

    // get all registered extensions first
    var exts = BT.projectManager.get('extensions');
    var skipDirs = ['apps'];
    if (!this.includeFixtures) skipDirs.push('fixtures');
    if (!this.includeTests) skipDirs.push('tests');

    var allDirs = [];

    var scanDir = function (dir) {
      var ret = [];
      var fileList = fslib.readdirSync(dir);
      fileList.forEach(function (fn) {
        var p = pathlib.join(dir, fn);
        var ext = pathlib.extname(p);
        ext = (ext[0] === ".") ? ext.slice(1) : ext;
        var stat = fslib.statSync(p);
        if (stat.isFile() && exts.contains(ext)) {
          var k = BT.projectManager.fileClassFor(ext);
          var f = k.create({ path: p, framework: me, watchForChanges: this.watchFiles });
          files.push(f);
          //ret.push(p);
        }
        else if (stat.isDirectory() && !skipDirs.contains(fn)) {
          allDirs.push(p); // store full path for dir, for watchers
          //ret = ret.concat(scanDir(p));
          scanDir(p);
        }
      });
      return ret;
    };

    //var found = scanDir(this.get('path'));
    scanDir(this.get('path'));
    this.files.set('content', files);
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

    //SC.Logger.log("scanning done for " + (this.get('ref') || this.get('name')));
    // found.forEach(function(f){
    //   var i;
    //   var ext = pathlib.extname(f);
    //   ext = (ext.indexOf(".") === 0)? ext.slice(1): ext; // cut off dot
    //   var k = BT.projectManager.fileClassFor(ext);
    //   if(k){
    //     // I am not sure whether we should add observers to every file
    //     // it would be wise regarding specific tasks such as sorting
    //     //i = k.create({ path: f });
    //     files.pushObject(k.create({ path: f, framework: this}));
    //   }
    // },this);



    // find folders and add watchers
    if (this.watchFiles) {
      if (process.platform === "darwin") {
        var sysver = process.env._system_version.split(".");
        var sysverMain = parseInt(sysver[0], 10);
        var sysverMin = parseInt(sysver[1], 10);
        if (sysverMain === 10 && sysverMin >= 8) {
          this.setupFSEvents(); // don't use regular watchers, but fsevents
        }
        else if (sysverMain > 10) { // just in case Apple decides to roll over OSX 10 to OSX 11
          this.setupFSEvents(); // don't use regular watchers, but fsevents, because will be in likely
        }
        return;
      }
      // for all other cases (including MacOSX) we should use the standard wathers of nodejs
      //var folders = allDirs;
      this.setupDirectoryWatchers(allDirs);
    }

  },

  setupDirectoryWatchers: function (alldirs) {
    // The system of directory watchers is going to be difficult
    // it seems there is only one event (on osx?), which is "rename", and doesn't provide any extra information
    // on what has changed or has been created. This means that the only way to figure out what has changed is to
    // scan the directory non-recursively. There is the second parameter called filename which essentially does seem
    // to work on osx (even if it is not mentioned in the official node docs), and the docs warn that it might not always
    // be available on all platforms, and that a fallback implementation is wise to have.
    // so, what seems to be the best approach to begin with is to use filename anyhow.
    //
    // the fallback implementation would need to keep a list around of the items in the directory (result of fs.readDirSync())
    // and whenever things change do another readDirSync() and compare the lists. The list should also per directory contain a
    // property on what type (file or directory) in order to know what to remove.
    // There is one smallish thing: a file rename will cause two calls in quick succession, one with the original file name
    // one with the new file name. It is unlikely that this can be used reliably.
    // the fallback would first compare the old list to the new list (anything new or removed):
    // - anything new: fs.statSync the new thing to check what it is.
    //   - new file? => create file
    //   - new directory => add a watch
    // - anything removed:
    //   - file? destroy the file
    //   - directory? remove the watcher
    // - anything renamed: => means the lists are of the same length, but there is a content difference
    //   - if the original is a file, look up the file and adjust the path
    //   - if the original is a directory, look up the original watcher, get rid of it, and create a new watcher
    // we don't have to do anything else, as the files will watch themselves
    //
    var fslib = require('fs');
    var pathlib = require('path');
    if (!this._dirWatchers) this._dirWatchers = {};
    alldirs.forEach(function (dir) {
      this._dirWatchers[dir] = fslib.watch(dir, function (event, filename) {
        var myDir = dir; // dir is a string, so by value... :)
      });
    });
  },

  setupFSEvents: function () {
    var watcher = require('fsevents-bin')(this.get('path'));
    var me = this;
    // it is well possible that this way of watching is missing something
    // for example the moving in of an entire directory...
    // for now the simple "file-only" implementation
    watcher.on('change', function (path, info) {
      switch (info.event) {
        case "created":
          if (info.type === "file") me.fsDidCreateFile.call(me, path);
          break;
        case "deleted":
          if (info.type === "file") me.fsDidDeleteFile.call(me, path);
          break;
        case "modified":
          if (info.type === "file") me.fsDidChangeFile.call(me, path);
          break;
        case "moved-out":
          if (info.type === "file") me.fsDidRenameFile.apply(me, arguments);
          break;
        case "moved-in":
          if (info.type === "file") me.fsDidRenameFile.apply(me, arguments);
          break;
      }
    });
  },

  // methods for watchers to call
  fsDidCreateFile: function (filename) {
    SC.Logger.log("fsDidCreateFile: " + filename);
    var ext = require('path').extname(filename);
    var k = BT.projectManager.fileClassFor(ext);
    var f = k.create({ path: filename, framework: this, watchForChanges: this.watchFiles });
    this.get('files').push(f);
  },

  fsDidDeleteFile: function (filename) {
    SC.Logger.log("fsDidDeleteFile: " + filename);
    // first search for the file:
    var f = this.get('files').findProperty('path', filename);
    if (f) f.destroy(); // f#destroy() will take care of what is needed
    else SC.Logger.log("BT.Framework#fsDidDeleteFile: Strange... being called for a file that we don't know about? " + filename);
  },

  // only useful for fsevents
  fsDidChangeFile: function (filename) {
    var f = this.get('files').findProperty('path', filename);
    if (f) f.fileDidChange();
    else SC.Logger.log("BT.Framework#fsDidChangeFile: Strange... being called for a file that we don't know about? " + filename);
  },

  fsDidRenameFile: function () {
    SC.Logger.log("arguments to this function: " + require('util').inspect(arguments));
  },

  files : null,

  /*
  filenames: function () {
    var ret = {};
    var names = this.getEach('relativePath').forEach(function (n, i) {
      ret[n] = i;
    });
    return ret;
  }.property('[]').cacheable(),
   */

  fileFor: function (fn) {
    var pathlib = require('path');
    var f;
    if (this.get('combineScripts') && pathlib.extname(fn) === ".js") {
      f = this.get('scripts').objectAt(0);
      if (fn === f.get('relativePath')) return f;
    }
    if (this.get('combineStylesheets') && pathlib.extname(fn) === ".css") {
      f = this.get('stylesheets').objectAt(0);
      if (fn === f.get('relativePath')) return f;
    }
    return this.files.fileFor(fn);
  },

  //convenience method, used by slicing
  //if basepath is not given, assume the root path of the current framework
  findResourceFor: function (filename, basepath) {
    //SC.Logger.log('findResources for filename: ' + filename);
    var resources = this.getPath('files.resources');
    var pathlib = require('path');
    // if not given, assume the root path
    if (!basepath) basepath = this.get('path');
    // first try to find the filename on basepath, only then try the more expensive filter
    //
    var firstTry = resources.findProperty('path', pathlib.join(basepath, filename));
    if (firstTry) return [firstTry];

    //var targetfn = filename); // strip off anything that doesn't belong there...

    var ret = resources.filter(function (f) {
      var p = f.get('path');
      // SC.Logger.log("path: %@, targetfn: %@ ".fmt(p, targetfn));
      // if (p === targetfn) return true;
      if (p.indexOf(filename) > -1) return true;
    });
    //SC.Logger.log('found resources for filename: ' + filename + " : " + ret.getEach('path'));
    return ret;
  },

  _tasks: null,

  name: function () {
    var pathlib = require('path');
    var p = this.get('path'); // assume we have one, as init checks
    return pathlib.basename(p);
    // just get the last name from the path and take that
    // so "frameworks/sproutcore/frameworks/desktop" should become "desktop"
  }.property('path').cacheable(),

  fullname: function () {
    // get the full name from the path, so frameworks/sproutcore/frameworks/desktop
    // should become sproutcore/desktop
    if (this.isApp) {
      return this.get('name');
    }
    else return this.get('ref').replace(/:/g, "/");
  }.property('ref').cacheable(),

  reference: function () {
    // generate the reference from the path
    // "frameworks/sproutcore/frameworks/desktop" should become "sproutcore:desktop"
  }.property('path').cacheable()
});

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
//
BT.Framework.dependencies = function () {
  var deps = this.prototype.dependencies;
  var isTheme = this.prototype.isTheme;
  var all = this.prototype.all;
  var ret = [];

  if (deps && deps.length > 0) {
    deps.forEach(function (d) {
      var ddeps;
      var ref = (SC.typeOf(d) === SC.T_STRING) ? d : d.ref;
      var k = isTheme ? BT.projectManager.getThemeClass(ref): BT.projectManager.getFrameworkClass(ref);
      if (!k) BT.util.log("Could not find referenced framework: " + ref);
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
};

BT.Theme = BT.Framework.extend({
  cssTheme: null,
  isTheme: true,
  themename: null
});
