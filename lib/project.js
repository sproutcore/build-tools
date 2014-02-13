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

SC.projectManager = SC.Object.create({
  apps: null,

  fwclasses: null,

  addApp: function(app){
    if(!this.apps) this.apps = SC.Set.create();
    this.apps.push(app);
  },

  addFrameworkClass: function(fwclass){
    if(!this.fwclasses) this.fwclasses = SC.Set.create();
    this.fwclasses.push(fwclass)
  },

  getFrameworkClass: function(fwref){

  }
});