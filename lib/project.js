// var SC = require('sc-runtime');
// var Async = require('./async');
// var autodetect = require('./autodetect');
// var util = require('util');
// the project config is essentially identical to


// var Project = module.exports = SC.Object.extend({
//   path: null,

//   server: null, // anchor point for the server config
//   frameworks: null, // anchor point for the frameworks config
//   plugins: null, // anchor point for plugin information
//   apps: null, // anchor point for apps configuration
//   deploy: null, // anchor point for deploy configuration

//   projectConfig: function(){
//     var ret = {
//       server: this.get('server'),
//       frameworks: this.get('frameworks'),
//       plugins: this.get('plugins'),
//       apps: this.get('apps'),
//       deploy: this.get('deploy')
//     };
//     return JSON.stringify(ret); // indentation?
//   }.property(),

//   init: function(){

//   }
// });
//


BT.projectManager = SC.Object.create({
  apps: null,

  fwclasses: null,

  init: function(){
    var me = this;
    this.apps = {};
    this.fwclasses = {};
    this.watchers = {};
    this._gulp = new BT.Gulp(); // how very unSC this is ... ;-), for watchers
    this._watcher= this._gulp.watch()._watcher;
    this._watcher.on('all',function(){
      // the idea here was to have all changes in one function call,
      // but this doesn't seem to be the case.
      SC.RunLoop.begin();
      me._watcherDidFire.apply(me,arguments); // patch through
      SC.RunLoop.end();
    });
    this._watchPatterns = []; // contents is plain record like objects, with the following layout:
    // {
    //    pattern: "", // single pattern
    //    targets: [
    //      { target: obj,
    //        method: fn
    //      }
    //
    //    ]
    // }
    //
  },

  addApp: function(app){
    var appname = app.get('name');
    if(!appname) throw new Error("An app should always carry a name!");
    if(!this.apps[appname]) this.apps[appname] = app;
  },

  addFramework: function(fwclass){
    //if(!this.fwclasses) this.fwclasses = SC.Set.create();
    var fwref = fwclass.prototype.ref;
    //BT.util.log('registering fw: ' + fwref);
    this.fwclasses[fwref] = fwclass;
    //BT.util.log('keys in fwcache: ' + BT.util.inspect(Object.keys(this.fwclasses)));
  },

  // the watcher is on the project manager to prevent multiple framework instances declaring watchers on the same
  // files. We only want one watcher, and we will figure out ourselves which fw instance should be called
  addWatch: function(watchpatterns,target){

    if(!target){
      throw new Error("BT.projectManager#addWatch: Trying to add a watcher without a target!");
    }

    this._watcher.add(watchpatterns); // gaze (the watcher) will make the patterns unique
    if(SC.typeOf(watchpatterns) === SC.T_STRING){
      watchpatterns = [watchpatterns];
    }
    watchpatterns.forEach(function(p){
      // find ref
      var r = this._watchPatterns.findProperty('pattern',p);
      if(!r){ // create ref
        this._watchPatterns.push({
          pattern: p,
          targets: [target]
        });
      }
      else {
        // double check whether target already exists
        if(r.targets.indexOf(target) === -1){
          r.targets.push(target);
        }
      }
    },this);
  },

  _watcherDidFire: function(event,filepath){
    // use BT.minimatch to figure out which fw instances to call
    this._watchPatterns.forEach(function(p){
      if(BT.minimatch(p.pattern,filepath)){
        p.targets.forEach(function(t){
          t.target.fileHasChanged(filepath); // let invokeOnce be done by the framework
        });
      }
    });
  },

  getFrameworkClass: function(fwref){
    //BT.util.log('trying to find class for ' + fwref);
    var ret = this.fwclasses[fwref];
    if(!ret){ // try to actively locate the fw
      //BT.util.log('class not found, actively locating...');
      var d = BT._resolveReference(fwref,"framework");
      //BT.util.log('trying to runConfig: ' + d);
      BT.runConfig(d); // should auto-register
      ret = this.fwclasses[fwref]; // should now contain the fw
    }
    else {
      //BT.util.log('class found...');
    }
    return ret;
  }
});