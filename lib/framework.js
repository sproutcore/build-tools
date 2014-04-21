/*globals BT*/

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

  //

  path: function () {
    var ret = BT._resolveReference(this.get('ref'), "framework");
    //SC.Logger.log("ref is " + this.get('ref'));
    //SC.Logger.log("ret is " + ret);
    return ret;
  }.property('ref').cacheable(),

  init: function () {
    sc_super();
    //SC.Logger.log("init in BT.Framework for " + this.get('ref'));
    this.files = BT.FrameworkFilesController.create({ framework: this });
    this._scripts = BT.FrameworkScriptsController.create({ framework: this });
    this._scripts.contentBinding = this._scripts.bind('content', this.files, 'scripts');
    this._stylesheets = BT.FrameworkStylesheetsController.create({ framework: this });
    this._stylesheets.contentBinding = this._stylesheets.bind('content', this.files, 'stylesheets');

    var fwname = this.get('fullname');
    var pathlib = require('path');
    var combinedName, combineStylesheets;
    if (this.combineScripts) {
      combinedName = pathlib.join(fwname, fwname + ".js");
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
      combinedName = require('path').join(fwname, fwname + ".css");
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
          var f = k.create({ path: p, framework: me });
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
    // only now we set the rawContent of all the files. If we do it earlier
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

    SC.Logger.log("scanning done for " + (this.get('ref') || this.get('name')));
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
      var folders = allDirs;
      // and add watchers
    }

    // I could start sorting scripts here, but that is problematic
    // because I don't know when all the script files will be read.
    // One option is to add observers to all the files content property
    // and trigger sorting whenever one changes
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
  findResourceFor: function (filename, basepath) {
    //SC.Logger.log('findResources for filename: ' + filename);
    var resources = this.getPath('files.resources');
    var pathlib = require('path');
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
