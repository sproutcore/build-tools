/*jshint node:true*/

/*
Purpose of the file manager is to have every file only opened once as a raw content.
Especially for multi app dev environments it is a win, as sproutcore would be loaded separately for
every app.

So, what it should do is take the directories, scan it for files, and register for every file and directory which framework
object is watching it.

When a framework registers a path with the file manager, the fm will scan the path, and register all files "known" to the BT.
It will create files

 */

BT.RawFile = SC.Object.extend({
  isRawFile: true,
  language: 'any',
  content: null,
  isDestroyed: false, // hook to observe for deletion of the file
  path: null,

  extname: function () {
    return require('path').extname(this.get('path'));
  }.property('path').cacheable(),

  basename: function () {
    return require('path').basename(this.get('path'));
  }.property('path').cacheable(),

  extension: function () {
    return this.get('extname').slice(1);
  }.property('path').cacheable()
  // solution 2: in case
  // contentDidChange: function () {

  // }.observes('content')
});


BT.fileManager = SC.Object.create({

  /**
   * Hash to keep track of which objects are watching a certain file.
   * The key is the path of the file (or directory) and the value is the raw file object
   * @type {Hash}
   */
  _paths: null,

  /**
   * A Hash of paths of which the value is an array with registered frameworks. The paths are the root paths of the framework
   * objects, and these will be notified as soon as new files are added.
   * @type {Hash}
   */
  _fwpaths: null,

  init: function () {
    this._paths = {};
    this._fwpaths = {};
  },

  /**
   * Counter to keep track on how many directory watchers are around
   * @type {Number}
   */
  watchCount: 0,

  /**
   * Scans a path for all files and returns an array of raw file objects. This raw file objects are either
   * already cached, or newly created
   * @param  {String} path path to be used as root path
   * @param {Object} framework The framework for which this path needs to be registered (important because of callbacks)
   * @param  {Hash} opts options: skipDirs: which directory names should be skipped (".git" is always skipped)
   *                     includeFixtures: if false, directories named fixtures will be skipped,
   *                     includeTests: if false, directories named "tests" will be skipped
   * @return {Array}      Array of RawFile instances
   */
  registerPath: function (path, framework, opts) {
    var ret = [];
    var paths = this._paths;

    if (BT.runBenchmarks) SC.Benchmark.start('fileManager:registerPath');

    if (!paths[path]) {
      if (BT.runBenchmarks) SC.Benchmark.start('fileManager:scandir');
      this._fwpaths[path] = [framework];
      this._scanDir(path, opts);
      if (BT.runBenchmarks) SC.Benchmark.end('fileManager:scandir');
    }

    Object.keys(this._paths).filter(function (fn) {
      return fn.indexOf(path) > -1;
    }).forEach(function (fn) {
      var f = paths[fn];
      if (f && f.isRawFile) ret.push(f);
    });

    var registeredForPath = this._fwpaths[path];
    if (registeredForPath.indexOf(framework) === -1) {
      registeredForPath.push(framework);
    }
    if (BT.runBenchmarks) SC.Benchmark.end('fileManager:registerPath');
    return ret;
  },

  /**
   * Quickly looking up whether a filename should be associated with a certain language
   * for example when it is in a *.lproj directory
   * @param  {String} filename
   * @return {String}          Language type
   */
  _langFor: function (filename) {
    var langRegExp = /\/([^\/]*).lproj/;
    var langMatch = langRegExp.exec(filename);
    var lang = langMatch ? BT.languageFor(langMatch[1]): "any";
    return lang;
  },

  /**
   * Returns the framework instances having a matching root path to the file
   * @param  {[type]} filename [description]
   * @return {[type]}          [description]
   */
  _frameworksFor: function (filename) {
    var ret = [];
    // now find which framework instances this file matches
    Object.keys(this._fwpaths).forEach(function (fp) {
      if (filename.indexOf(fp) > -1) {
        ret.push(this._fwpaths[fp]);
      }
    }, this);
    return ret;
  },

  /**
   * scans the given directory for files, and adds them to the _paths hash.
   * also adds the directories encountered to the watchers, unless opts.shouldWatch is set to false
   * @param  {String} path Path to scan
   * @param  {Hash} opts Hash with options: shouldWatch, includeTests, includeFixtures, skipDirs (containing
   *                     the directories to skip)
   * @private
   */
  _scanDir: function (path, opts) {
    var pathlib = require('path'),
        fslib = require('fs'),
        me = this,
        exts = BT.projectManager.get('extensions'),
        skipDirs = opts.skipDirs || [],

        allDirs = [], shouldWatch = true;

    if (skipDirs.indexOf(".git") === -1) skipDirs.push(".git"); // prevent git files to be scanned
    if (!opts.includeFixtures) skipDirs.push("fixtures");
    if (!opts.includeTests) skipDirs.push("tests");
    if (opts.shouldWatch === false) shouldWatch = false;

    var fixExt = function (ext) {
      if (ext[0] === ".") {
        return ext.slice(1);
      }
      else return ext;
    };

    var scandir = function (dir) {
      var ls = fslib.readdirSync(dir);
      ls.forEach(function (fn) {
        var p = pathlib.join(dir, fn);
        var ext = fixExt(pathlib.extname(p));
        var lang = me._langFor(p);
        var stat = fslib.statSync(p);
        if (stat.isFile()) {
          if (exts.contains(ext)) {
            me._paths[p] = BT.RawFile.create({
              path: p,
              language: lang,
              content: fslib.readFileSync(p)
            });
          }
        }
        if (stat.isDirectory()) {
          if (!skipDirs.contains(fn)) {
            if (shouldWatch) {
              me.watchDirectory(p);
            }
            scandir(p);
          }
        }
      });
    }

    scandir(path);
    // don't forget to add the root path as watcher and cached
    if (shouldWatch) this.watchDirectory(path);
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

  watchDirectory: function (dir) {
    var fslib = require('fs');
    var me = this;
    this._paths[dir] = fslib.watch(dir, function (event, filename) {
      if (BT.runBenchmarks) SC.Benchmark.start('fileManager:fsDirDidChange');
      SC.RunLoop.begin();
      me.fsDirDidChange.call(me, dir, event, filename);
      SC.RunLoop.end();
      if (BT.runBenchmarks) SC.Benchmark.end('fileManager:fsDirDidChange');
    });
    this.watchCount += 1;
  },

  unwatchDirectory: function (dir) {
    this._dirWatchers[dir].close();
    this._dirWatchers[dir] = null;
    this.watchCount -= 1;
  },

  fsDirDidChange: function (directory, event, filename) {
    BT.Logger.debug("BT.fileManager#fsDirDidChange: " + event + ' file: ' + directory + '/' + filename);
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

      var p = this._paths[fullpath];

      if (stat === null) {
        if (p && p.isRawFile) { // file has been deleted
          this.fsDidDeleteFile(fullpath);
        }
        else if (p) {
          this.unwatchDirectory(fullpath);
        }
      }
      else {
        if (stat.isDirectory()) {
          this.watchDirectory(fullpath);
        }
        else if (stat.isFile()) {
          if (p && p.isRawFile) {
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
    BT.Logger.debug("BT.fileManager#fsDidCreateFile: " + filename);
    var lang = this._langFor(filename);
    var f = this._paths[filename] = BT.RawFile.create({
      language: lang,
      path: filename,
      content: require('fs').readFileSync(filename)
    });
    this._frameworksFor(filename).forEach(function (fw) {
      fw.addFile(f);
    });
  },

  /**
    @private
  */
  fsDidDeleteFile: function (filename) {
    BT.Logger.debug("BT.fileManager#fsDidDeleteFile: " + filename);
    // first search for the file:
    if (this._paths[filename]) {
      var fws = this._frameworksFor(filename).forEach(function (fw) {
        fw.removeFile(this._paths[filename]);
      }, this);

      this._paths[filename].destroy();
      this._paths[filename] = null;
    }
  },

  /**
    @private
  */
  fsDidChangeFile: function (filename) {
    BT.Logger.debug("fsDidChangeFile: " + filename);
    var f = this._paths[filename];
    if (f) {
      f.set('content', require('fs').readFileSync(filename));
    }
    //var f = this.get('files').findProperty('path', filename);
    //if (f) f.fileDidChange();
  }


});