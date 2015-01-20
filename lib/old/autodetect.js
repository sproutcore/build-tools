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
var vm = require('vm');

var parseSCConfig = function(scconfig,filepath){ // scconfig contains the result of fs.readFile
  var readConfig = {};
  var isAsync = false;

  var ctx = vm.createContext({
    // opts
    config: function(opts){
      if(!opts.target) throw new Error("Missing target in SCConfig: " + filepath);
      if(!opts.type) throw new Error("Missing target type in SCConfig: " + filepath);
      readConfig[opts.target] = opts;
    },

  });
  vm.runInContext(scconfig,ctx,filepath);
  return readConfig;
};

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

var namedHashToArray = function(hash){
  if(SC.typeOf(hash) === SC.T_ARRAY) return hash;
  else {
    return Object.keys(hash).map(function(k){
      if(!hash.name) hash.name = k;
      return hash;
    });
  }
};


var resolveReference = function(ref,context){
//  1. "sproutcore": depending on the context this is either an app, a framework or a module in the root of the project
//  2. "sproutcore:desktop": this is the subframework desktop inside the sproutcore framework
//  3. "sproutcore/lib/index.html": this is a reference to the file lib/index.html inside the sproutcore framework
//  4. "http://my.host.ext": a url, is taken literally
  //context is one of "app","framework","module"
  var prefix, p;
  if(context === "app"){
    prefix = "apps";
  } else if(context === "framework"){
    prefix = "frameworks";
  } else if(context === "module"){
    prefix = "modules";
  }
  if(ref.indexOf("http") > -1){
    return ref; // don't do anything
  }
  if(ref.indexOf(":") > -1){
    p = ref.replace(/\:/g,"/frameworks/");
    return path.join(prefix,p);
  }
  return path.join(prefix,ref);
};

var projectPath;
// we save all config files, and generate a complex of hashes for every object to create
// in order for the actual creation process of all the levels to be easy and straightforward
// meaning that the apps will be a hash where the name of the app is a key,
// and the value an array of configurations. The same goes for the frameworks inside the apps,
// except that the frameworks will be an array of arrays, where each array will contain the different
// configuration for each level.
var allConfigs = {
  project: null,
  apps: []
};
var resultConfig;
var cb;


var AppConfigParser = SC.Object.extend({
  content: null,

  done: false, // observable to indicate ready with parsing

  init: function(){
    // take the content, and start working
    if(!this.content) throw new Error("AppConfigParser: no content!");
    this._fwconfigs = [];
  },

  start: function(){ // we create a separate function in order to allow attaching observers before starting the procedure
    // content should be a hash or array
    if(!this.content.frameworks){
      this.set('done',true); // nothing to do
    }
    else {
      this.content.frameworks = namedHashToArray(this.content.frameworks); // will convert if necessary
      if(this.content.frameworks.length === 0){
        this.set('done',true); // nothing to do
      }
      else {
        this._currFWIndex = 0;
        this.takeNext();
      }
    }
  },

  _currFWIndex: null,

  takeNext: function(){
    if(this._currFWIndex >= this.content.frameworks.length){
      this.finish();
      return; // done with parsing
    }
    // if not done with parsing
    var curFW = this.content.frameworks[this._currFWIndex];
    var pOne,pTwo;

    if(SC.typeOf(curFW) === SC.T_STRING){
      p = resolveReference(curFW,"framework");
    }
    else { // hash
      if(!fw.path){
        p = resolveReference(fw.name,"framework");
      }
      else p = fw.path;
    }
    pOne = path.join(p,'sc_config.json');
    pTwo = path.join(p,'sc_config');
    async.exec(fs.readFile,pOne, { encoding: "utf8"}).notify(this,'nextJSONDidRead', pOne, fw);
    async.exec(fs.readFile,pTwo, { encoding: "utf8"}).notify(this,'nextJSDidRead', pTwo, fw);
  },

  nextJSONDidRead: function(result, args){
    //args[0] == path, args[1] == fw
    var data, ret;
    if(SC.ok(result)){
      // there is a config file, check dependencies
      data = testJSON(result.get('result'));
      ret = jsonValidate(data, SCHEMAS.FRAMEWORK);
      if(ret && !ret.isValid){
        throw new Error("Found syntax error in " + args[0]);
      }
      // valid json, now check deps
      if(data.dependencies && data.dependencies.length > 0){
        data.dependencies.forEach(function(dep){
          if(this.content.frameworks.indexOf(dep) === -1){
            this.content.frameworks.push(dep);
          }
        });
      }
      this._jsonReturn = data;
    }
    this._jsonDidReturn = true;
    this.proceedToNext(args[0],args[1]);
  },

  nextJSDidRead: function(result, args){
    if(SC.ok(result)){
      // parse the config in result...

      // problem is that this might need another async call to figure out whether
      // target is an app or a framework...

    }
    this._jsDidReturn = true;
    this.proceedToNext(args[0],args[1]);
  },

  // slots to store any return values on. If there is nothing to read, the value is true
  _jsonDidReturn: false,
  _jsDidReturn: false,
  _jsonReturn: false,
  _jsReturn: false,

  proceedToNext: function(fwpath, fw){
    var ret;
    if(this._jsDidReturn && this._jsonDidReturn){
      this._jsDidReturn = false;
      this._jsonDidReturn = false;
      // next take the data
      var data = this._jsReturn? this._jsReturn : this._jsonReturn? this._jsonReturn: { path: fw };
      if(SC.typeOf(fw) === SC.T_HASH){
        this._fwconfigs.push([args[1], data]);
      }
      else {
        this._fwconfigs.push(data);
      }
      this._jsReturn = this._jsonReturn = null; // reset return values
      this._currFWIndex += 1;
      this.takeNext();
    }
  },

  finish: function(){
    // nextDidRead stores the temporary fw configs in this._fwconfigs, we need to replace the
    // original frameworks with a reversed _fwconfigs, and set done
    this.content.frameworks = this._fwconfigs.reverse();
    this.set('done',true);
  }

});

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
            BT.Logger.info('invalid project config: ' + util.inspect(ret.errors));
          }
          else {
            BT.Logger.info('valid project config, continuing...');
            allConfigs.set('project',data);
          }
        }
        else {
          // file doesn't exist
          BT.Logger.info('no project config file found');
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
            BT.Logger.info('invalid app config: ' + util.inspect(ret.errors));
          }
          else {
            BT.Logger.info('valid project config, continuing...');
            if(!data.name) data.name = app;
            allConfigs.apps.push(data);
          }
        }
        else {
          BT.Logger.info('app found with name ' + app + " but no config file detected.");
          allConfigs.apps.push(app);
        }
        this.appnames = this.appnames.without(app);
        if(this.appnames.length === 0){
          this.gotoState('PARSEAPPS');
        }
      }

    }),

    PARSEAPPS: SC.State.design({
      // state to parse the detected apps
      // this means:
      // if the apps in the project config file is a name based hash, make it into an array
      // which either is an empty object, or contains the configuration of the app.
      // if the frameworks array in the apps configuration is a name hash, expand it
      // The main reason of parsing the configuration here is that any dependencies of frameworks
      // are worked out before doing framework.create(), as a framework itself cannot / should not
      // influence the app configuration, and the app should not have to figure out any fw configuration

      // we generate a configuration where each app is a name hash
      appConfig: null,

      enterState: function(){
        this.appConfig = {};
        var projApps = allConfigs.project? allConfigs.project.apps: null;
        // go through detected apps, and match with project apps
        allConfigs.apps.forEach(function(app){
          // app in config can either be a app config that we read, or a string if it didn't exist
          var appName;
          if(SC.typeOf(app) === SC.T_STRING){ // if it is a string, there is no config in the app dir
            appName = app;
            this.appConfig[appName] = [{ name: appName}];
            // so check the project config, we don't have to check the type, because that is the task of jsonschema
          }
          else {
            appName = app.name;
            if(!appName) throw new Error("If you include a config file in an app, you need to specify the name!");
            else {
              this.appConfig[appName] = [app];
            }
          }
          if(allConfigs.project && allConfigs.project.apps && allConfigs.project.apps[appName]){
            this.appConfig[appName].push(allConfigs.project.apps[appName]);
          }
        },this);

        // now we have the basic configuration per application, we need to complete any framework dependencies
        // as in that we need to see whether the mentioned frameworks have dependencies, and include them
        // the app will do the sorting, and weed out any duplicates
        this._appsData = { };
        BT.Logger.info('appConfig: ' + util.inspect(this.appConfig));
        Object.keys(this.appConfig).forEach(this.parseApp,this);
      },

      _appsData: null,

      parseApp: function(appName){
        BT.Logger.info('parsing appName: ' + appName);
        var curApp = this.appConfig[appName];
        // curApp is an array with configurations
        // for every item in the curApp array we create an instance of
        // AppConfigParser, and attach an observer to the done property
        curApp.forEach(function(conf, confIndex){
          var t = AppConfigParser.create({ content: conf, appName: appName, index: confIndex });
          t.addObserver('done',this,'ready');
          if(!this._appsData[appName]) this._appsData[appName] = { configs: [] };
          this._appsData[appName].configs[confIndex] = t;
          t.start();
        },this);
      },

      // in this setup, how big is the chance on a run condition?

      ready: function(target,key,value,rev){
        // we get called for every app config, the app object contains appName and index
        var appname = target.get('appName');
        var index = target.get('index');
        if(target.get(key)){
          allConfigs.apps[appname] = target.content; // replace read config with detected config...
          target.removeObserver('done', this,'ready'); // remove the observer
        }
        // we check the following for every app
        // length of this.appConfig[appName] needs to be equal to this._appsData[appName].configs
        // all this._appsData[appName].configs elements need to be done
        var ready = true;
        Object.keys(this.appConfig).forEach(function(name){
          if(!this._appsData[name]){
            ready = false;
          }
          else if(this.appConfig[name].length !== this._appsData[name].configs.length){
            ready = false;
          }
          else if(!this._appsData[name].configs.everyProperty('done')){
            ready = false;
          }
        },this);
        if(ready){ // everything is done, continue to the next stage
          BT.Logger.info('all apps parsed...');
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
            BT.Logger.info('invalid sproutcore config: ' + util.inspect(ret.errors));
          }
          else {
            BT.Logger.info('valid sproutcore config, continuing...');
            allConfigs.sproutcore = data;
          }
        }
        else {
          BT.Logger.info('no sproutcore detected in frameworks folder');
        }
        this.gotoState('FINISHED');
        //cb(null,allConfigs);
      }
    }),

    FINISHED: SC.State.design({
      enterState: function(){
        cb(null,allConfigs)
      }
    })
  })
});

module.exports = function(ppath, callback){
  projectPath = ppath;
  AutoDetection.initStatechart();
  cb = callback;
};