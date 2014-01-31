//autodetect is used to running the autodetection scheme for the configuration
//and uses a statechart to do it.
//
//
//
    // autoDetect should scan the current project folder for the following:
    // - a file named sc_config.json
    // - a folder called apps.
    //   - If it exists,
    //     - scan the subfolders,
    //     - look for sc_config.json in the root of every subfolder
    //       - if it exists, load it
    //       - if it doesn't exist, take the default config (which is essentially a "normal" app object)
    // - a folder called modules
    //   - If it exists,
    //     - scan the subfolders,
    //     - look for sc_config.json in the root of every subfolder
    //       - if it exists, load it
    //       - if it doesn't exist, take the default config (which is essentially a "normal" framework object)
    //
    // Not sure this should be loaded automatically. The idea is that apps detection should be greedy, but frameworks not.
    // we should be able to retrieve a framework based on the reference: ie: we create the framework and from the reference
    // (name) the framework should be able to either load itself, or add dependencies
    // - a folder called frameworks.
    //   - if it exists:
    //     - scan the subfolders,
    //     - look for sc_config in the root of every subfolder
    //       - if it exists, load it
    //       - if it doesn't exist, take the default config (which is essentially a "normal" framework object)
    //
    //  If no sc_config.json can be found, and no apps folder can be found, and no frameworks folder can be found
    //  throw error, as not in a SC project root
    //
var SC = require('sc-runtime');
var async = require('./async');
var fs = require('fs');
var path = require('path');
var jsonValidate = require('jsonschema').validate;
var SCHEMAS = require('./schemas');
var util = require('util');

var testJSON = function(text){
  var ret;
  try {
    ret = JSON.parse(text);
    return ret;
  }
  catch(e){
    return undefined;
  }
};

var projectPath;
// we save first all the verified config files, and only later merge them
var allConfigs = {
  project: null,
  apps: []
};
var resultConfig;

var AutoDetection = SC.Statechart.create({

  rootState: SC.State.design({
    initialSubstate: 'PROJECTCONFIG',

    PROJECTCONFIG: SC.State.design({
      // detect project config file and load if necessary (the process can be a reload)
      enterState: function(){
        async.exec(fs.readFile,path.join(projectPath,'sc_config.json'), {encoding: 'utf8'}).notify(AutoDetection,'readFileDidRespond');
      },

      readFileDidRespond: function(result){
        if(SC.ok(result)){
          //file exists
          var data = testJSON(result.get('result'));
          var ret = jsonValidate(data, SCHEMAS.PROJECT);
          if(ret && !ret.valid){
            // error
            util.log('invalid project config: ' + util.inspect(ret.errors));
          }
          else {
            util.log('valid project config, continuing...');
            allConfigs.project = data;
          }
        }
        else {
          // file doesn't exist
          util.log('no project config file found');
        }
        this.gotoState('APPS');
      }
    }),

    APPS: SC.State.design({
    // detect apps folder, if exists
      enterState: function(){
        async.exec(fs.readdir, path.join(projectPath,'apps')).notify(AutoDetection, 'detectAppsDidRespond');
      },

      appnames: null,

      detectAppsDidRespond: function(result){
        if(SC.ok(result)){
          // apps folder does exist, now check the contents
          var list = result.get('result');
          if(list.length > 0){
            this.appnames = list;
            list.forEach(function(app){
              async.exec(fs.readFile,path.join(projectPath,'apps',app,'sc_config.json'))
                .notify(AutoDetection, 'readAppConfigDidRespond',app);
            });
          }
          else {
            // apps folder does exist, but is empty
            throw new Error("Did you create any application yet?");
          }
        }
        else { // apps folder doesn't exist... not good
          throw new Error("We seem not to be in a project folder...");
        }
      },

      readAppConfigDidRespond: function(result,appname){
        var app = appname[0];
        if(SC.ok(result)){ // app config exists
          var data = testJSON(result.get('result'));
          var ret = jsonValidate(data, SCHEMAS.APP);
          if(ret && !ret.valid){
            // error
            util.log('invalid app config: ' + util.inspect(ret.errors));
          }
          else {
            util.log('valid project config, continuing...');
            if(!data.name) data.name = app;
            allConfigs.apps.push(data);
          }
        }
        else {
          util.log('app found with name ' + app + " but no config file detected.");
        }
        this.appnames = this.appnames.without(app);
        if(this.appnames.length === 0){
          this.gotoState('CHECKSPROUTCORE');
        }
      }

    }),

    CHECKSPROUTCORE: SC.State.design({
      // this is to check whether sproutcore is in the frameworks directory. If it is there,
      // we will need to use that version instead of the built-in one.
      enterState: function(){
        async.exec(fs.readdir, path.join(projectPath,'frameworks','sproutcore','sc_config.json'))
          .notify(AutoDetection, 'detectSproutcoreDidRespond');
      },

      detectSproutcoreDidRespond: function(result){
        if(SC.ok(result)){
          var data = testJSON(result.get('result'));
          var ret = jsonValidate(data, SCHEMAS.FRAMEWORK);
          if(ret && !ret.valid){
            // error
            util.log('invalid sproutcore config: ' + util.inspect(ret.errors));
          }
          else {
            util.log('valid sproutcore config, continuing...');
            allConfigs.sproutcore = data;
          }
        }
      }
    }),

  })
});

module.exports = function(ppath, callback){
  projectPath = ppath;
  AutoDetection.initStatechart();
};