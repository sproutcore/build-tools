/*globals BT*/

BT.FrameworkScriptsController = SC.ArrayController.extend({

  framework: null,  // have a link to the framework

  // depends on a content binding
  //
  // orderBy: 'order',
  orderBy: function () {
    return 'order ASC';
  }.property('@each.rawContent'), // have to do it this way in order for the automatic sorting to work.

  finishedLoading: function () {
    var ret = this.every(function (f) {
      if (f.get('rawContent') !== null) return true;
    });
    // if (this.getPath('framework.ref') === "sproutcore:jquery" && ret) {
    //   SC.Logger.log("jquery finished loading...");
    // }
    return ret;
    // need to watch rawContent, because content doesn't seem to work.
  }.property('@each.rawContent').cacheable(),

  dependenciesDidChange: function () {
    if (!this.get('finishedLoading')) return;
    var fw = this.get('framework');
    if (!fw) return;
    //SC.Logger.log("dependenciesDidChange for framework: " + this.getPath('framework.name'));
    // get all deps
    var deps = {};
    var pathlib = require('path');
    var fwpath = this.get('framework').get('path');
    var corejs = pathlib.join(fwpath, "core.js");
    var mainjs = pathlib.join(fwpath, "main.js");

    this.forEach(function (f) {
      deps[f.get('path')] = f.get('dependencies');
    });
    if (this.getPath('framework.ref') === "sproutcore:jquery") {
      //SC.Logger.log("content of deps: %@".fmt(require('util').inspect(deps)));
    }
    // trouble with sort order, check whether files are actually taken by name / path
    // and the sorting works...
    // now sort
    var filenames = Object.keys(deps);
    var beginWithFiles = filenames.contains(corejs) ? [corejs] : [];
    var endWithFiles = filenames.contains(mainjs) ? [mainjs] : [];
    var sortedFiles = this.sortFilesByRequirements(filenames, beginWithFiles, endWithFiles, deps);
    if (this.getPath('framework.ref') === "sproutcore:jquery") {
      //SC.Logger.log("content of sortedFiles: %@".fmt(require('util').inspect(sortedFiles)));
    }
    this.forEach(function (f) {
      f.set('order', sortedFiles.indexOf(f.get('path')));
    });
    this.set('orderBy', 'order'); // doesn't pick it up automatically...
  }.observes('*@each.dependencies', 'finishedLoading'),

  // scriptSorter: function () {
  //   var me = this;
  //   var files = [];
  //   var sortOrder = {};

  //   var filenames = Object.keys(sortOrder).sort();
  //   var sortedFiles = sortFilesByRequirements(filenames,['core.js'],['main.js'],sortOrder);
  //   sortedFiles.forEach(function(s){
  //     var originalIndex = sortOrder[s]? sortOrder[s].index: -1;
  //     if(originalIndex >= 0) this.push(files[sortOrder[s].index]);
  //   },this);
  // },

  /**
    Test:

      var files = ['bootstrap.js', 'core.js', 'main.js', 'panes/pane.js', 'system/binding.js', 'system/error.js', 'system/object.js', 'views/view.js'],
          beginWithFiles = ['core.js'],
          endWithFiles = ['main.js'];
      var dependencies = {
        'panes/pane.js': ['views/'],
        'system/binding.js': ['system/object.js'],
        'system/error.js': ['views/'],
        'views/view.js': ['system/object']
      }
      var sortedFiles = sortFilesByRequirements(files, beginWithFiles, endWithFiles, dependencies);

    Verify that sortedFiles has the order [core, object, views, pane, binding, error].

    @param {Array} beginWithFiles - a list of files to lead off with, in the order that you want them.
    @param {Array} files - an alphabetical list of all files.
    @param {Array} endWithFiles - a list of files to end with, in the order that you want them.
    @param {Hash} dependencies - a hash of file paths with arrays of required paths. Required paths may be files
           or folders; files may omit their file extensions; folders must end with '/'. Files with no dependencies
           may be omitted from the hash.
  */
  sortFilesByRequirements: function (files, beginWithFiles, endWithFiles, dependencies) {
    // The sorted file list.
    var ret = [];
    var fwpath = this.getPath('framework.path');
    // A stack of files that are currently being processed. (Used for circular dependency detection.)
    var currentlyProcessingFiles = [];

    /*
      The recursive sort function.
      - If passed a folder path (ends in '/'), recurses all matching files.
      - If passed a file name (not a file; '.js' appended if needed), and if file hasn't already been handled
        (i.e. is in ret), recurses its dependencies and adds to ret.
      - the parent parameter describes the file where fileOrFolder is being requested in
    */
    var recurser = function (fileOrFolder, parent) {
      var i, len;

      // Handle folders.
      if (fileOrFolder.slice(-1) === '/') {
        // Scan all files, recursing any matches.
        var folderLen = fileOrFolder.length;

        for (i = 0, len = files.length; i < len; i++) {
          if (files[i].substr(0, folderLen) === fileOrFolder) {
            recurser(files[i], parent);
          }
        }
      }
      // For files, check if it's been handled; if not, recurse its dependencies.
      else {
        // Append file extension if needed. (Would be great to deprecate this.)
        // TODO: Generalize this. We won't always be dealing with .js files.
        if (fileOrFolder.slice(-3) !== '.js') fileOrFolder += '.js';

        // If the file hasn't been processed yet...
        if (!ret.contains(fileOrFolder)) {
          // Check for circularity and error out if found.
          if (currentlyProcessingFiles.contains(fileOrFolder)) {
            SC.Logger.errorGroup('BuildTools encountered a circular dependency.');
            SC.Logger.log("BuildTools encountered a circular dependency.");
            SC.Logger.log('The file %@ was required via sc_require(), while already being processed:'.fmt(fileOrFolder));
            currentlyProcessingFiles.forEach(function (file) { SC.Logger.log('  %@ =>'.fmt(file)); });
            SC.Logger.log('  %@'.fmt(fileOrFolder));
            SC.Logger.log('You must fix this before proceeding.'.fmt(fileOrFolder));
            throw SC.Logger.errorGroupEnd(); // returns undefined. Could be better?
            //throw new Error(" oops...");
          }

          // Get the file's dependencies.
          var theseDependencies = dependencies[fileOrFolder] || SC.EMPTY_ARRAY;
              //i, len;
          // Mark file as in progress (for circular dependency check).
          currentlyProcessingFiles.push(fileOrFolder);
          // Recurse each one.
          for (i = 0, len = theseDependencies.length; i < len; i++) {
            recurser(theseDependencies[i], fileOrFolder);
          }
          // Un-mark file as in progress.
          currentlyProcessingFiles.pop();
          // Add to the list.
          ret.push(fileOrFolder);
        }
      }
    };

    // First we process beginWithFiles.
    var i, len;

    for (i = 0, len = beginWithFiles.length; i < len; i++) {
      recurser(beginWithFiles[i]);
    }

    // Next we process the middle files. (We have to remove endWithFiles from them to be sure that they're not processed
    // until the end; we remove beginWithFiles just for consistency and maybe a speed boost.)
    var middleFiles = files.slice().removeObjects(beginWithFiles).removeObjects(endWithFiles);
    for (i = 0, len = middleFiles.length; i < len; i++) {
      recurser(middleFiles[i]);
    }

    // Finally we process endWithFiles.
    for (i = 0, len = endWithFiles.length; i < len; i++) {
      recurser(endWithFiles[i]);
    }

    return ret;
  }
});

BT.FrameworkStylesheetsController = SC.ArrayController.extend({
  framework: null,  // have a link to the framework
  orderBy: 'path ASC'
});

BT.FrameworkFilesController = SC.ArrayController.extend({

  framework: null, // to which fw does this controller belong

  scripts: function () {
    //BT.TEST = this;
    return this.filterProperty('isScript');
  }.property('[]').cacheable(),

  stylesheets: function () {
    return this.filterProperty('isStylesheet');
  }.property('[]').cacheable(),

  resources: function () {
    return this.filterProperty('isResource');
  }.property("[]").cacheable(),

  filenames: function () {
    var ret = {};
    var names = this.getEach('relativePath').forEach(function (n, i) {
      ret[n] = i;
    });
    return ret;
  }.property('[]').cacheable(),

  fileFor: function (fn) {
    var fns = this.get('filenames');
    return this.objectAt(fns[fn]);
  }

});

BT.Framework = SC.Object.extend({
  ref: null, // should be set on extend. Used for url finding (sproutcore:desktop => sproutcore/desktop)
  isFramework: true,
  isFrameworkBundle: false, // replace by isWrapperFramework?
  isWrapperFramework: false,
  all: null, // hook to put any config on in case of isWrapperFramework, to copy out to all subfws
  combineScripts: true,
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
  //concatenatedProperties: ['scriptExtensions','stylesheetExtensions','resourceExtensions'],

  path: function () {
    var ret = BT._resolveReference(this.get('ref'), "framework");
    //SC.Logger.log("ref is " + this.get('ref'));
    //SC.Logger.log("ret is " + ret);
    return ret;
  }.property('ref').cacheable(),

  init: function () {
    //BT.util.log("init in BT.Framework for " + this.get('ref'));
    this.files = BT.FrameworkFilesController.create({ framework: this });
    this.scripts = BT.FrameworkScriptsController.create({ framework: this });
    this.scripts.contentBinding = this.scripts.bind('content', this.files, 'scripts');
    this.stylesheets = BT.FrameworkStylesheetsController.create({ framework: this });
    this.stylesheets.contentBinding = this.stylesheets.bind('content', this.files, 'stylesheets');
    this.scanFiles();
  },


  scanFiles: function () {
    if (this.isWrapperFramework) return; // don't do anything
    var pathlib = require('path');
    var fslib = require('fs');
    var basePath = this.get('path');
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
          f.set('rawContent', fslib.readFileSync(p));
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

    this.files.set('content', files);

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
  var all = this.prototype.all;
  var ret = [];

  if (deps && deps.length > 0) {
    deps.forEach(function (d) {
      var ddeps;
      var ref = (SC.typeOf(d) === SC.T_STRING) ? d : d.ref;
      var fwclass = BT.projectManager.getFrameworkClass(ref);
      if (!fwclass) BT.util.log("Could not find referenced framework: " + ref);
      else {
        ddeps = fwclass.dependencies();
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

  // if(this.dependencies){
  //   this.dependencies.forEach(function(dep){
  //     // TODO:
  //     // we can detect here whether a default dep is used or a custom
  //     // if dep is a string, it is a default dep, and we can refer to a single instance
  //     // of the dependency
  //     var fwclass = BT.projectManager.getFrameworkClass(dep);
  //     if(!fwclass){
  //       //var fw = BT._resolveReference(dep,"framework");
  //       //BT.runConfig(fw);
  //       //fwclass = BT.projectManager.getFrameworkClass(dep);
  //       BT.util.log("No fw class found !@#!@?");
  //     }
  //     if(this.isWrapperFramework || this.isFrameworkBundle){
  //       fwclass = fwclass.extend({
  //         combineScripts: this.combineScripts,
  //         combineStylesheets: this.combineStylesheets,
  //         minifyScripts: this.minifyScripts,
  //         minifyStylesheets: this.minifyStylesheets,
  //         includeTests: this.includeTests,
  //         includeFixtures: this.includeFixtures,
  //         defaultLanguage: this.defaultLanguage,
  //         createSprite: this.createSprite,
  //         scriptExtensions: this.scriptExtensions,
  //         stylesheetExtensions: this.stylesheetExtensions,
  //         resourceExtensions: this.resourceExtensions,
  //         watchFiles: this.watchFiles
  //       });
  //     }
  //     if(!fwclass) BT.util.log("fwclass not found for ref " + dep);
  //     else this._deps.push(fwclass); // TODO: add overrides?
  //   },this);
  // }
  // return;
};
