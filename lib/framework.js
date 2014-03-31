// var SC = require('sc-runtime');
// var path = require('path');
//


BT.FrameworkScriptsController = SC.ArrayController.extend({

  framework: null,  // have a link to the framework

  // depends on a content binding
  //
  orderBy: 'order ASC',

  dependenciesDidChange: function(){
    // get all deps
    var deps = {};
    var pathlib = require('path');
    var fwpath = this.get('framework').get('path');
    var corejs = pathlib.join(fwpath,"core.js");
    var mainjs = pathlib.join(fwpath,"main.js");

    this.forEach(function(f){
      deps[f] = f.get('dependencies');
    });
    // now sort
    var filenames = Object.keys(deps);
    var beginWithFiles = filenames.contains(corejs)? [corejs]: [];
    var endWithFiles = filenames.contains(mainjs)? [mainjs]: [];
    var sortedFiles = this.sortFilesByRequirements(filenames, beginWithFiles, endWithFiles,deps);
    this.forEach(function(f){
      f.set('order',sortedFiles.indexOf(f.get('path')));
    });
  }.observes('[].dependencies'),

  scriptSorter: function(){
    var me = this;
    var files = [];
    var sortOrder = {};

    var filenames = Object.keys(sortOrder).sort();
    var sortedFiles = sortFilesByRequirements(filenames,['core.js'],['main.js'],sortOrder);
    sortedFiles.forEach(function(s){
      var originalIndex = sortOrder[s]? sortOrder[s].index: -1;
      if(originalIndex >= 0) this.push(files[sortOrder[s].index]);
    },this);
  },

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
  sortFilesByRequirements: function(files, beginWithFiles, endWithFiles, dependencies) {
    // The sorted file list.
    var ret = [];

    // A stack of files that are currently being processed. (Used for circular dependency detection.)
    var currentlyProcessingFiles = [];

    /*
      The recursive sort function.
      - If passed a folder path (ends in '/'), recurses all matching files.
      - If passed a file name (not a file; '.js' appended if needed), and if file hasn't already been handled
        (i.e. is in ret), recurses its dependencies and adds to ret.
    */
    var recurser = function(fileOrFolder) {
      var i, len;

      // Handle folders.
      if (fileOrFolder.slice(-1) === '/') {
        // Scan all files, recursing any matches.
        var folderLen = fileOrFolder.length;

        for (i = 0, len = files.length; i < len; i++) {
          if (files[i].substr(0, folderLen) === fileOrFolder) {
            recurser(files[i]);
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
            currentlyProcessingFiles.forEach(function(file) { SC.Logger.log('  %@ =>'.fmt(file)); });
            SC.Logger.log('  %@'.fmt(fileOrFolder));
            SC.Logger.log('You must fix this before proceeding.'.fmt(fileOrFolder));
            throw SC.Logger.errorGroupEnd(); // returns undefined. Could be better?
            //throw new Error(" oops...");
          }

          // Get the file's dependencies.
          var theseDependencies = dependencies[fileOrFolder]? dependencies[fileOrFolder].after : SC.EMPTY_ARRAY;
              //i, len;
          // Mark file as in progress (for circular dependency check).
          currentlyProcessingFiles.push(fileOrFolder);
          // Recurse each one.
          for (i = 0, len = theseDependencies.length; i < len; i++) {
            recurser(theseDependencies[i]);
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


BT.FrameworkFilesController = SC.ArrayController.extend({

  framework: null, // to which fw does this controller belong

  scripts: function(){
    return this.filterProperty('isScript');
  }.property('[]').cacheable(),

  stylesheets: function(){
    return this.filterProperty('isStylesheet');
  }.property('[]').cacheable(),

  resources: function(){
    return this.filterProperty('isResource');
  }.property("[]").cacheable()

});

BT.Framework = SC.Object.extend({
  ref: null, // equivalent to reference
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
  scriptExtensions: function(){
    return BT.projectManager.get('scriptExtensions');
  }.property(),
  //scriptExtensions: ["js"],
  stylesheetExtensions: ["css"],
  resourceExtensions: ["png","jpg", "jpeg", "gif", "svg"],
  /*
    Dependencies is an array and can contain
    - framework refs, such as "sproutcore:desktop"
    - framework config, such as { ref: "sproutcore:desktop", combineScripts: false }
    or a combination of both
   */
  dependencies: null,

  concatenatedProperties: ['scriptExtensions','stylesheetExtensions','resourceExtensions'],

  path: function(){
    var ret = BT._resolveReference(this.get('ref'),"framework");
    //SC.Logger.log("ref is " + this.get('ref'));
    //SC.Logger.log("ret is " + ret);
    return ret;
  }.property('ref').cacheable(),

  init: function(){
    //BT.util.log("init in BT.Framework for " + this.get('ref'));
    // we might have doubles in the concatenatedProperties
    ['scriptExtensions','stylesheetExtensions','resourceExtensions'].forEach(function(cp){
      this[cp] = this[cp].uniq(); // remove any doubles
    },this);

    this.files = BT.FrameworkFilesController.create();
    this.scripts = BT.FrameworkScriptsController.create({
      contentBinding: this.files.scripts
    });

    this.scanFiles();
  },

  scanFiles: function(){
    if(this.isWrapperFramework) return; // don't do anything

    // first build up patterns that we can then parse with glob
    var basicPatterns = [BT.path.join("**","*")];
    if(!me.includeFixtures) basicPatterns.push("!" + BT.path.join("fixtures","**","*"));
    if(!me.includeTests) basicPatterns.push("!" + BT.path.join("tests","**","*"));

    var g = require('glob').Glob(basicPatterns,{ sync: true, cwd: this.get('path') });
    var scripts = [], stylesheets = [], resources = [], files = [];
    g.found.forEach(function(f){
      var i;
      var ext = BT.path.extname(f);
      var k = BT.projectManager.fileClassFor(ext);
      if(k){
        // I am not sure whether we should add observers to every file
        // it would be wise regarding specific tasks such as sorting
        //i = k.create({ path: f });
        files.pushObject(k.create({ path: f}));

        // if(i.isScript) scripts.push(i);
        // if(i.isStylesheet) stylesheets.push(i);
        // if(i.isResource) resources.push(i);
      }
    },this);

    this.files.set('content',files);

    // find folders and add watchers
    if(this.watchFiles){
      var folders = Object.keys(g.cache).filter(function(fn){
        var c = g.cache[fn];
        return (c === 2 || c instanceof Array);
      });
      // and add watchers
    }

    // I could start sorting scripts here, but that is problematic
    // because I don't know when all the script files will be read.
    // One option is to add observers to all the files content property
    // and trigger sorting whenever one changes
  },

  files : null,

  _tasks: null,

  //sets up gulp with scripts
  // setups up tasks in this._tasks
  _setupScripts: function(){
    var me = this;
    var p = this.get('path');
    // we need to setup a default scripts task, as well as configured specifics
    var defExts = [];
    var custExts = [];
    var gulp = this._gulp;
    this.get('scriptExtensions').forEach(function(ext){
      if(SC.typeOf(ext) === SC.T_STRING) defExts.push(ext);
      else custExts.push(ext);
    });

    gulp.task("defaultScripts", function(){
      SC.Logger.log("defaultScripts " + me.get('path'));
      var scriptsPatterns = [];
      defExts.forEach(function(ext){
        scriptsPatterns.push(BT.path.join(p,"**","*." + ext));
        if(!me.includeFixtures) scriptsPatterns.push("!" + BT.path.join(p,"fixtures","**","*," + ext));
        if(!me.includeTests) scriptsPatterns.push("!" + BT.path.join(p,"tests","**","*." + ext));
        scriptsPatterns.push("!" + BT.path.join(p,"debug","**","*." + ext));
      });
      me._tasks.defaultScripts = scriptsPatterns;
      var files = gulp.src(scriptsPatterns);
      // any other script plugin stuff should happen here...
      //
      // do some sorting
      files = files.pipe(me.scriptSorter());
      //if(me.combineScripts) files = files.pipe(BT.plugins["gulp-concat"](me.get('name') + ".js"));
      //if(me.minifyScripts) files = files.pipe(BT.plugins["gulp-uglify"]);
      files = files.pipe(BT.through.obj(function(file,enc,next){
        file.mimeType = "application/x-javascript";
        me.addFile(file);
        next();
      }));
      return files;
    });

    this._scriptTasks = ["defaultScripts"];
    // something similar to defaultScripts per custom script
    // then set the file patterns to the tasks object
  },

  //sets up gulp with stylesheets
  _setupStylesheets: function(){
    var me = this;
    var p = this.get('path');
    var gulp = this._gulp;
    var defExts = [];
    var custExts = [];
    this.get('stylesheetExtensions').forEach(function(ext){
      if(SC.typeOf(ext) === SC.T_STRING) defExts.push(ext);
      else custExts.push(ext);
    });

    gulp.task("defaultStylesheets", function(){
      //SC.Logger.log("defaultStylesheets " + me.path);
      var stylePatterns = [];
      defExts.forEach(function(ext){
        stylePatterns.push(BT.path.join(p,"**","*." + ext));
        if(!me.includeFixtures) stylePatterns.push("!" + BT.path.join(p,"fixtures","**","*," + ext));
        if(!me.includeTests) stylePatterns.push("!" + BT.path.join(p,"tests","**","*." + ext));
        stylePatterns.push("!" + BT.path.join(p,"debug","**","*." + ext));
      });
      me._tasks.defaultStylesheets = stylePatterns;
      var files = gulp.src(stylePatterns);
      // do some sorting (perhaps)
      if(me.combineStylesheets) files = files.pipe(BT.plugins["gulp-concat"](me.get('name') + ".css"));
      // if(me.minifyStylesheets) files = files.pipe(BT.plugins["gulp-uglify"]);
      files.pipe(BT.through.obj(function(file,enc,next){
        file.mimeType = "text/css";
        me.addFile(file);
        next();
      }));
      return files;
    });

    this._stylesheetTasks = ["defaultStylesheets"];
  },

  setupGulp: function(){
    var p,
        //tasks = ["defaultScripts"],
        gulp = this._gulp;

    if(this.isFrameworkBundle || this.isWrapperFramework) return; // we don't have to setup anything (I think now...)
    p = this.get('path');
    //SC.Logger.log("For framework " + this.ref + " path is " + p) ;
    if(!p) throw new Error("Framework: you configured a framework %@, but it needs a path".fmt(this.ref));
    // the framework needs to indicate through config whether it is a wrapper fw or not.

    var me = this; // keep a ref, so the task can look up
    if(!this._tasks) this._tasks = {};
    this._setupScripts();
    this._setupStylesheets();

    gulp.start(me._scriptTasks.concat(me._stylesheetTasks)); // just run the default set to start with
  },


  sort: function(){
    var flushFunction = function(){

      // if(me.ref === "sproutcore:jquery"){
      //   SC.Logger.log("flushFunction for jquery");
      // }

      // // first define moveTo, which we are using to adjust the order in the array
      // var moveTo = function(ary,posFrom,posTo){
      //   var ret, item, inb, rest;
      //   if(posFrom === posTo) return ary;
      //   if(posFrom < posTo){
      //     ret = ary.slice(0,posFrom);
      //     item = ary[posFrom];
      //     inb = ary.slice(posFrom+1,posTo+1);
      //     rest = ary.slice(posTo+1);
      //     return ret.concat(inb,item,rest);
      //   }
      //   else {
      //     ret = ary.slice(0,posTo);
      //     item = ary[posFrom];
      //     inb = ary.slice(posTo,posFrom);
      //     rest = ary.slice(posFrom+1);
      //     return ret.concat(item,inb,rest);
      //   }
      // };

      // var insertAt = function(ary,pos,el){
      //   var ret = ary.slice(0,pos);
      //   var rest = ary.slice(pos);
      //   return ret.concat(el,rest);
      // };

      // var debug = (me.ref === "sproutcore:runtime");
      // //var debug = false;

      // // now sort... This is done in a few stages, first alphabetically sort
      // //
      // var order = Object.keys(sortOrder);
      // if(debug) SC.Logger.log("order before simple sort: \n " + BT.util.inspect(order));
      // order.sort();
      // if(debug) SC.Logger.log("order after simple sort: \n " + BT.util.inspect(order));

      // // if we support wildcards, we need to explode them here...

      // // then move core.js to front, and main.js to end
      // if(debug){
      //   SC.Logger.log("sortOrder: " + BT.util.inspect(sortOrder));
      //   SC.Logger.log("startorder: " + BT.util.inspect(order));
      //   BT._SORTORDER = sortOrder;
      // }
      // var keys = Object.keys(sortOrder); // this might have to be arranged a bit different
      // var key_i, key_len, a_i, a_len, b_i, b_len;
      // var alist, blist;
      // var curIndex, apos, bpos, key;
      // for(key_i=0,key_len=keys.length;key_i<key_len;key_i+=1){
      //   key = keys[key_i];
      //   if(debug) SC.Logger.log("Walking through keys: key " + key);
      //   curIndex = order.indexOf(key);
      //   if(debug) SC.Logger.log("key currently found at index " + curIndex);
      //   alist = sortOrder[key].after;
      //   blist = sortOrder[key].before;
      //   if(debug){
      //     SC.Logger.log("alist: " + BT.util.inspect(alist));
      //     SC.Logger.log("blist: " + BT.util.inspect(blist));
      //   }
      //   for(a_i=0,a_len=alist.length;a_i<a_len;a_i+=1){
      //     apos = order.indexOf(alist[a_i]);
      //     if(debug) SC.Logger.log("index of alist element no: " + a_i + " is " + apos);
      //     if(curIndex<apos){
      //       if(debug) SC.Logger.log("our current position (" + curIndex + ") is smaller than apos (" + apos + ")");
      //       order = moveTo(order,curIndex,apos);
      //       if(debug) SC.Logger.log("new order after moving ourselves from curIndex to apos: " + BT.util.inspect(order));
      //       curIndex = order.indexOf(key);
      //       if(debug) SC.Logger.log("new curIndex is: " + curIndex);
      //     }
      //   }
      //   for(b_i=0,b_len=blist.length;b_i<b_len;b_i+=1){
      //     bpos = order.indexOf(blist[b_i]);
      //     if(debug) SC.Logger.log("index of blist element no: " + b_i + " is " + bpos);
      //     if(bpos<curIndex){
      //       if(debug) SC.Logger.log("our current position (" + curIndex + ") is bigger than bpos (" + bpos + ")");
      //       order = moveTo(order,bpos,curIndex+1);
      //       if(debug) SC.Logger.log("new order after moving ourselves from curIndex to bpos: " + BT.util.inspect(order));
      //       curIndex = order.indexOf(key);
      //       if(debug) SC.Logger.log("new curIndex is: " + curIndex);
      //     }
      //   }
      // }
      // var coreIndex = order.indexOf("core.js");
      // var mainIndex = order.indexOf("main.js");
      // if(coreIndex > -1){
      //   if(debug) SC.Logger.log("moving core.js from index " + coreIndex + " to 0");
      //   moveTo(order,coreIndex,0);
      // }
      // if(mainIndex > -1){
      //   if(debug) SC.Logger.log("moving main.js from index " + mainIndex + " to " + order.length-1);
      //   moveTo(order,mainIndex,order.length-1);
      // }
      // // proper order in order
      // if(debug){
      //   SC.Logger.log("sorted order is: " + BT.util.inspect(order));
      // }

      // SC.Logger.log("length of order is " + order.length + " for " + me.get('ref'));
      // for(var i=0,len=order.length;i<len;i+=1){
      //   curIndex = sortOrder[order[i]].index;
      //   if(debug){
      //     SC.Logger.log("attempting to write index: " + curIndex + " and file is: " + files[curIndex].path);
      //   }
      //   this.push(files[curIndex]);
      // }
    };


    return BT.through({ objectMode: true }, fileParser, flushFunction);
  },

  stylesheets: function(){
    var exts = this.stylesheetExtensions, ret = [];
    if(!this.files) return ret;

    Object.keys(this.files).forEach(function(f){
      var ext = BT.path.extname(f);
      var isMatch = exts.some(function(e){
        return (ext.indexOf(e) > -1);
      });
      if(isMatch) ret.push(f);
    },this);

    return ret;
  }.property('files'),

  scripts: function(){
    var exts = this.scriptExtensions, ret = [];
    if(!this.files) return ret;

    Object.keys(this.files).forEach(function(f){
      var ext = BT.path.extname(f);
      var isMatch = exts.some(function(e){
        return (ext.indexOf(e) > -1);
      });
      if(isMatch) ret.push(f);
    },this);

    return ret;
  }.property('files'),

  addFile: function(file){
    if(!this.files) this.files = {};
    var relpath = file.path.replace(BT.projectPath + "/","").replace(/frameworks\//g,"");
    file._bt_url = relpath;
    this.files[relpath] = file;
  },

  name: function(){
    var p = this.get('path'); // assume we have one, as init checks
    return BT.path.basename(p);
    // just get the last name from the path and take that
    // so "frameworks/sproutcore/frameworks/desktop" should become "desktop"
  }.property('path').cacheable(),

  reference: function(){
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
BT.Framework.dependencies = function(){
  var deps = this.prototype.dependencies;
  var all = this.prototype.all;
  var ret = [];

  if(deps && deps.length > 0){
    deps.forEach(function(d){
      var ddeps;
      var ref = (SC.typeOf(d) === SC.T_STRING)? d: d.ref;
      var fwclass = BT.projectManager.getFrameworkClass(ref);
      if(!fwclass) BT.util.log("Could not find referenced framework: " + ref);
      else {
        ddeps = fwclass.dependencies();
        // first ddeps, then d, causing the load order to be correct, because deepest will be first
        ret = ret.concat(ddeps,d);
      }
    });

    ret = ret.map(function(d){
      if(all){
        return SC.mixin({
          ref: d
        },all);
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
