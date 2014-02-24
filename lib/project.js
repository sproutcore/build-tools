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
    this.apps = {};
    this.fwclasses = {};
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
  },

  // to get a single instance of a framework
  getFramework: function(fwref){

  }
});