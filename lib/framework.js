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
   */

  _files : null,

  setupGulp: function(){
    var p, scriptsPatterns, stylesheetsPattern, resourcesPattern, gulp = this._gulp;
    if(this.isFrameworkBundle || this.isWrapperFramework) return; // we don't have to setup anything (I think now...)
    p = this.get('path');
    //SC.Logger.log("For framework " + this.ref + " path is " + p) ;
    if(!p) throw new Error("Framework: a framework needs a path: " + p);
    // the framework needs to indicate through config whether it is a wrapper fw or not.



    var me = this; // keep a ref, so the task can look up

    gulp.task('scripts',function(){
      BT.util.log("running task scripts in " + me.get('path'));
      var scriptsPatterns = me.get('scriptExtensions').map(function(ext){
        return BT.path.join(p,"**","*." + ext);
      });

      if(!me.includeFixtures) scriptsPatterns.push("!" + BT.path.join(p,"fixtures","*"));
      if(!me.includeTests) scriptsPatterns.push("!" + BT.path.join(p,"tests","*"));

      // hardcode now for the moment... needs to be plugin configurable...
      me._files = gulp.src(scriptsPatterns)
        .pipe(BT.plugins["gulp-if"](me.combineScripts,BT.plugins["gulp-concat"](me.get('name'))));
    });

    gulp.task('default',["scripts"],function(){
      BT.util.log("Task seems to have run succesfully");
    });

    // var makePattern = function(ext,negative){
    //   var ret = path.join(p,"**","*." + ext);
    //   if(negative) ret = "!" + ret;
    //   return ret;
    // };
    gulp.start();

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

