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
    // setup any dependencies
    if(this.dependencies){
      this._deps = [];
      this.dependencies.forEach(function(dep){
        var fwclass = BT.projectManager.getFrameworkClass(dep);
        if(!fwclass){
          //var fw = BT._resolveReference(dep,"framework");
          //BT.runConfig(fw);
          //fwclass = BT.projectManager.getFrameworkClass(dep);
          BT.util.log("No fw class found !@#!@?");
        }
        if(this.isWrapperFramework || this.isFrameworkBundle){
          fwclass = fwclass.extend(); // TODO: add overrides!
        }
        if(!fwclass) BT.util.log("fwclass not found for ref " + dep);
        else this._deps.push(fwclass.create());
      },this);
    }
    this._gulp = new BT.Gulp(); // how very unSC this is ... ;-)

    // in any case, setup gulp patterns
    this.setupGulp();
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

  setupGulp: function(){
    var p,
        tasks = ["defaultScripts"],
        gulp = this._gulp;


    if(this.isFrameworkBundle || this.isWrapperFramework) return; // we don't have to setup anything (I think now...)
    p = this.get('path');
    //SC.Logger.log("For framework " + this.ref + " path is " + p) ;
    if(!p) throw new Error("Framework: you configured a framework %@, but it needs a path".fmt(this.ref));
    // the framework needs to indicate through config whether it is a wrapper fw or not.

    var me = this; // keep a ref, so the task can look up

    // we need to setup a default scripts task, as well as configured specifics
    var defExts = [];
    var custExts = [];
    this.get('scriptExtensions').forEach(function(ext){
      if(SC.typeOf(ext) === SC.T_STRING) defExts.push(ext);
      else custExts.push(ext);
    });

    gulp.task("defaultScripts", function(){
      var scriptsPatterns = [];
      defExts.forEach(function(ext){
        scriptsPatterns.push(BT.path.join(p,"**","*." + ext));
        if(!me.includeFixtures) scriptsPatterns.push("!" + BT.path.join(p,"fixtures","*," + ext));
        if(!me.includeTests) scriptsPatterns.push("!" + BT.path.join(p,"tests","*." + ext));
      });
      var files = gulp.src(scriptsPatterns);
      // do some sorting
      files.pipe(me.scriptSorter());
      if(me.combineScripts) files = files.pipe(BT.plugins["gulp-concat"](me.get('name')));
      if(me.minifyScripts) files = files.pipe(BT.plugins["gulp-uglify"]);
      files.pipe(BT.through.obj(function(file,enc,next){
        me.addFile(file);
        next();
      }));
      //files.pipe(me.addFiles);
      //me.addFiles(files);
      return files;
    });

    // something similar to defaultScripts per custom script
    // then push to the tasks array

    gulp.task('default',tasks,function(){
      BT.util.log("Task seems to have run succesfully for " + me.get('name'));
    });

    gulp.start();
  },


  /*

  var SortedFile = function(opts){
  this.parent = opts.parent;
  this.filename = opts.filename;
  this._after = [];
  this._before = [];
  return this;
};

SortedFile.prototype.after = function(filename,skipTarget){
  // meaning the current file is after filename
  if(this._after.indexOf(filename) === -1) this._after.push(filename);
  // now look up the target
  var target = this.parent.get(filename);
  if(!skipTarget) target.before(this.filename,true);
};

SortedFile.prototype.before = function(filename,skipTarget){
  if(this._before.indexOf(filename) === -1) this._before.push(filename);
  var target = this.parent.get(filename);
  if(!skipTarget) target.after(this.filename,true);
};

var Sorter = function(opts){
  this.content = {}; // can be overwritten by opts
  for(var i in opts){
    if(opts.hasOwnProperty(i)){
      this[i] = opts[i];
    }
  }
  return this;
};

Sorter.prototype.get = function(fn){
  var ret = this.content[fn] || new SortedFile({ parent: this, filename: fn });
  if(!this.content[fn]) this.content[fn] = ret;
  return ret;
};

Sorter.prototype.insertAt = function(ary,pos,el){
  var ret = ary.slice(0,pos);
  var rest = ary.slice(pos);
  return ret.concat(el,rest);
};

Sorter.prototype.moveTo = function(ary,posFrom,posTo){
  var ret,item,inb,rest;
  if(posFrom === posTo) return ary;
  else {
    item = ary[posFrom];
    if(posFrom < posTo){
      ret = ary.slice(0,posFrom);
      inb = ary.slice(posFrom+1,posTo+1); // don't take posFrom, because it will be moved
      rest = ary.slice(posTo+1);
      return ret.concat(inb,item,rest);
    }
    else {
      ret = ary.slice(0,posTo);
      inb = ary.slice(posTo,posFrom);
      rest = ary.slice(posFrom+1);
      return ret.concat(item, inb,rest);
    }
  }
};

Sorter.prototype.sort = function(){
  //returns a sorted list of filenames
  //

  var order = Object.keys(this.content);
  var files = this.content;
  var keys = Object.keys(this.content); // this might have to be arranged a bit different
  var key_i, key_len, a_i, a_len, b_i, b_len;
  var alist, blist;
  var curIndex, apos, bpos, key;
  for(key_i=0,key_len=keys.length;key_i<key_len;key_i+=1){
    key = keys[key_i];
    curIndex = order.indexOf(key);
    alist = files[key]._after;
    blist = files[key]._before;
    for(a_i=0,a_len=alist.length;a_i<a_len;a_i+=1){
      apos = order.indexOf(alist[a_i]);
      if(curIndex<apos){
        order = this.moveTo(order,curIndex,bpos);
        curIndex = order.indexOf(key);
      }
    }
    for(b_i=0,b_len=blist.length;b_i<b_len;b_i+=1){
      bpos = order.indexOf(blist[b_i]);
      if(bpos<curIndex){
        order = this.moveTo(order,curIndex,bpos);
        curIndex = order.indexOf(key);
      }
    }
  }
  return order;

};

module.exports = function (grunt) {
  //"use strict"; //perhaps not needed

/*

The current approach is to make a building system which works per framework.



  var sorter = function(list,basename){

    var sorter = new Sorter();
    // we need to have frameworkname/core.js always first, but we could also fix this after sorting, by moving it up top
    // parse through the list
    list.forEach(function(f){
      var currentFile, depFilename, target, contents, re, relpath, match;

      // for every match, put the matched files in the sc_require in files[f].after (because this file should be after those files)
      // and look up the other file and add to the before there
      currentFile = sorter.get(f);
      // now check the file for sc_require
      contents = grunt.file.read(f);
      re = new RegExp("require\\([\"'](.*?)[\"']\\)", "g");
      while (match = re.exec(contents)) {
        relpath = match[1];
        relpath = (relpath.lastIndexOf('.js') === -1)? relpath + ".js": relpath;
        depFilename = basename + "/" + relpath;
        currentFile.after(depFilename); // will automatically do the reverse lookup
      }
      //
    });

    var order = sorter.sort();
    // var posOfCoreJs = order.indexOf(basename + "/core.js");
    // if(posOfCoreJs>0){ // not in first position and in the list
    //   order = sorter.moveTo(order,posOfCoreJs,0);
    // }
    return order;
  };
   */

  scriptSorter: function(){
    var curOrder = [];
    var sortOrder = {};

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

    return BT.through({ objectMode: true}, function(file,enc,cb){
      SC.Logger.log("filename: " + file.path);
      sortOrder[file.path] = { before: [], after: [] };
      curOrder.push(file);
      cb();
    },
    function(){
      // now sort...
      SC.Logger.log("curOrder: " + BT.util.inspect(this));
      curOrder.forEach(this.queue);
    });
  },


  addFile: function(file){
    //SC.Logger.log("FW.addFile: " + BT.util.inspect(Object.keys(file)));
    SC.Logger.log("FW.addFile: " + file.path);
    if(!this._files) this._files = [];
    this._files.push(file);
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

