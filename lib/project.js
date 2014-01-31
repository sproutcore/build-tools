var SC = require('sc-runtime');
var Async = require('./async');
var autodetect = require('./autodetect');
var util = require('util');
// the project config is essentially identical to


var Project = module.exports = SC.Object.extend({
  path: null,

  server: null, // anchor point for the server config
  frameworks: null, // anchor point for the frameworks config
  plugins: null, // anchor point for plugin information
  apps: null, // anchor point for apps configuration
  deploy: null, // anchor point for deploy configuration

  projectConfig: function(){
    var ret = {
      server: this.get('server'),
      frameworks: this.get('frameworks'),
      plugins: this.get('plugins'),
      apps: this.get('apps'),
      deploy: this.get('deploy')
    };
    return JSON.stringify(ret); // indentation?
  }.property(),

  init: function(){
    // init should run autoDetect
    this.autoDetect();
  },

  _detectionInProgress: false,

  _detectionResults: null,

  autoDetect: function(){
    Async.exec(autodetect,this.path).notify(this,'autoDetectReady');
  },

  autoDetectReady: function(allconfig){
    util.log('autoDetection ready, config is: ' + util.inspect(allconfig));
  }
});