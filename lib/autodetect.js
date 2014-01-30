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

var projectPath;
var resultConfig;

var AutoDetection = SC.Statechart.create({

  rootState: {
    initialSubstate: 'PROJECTCONFIG',

    PROJECTCONFIG: SC.State.design({
      // detect project config file and load if necessary (the process can be a reload)
      enterState: function(){
        async.exec(fs.readFile,path.join(projectPath,'sc_config.json')).notify(AutoDetection,'readFileDidRespond');
      },

      readFileDidRespond: function(result){
        if(SC.ok(result)){
          //file exists
        }
        else {
          // file doesn't exist
        }
      }
    }),

    APPS: SC.State.design({
      // detect apps folder, if exists
      initialSubstate: 'DETECTAPPFOLDER',

      DETECTAPPFOLDER: SC.State.design({
        enterState: function(){

        }
      }),

      DETECTAPPS: SC.State.design({
        // detect apps, for every app check for a config file and load config if found
      }),

    }),

    FRAMEWORKS: SC.State.design({
      // we don't actively detect frameworks, but we should detect whether sproutcore exists in the frameworks folder
      initialSubstate: 'SPROUTCORE',

      SPROUTCORE: SC.State.design({
              // If SC is in the frameworks folder, we should use that one, instead of the builtin
        enterState: function(){

        }
      })
    })

  }
});

module.exports = function(ppath){
  projectPath = ppath;

};