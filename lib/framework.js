// var SC = require('sc-runtime');
// var path = require('path');

BT.Framework = SC.Object.extend({
  ref: null, // equivalent to reference
  isFramework: true,
  isFrameworkBundle: false, // replace by isWrapperFramework?
  isWrapperFramework: false,
  combineScripts: true,
  combineStylesheets: true,
  minifyScripts: false,
  minifyStylesheets: false,
  includeTests: false,
  includeFixtures: true,
  watchFiles: false,
  defaultLanguage: 'english',
  createSprite: false,
  scriptExtensions: ["js"],
  stylesheetExtensions: ["css"],
  resourceExtensions: ["png","jpg", "jpeg", "gif", "svg"],
  dependencies: null,
  _deps: null,

  concatenatedProperties: ['scriptExtensions','stylesheetExtensions','resourcesExtensions'],

  path: function(){
    var ret = BT._resolveReference(this.get('ref'),"framework");
    //SC.Logger.log("ref is " + this.get('ref'));
    //SC.Logger.log("ret is " + ret);
    return ret;
  }.property('ref').cacheable(),

  init: function(){
    //BT.util.log("init in BT.Framework for " + this.get('ref'));
    // we might have doubles in the concatenatedProperties
    this.concatenatedProperties.forEach(function(cp){
      //this[cp] = this[cp].uniq(); // remove any doubles, only works in more recent sc-runtimes?
    },this);

    // setup any dependencies
    if(this.dependencies){
      this._deps = [];
      this.dependencies.forEach(function(dep){
        // TODO:
        // we can detect here whether a default dep is used or a custom
        // if dep is a string, it is a default dep, and we can refer to a single instance
        // of the dependency
        var fwclass = BT.projectManager.getFrameworkClass(dep);
        if(!fwclass){
          //var fw = BT._resolveReference(dep,"framework");
          //BT.runConfig(fw);
          //fwclass = BT.projectManager.getFrameworkClass(dep);
          BT.util.log("No fw class found !@#!@?");
        }
        if(this.isWrapperFramework || this.isFrameworkBundle){
          fwclass = fwclass.extend({
            combineScripts: this.combineScripts,
            combineStylesheets: this.combineStylesheets,
            minifyScripts: this.minifyScripts,
            minifyStylesheets: this.minifyStylesheets,
            includeTests: this.includeTests,
            includeFixtures: this.includeFixtures,
            defaultLanguage: this.defaultLanguage,
            createSprite: this.createSprite,
            scriptExtensions: this.scriptExtensions,
            stylesheetExtensions: this.stylesheetExtensions,
            resourceExtensions: this.resourceExtensions,
            watchFiles: this.watchFiles
          });
        }
        if(!fwclass) BT.util.log("fwclass not found for ref " + dep);
        else this._deps.push(fwclass.create()); // TODO: add overrides?
      },this);
    }
    this._gulp = new BT.Gulp(); // how very unSC this is ... ;-)

    // in any case, setup gulp patterns
    this.setupGulp();
    if(this.watchFiles){
      this.changes = []; // setup array for file change notifications
    }
  },

  fileHasChanged: function(filepath){ // called by the watcher if something changed
    if(!this.changes) this.changes = [];
    this.changes.push(filepath);
    this.invokeOnce('filesDidChange');
  },

  filesDidChange: function(){
    // function called once to run certain gulp tasks whenever a file has changed
    // for the sake of simplicity, just determine which main task is involved here
    // (one of scripts, stylesheets or resources) and run the appropriate task
    var scriptsShouldRun = false,
        stylesheetsShouldRun = false,
        resourcesShouldRun = false;

    this.changes.forEach(function(c){
      var ext = BT.path.extname(c);
      var hasExt = function(e){
        if(ext.indexOf(e) > -1) return true;
      };

      scriptsShouldRun = scriptsShouldRun || this.scriptExtensions.some(hasExt);
      stylesheetsShouldRun = stylesheetsShouldRun || this.stylesheetExtensions.some(hasExt);
      resourcesShouldRun = resourcesShouldRun || this.resourceExtensions.some(hasExt);
    },this);

    var tasks = [];
    tasks = scriptsShouldRun? tasks.concat(this._scriptTasks): tasks;
    tasks = stylesheetsShouldRun? tasks.concat(this._stylesheetTasks): tasks;
    //tasks = resourcesShouldRun? tasks.concat(this._scriptTasks): tasks;

    // perhaps do something with running state, as in not starting anything if we are still working...
    this.gulp.start(tasks);
  },

  // can also be solved by concatenatedProperties!!
  /*
    array, to put extra extensions, three options:
    - "coffee" if no specific parsing is needed
    - { coffee: "gulp-plugin" } where gulp-plugin is the module to require
    - { coffee: gulp-plugin } where gulp-plugin is a reference to the function to call

    perhaps better:
    { ext: "coffee", plugin: "gulp-plugin", args: [] }
   */

  _files : null,

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
        if(!me.includeFixtures) scriptsPatterns.push("!" + BT.path.join(p,"fixtures","*," + ext));
        if(!me.includeTests) scriptsPatterns.push("!" + BT.path.join(p,"tests","*." + ext));
      });
      me._tasks.defaultScripts = scriptsPatterns;
      var files = gulp.src(scriptsPatterns);
      // do some sorting
      files.pipe(me.scriptSorter());
      if(me.combineScripts) files = files.pipe(BT.plugins["gulp-concat"](me.get('name') + ".js"));
      if(me.minifyScripts) files = files.pipe(BT.plugins["gulp-uglify"]);
      files.pipe(BT.through.obj(function(file,enc,next){
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
        if(!me.includeFixtures) stylePatterns.push("!" + BT.path.join(p,"fixtures","*," + ext));
        if(!me.includeTests) stylePatterns.push("!" + BT.path.join(p,"tests","*." + ext));
      });
      me._tasks.defaultStylesheets = stylePatterns;
      var files = gulp.src(stylePatterns);
      // do some sorting
      if(me.combineStylesheets) files = files.pipe(BT.plugins["gulp-concat"](me.get('name') + ".css"));
      // if(me.minifyStylesheets) files = files.pipe(BT.plugins["gulp-uglify"]);
      files.pipe(BT.through.obj(function(file,enc,next){
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

    // // Rerun the task when a file changes
    // gulp.task('watch', function () {
    //   gulp.watch(paths.scripts, ['scripts']);
    //   gulp.watch(paths.images, ['images']);
    // });

    // this could perhaps be shared between the different instances of a fw?
    // don't know how to achieve it though...

    // gulp.task('watch', function(){
    //   Object.keys(me._tasks).forEach(function(t){
    //     gulp.watch(me._tasks[t],[t]); // tasks[t] : list of sources, t name of task to run for them
    //   });
    // });
    //this._tasks.watch = []; // just to add it to the list of tasks

    // // The default task (called when you run `gulp` from cli)
    // gulp.task('default', ['scripts', 'images', 'watch']);
    //SC.Logger.log("tasks:  " + BT.util.inspect(me._tasks));
    gulp.task('default',Object.keys(me._tasks),function(){
 //     BT.util.log("Task seems to have run succesfully for " + me.get('name'));
      gulp.task('watch', function(){
        Object.keys(me._tasks).forEach(function(t){
          gulp.watch(me._tasks[t],[t].concat("watch")); // tasks[t] : list of sources, t name of task to run for them
        });
      });
//      SC.Logger.log("tasks:  " + BT.util.inspect(me._tasks));
    });


    gulp.start(me._scriptTasks.concat(me._stylesheetTasks)); // just run the default set to start with
  },

  scriptSorter: function(){
    var files = [];
    var sortOrder = {};
    var me = this;

    var insertAt = function(ary,pos,el){
      var ret = ary.slice(0,pos);
      var rest = ary.slice(pos);
      return ret.concat(el,rest);
    };

    var moveTo = function(ary,posFrom,posTo){
      var ret, item, inb, rest;
      if(posFrom === posTo) return ary;
      if(posFrom < posTo){
        ret = ary.slice(0,posFrom);
        item = ary[posFrom];
        inb = ary.slice(posFrom+1,posTo+1);
        rest = ary.slice(posTo+1);
        return ret.concat(inb,item,rest);
      }
      else {
        ret = ary.slice(0,posTo);
        item = ary[posFrom];
        inb = ary.slice(posTo,posFrom);
        rest = ary.slice(posFrom+1);
        return ret.concat(item,inb,rest);
      }
    };

    return BT.through({ objectMode: true }, function(file,enc,cb){
      var index = files.push(file) - 1; // we push and know the index of the file
      if(me.ref === "sproutcore:jquery"){
        //SC.Logger.log("filename: " + file.path + " and index is " + index);
      }
      sortOrder[file.path] = { index: index, before: [], after: [] };
      // var depFilename,target;
      var contents = file.contents.toString();
      // //SC.Logger.log("contents is :  " + contents);
      var re = new RegExp("sc_require\\([\"'](.*?)[\"']\\)", "g");
      while (match = re.exec(contents)) { // in double parentheses to avoid jshint warnings
        relpath = match[1];
        relpath = (relpath.lastIndexOf('.js') === -1)? relpath + ".js": relpath;
        if(me.ref === "sproutcore:jquery"){
          //SC.Logger.log("match: " + relpath);
        }
        depFilename = BT.path.join(BT.projectDir, me.get('path'), relpath);
        if(me.ref === "sproutcore:jquery"){
          //SC.Logger.log("depFilename: " + depFilename);
        }
        // //currentFile.after(depFilename); // will automatically do the reverse lookup
        if(sortOrder[file.path].after.indexOf(depFilename) === -1){
          sortOrder[file.path].after.push(depFilename);
        }
        target = sortOrder[depFilename];
        if(!target){
          sortOrder[depFilename] = { before: [file.path], after: [] };
        }
        else {
          if(sortOrder[depFilename].before.indexOf(file.path) === -1){
            sortOrder[depFilename].before.push(file.path);
          }
        }
      }
      cb();
    },
    function(){
      // now sort... This is done in a few stages, first alphabetically sort
      var order = Object.keys(sortOrder);
      order.sort();
      // then move core.js to front, and main.js to end
      var coreIndex = order.indexOf("core.js");
      var mainIndex = order.indexOf("main.js");
      if(coreIndex > -1){
        moveTo(order,coreIndex,0);
      }
      if(mainIndex > -1){
        moveTo(order,mainIndex,order.length-1);
      }
      if(me.ref === "sproutcore:desktop"){
        SC.Logger.log("startorder: " + BT.util.inspect(order));
      }
      var keys = Object.keys(sortOrder); // this might have to be arranged a bit different
      var key_i, key_len, a_i, a_len, b_i, b_len;
      var alist, blist;
      var curIndex, apos, bpos, key;
      for(key_i=0,key_len=keys.length;key_i<key_len;key_i+=1){
        key = keys[key_i];
        curIndex = order.indexOf(key);
        alist = sortOrder[key].after;
        blist = sortOrder[key].before;
        for(a_i=0,a_len=alist.length;a_i<a_len;a_i+=1){
          apos = order.indexOf(alist[a_i]);
          if(curIndex<apos){
            order = moveTo(order,curIndex,apos);
            curIndex = order.indexOf(key);
          }
        }
        for(b_i=0,b_len=blist.length;b_i<b_len;b_i+=1){
          bpos = order.indexOf(blist[b_i]);
          if(bpos > -1 && bpos<curIndex){
            order = moveTo(order,curIndex,bpos);
            curIndex = order.indexOf(key);
          }
        }
      }
      // proper order in order
      if(me.ref === "sproutcore:jquery"){
        //SC.Logger.log("curOrder: " + BT.util.inspect(order));
      }

      for(var i=0,len=order.length;i<len;i+=1){
        curIndex = sortOrder[order[i]].index;
        //SC.Logger.log("attempting to write index: " + curIndex + " and file is: " + files[curIndex].path);
        this.write(files[curIndex]);
      }
    });
  },


  addFile: function(file){
    //SC.Logger.log("FW.addFile: " + BT.util.inspect(Object.keys(file)));
    //SC.Logger.log("FW.addFile: " + file.path);
    //if(!this._files) this._files = [];
    //this._files.push(file);
    if(!this._files) this._files = {};
    this._files[file.path] = file;
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

