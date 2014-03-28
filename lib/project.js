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
    this._fileClasses = {};
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

  startServer: function(){
    SC.Logger.log("Starting development server...");
    //return;
    var me = this;
    var processname = "SproutCore BuildTools";
    var hostname = (BT.serverConfig && BT.serverConfig.host)? BT.serverConfig.host : 'localhost';
    var port = (BT.serverConfig && BT.serverConfig.port)? BT.serverConfig.port : 4020;
    this._activeServerConfig = { // useful for other bits in the manager
      host: hostname,
      port: port
    };
    var f = function(){
      me.onRequest.apply(me,arguments);
    };
    BT.http.createServer(f).on('error',function(err){
      if(err){
        if(err.code === "EOF"){
          SC.Logger.log("Error while trying to attach the server. Is the port perhaps taken?");
          BT.process.exit(1);
        }
        else {
          SC.Logger.log('Unknown error while trying to attach the server.');
          BT.process.exit(1);
        }
      }
    }).listen(port,hostname,function(){
      var url = BT.url.format({ protocol: 'http', hostname: hostname, port: port});
      SC.Logger.log("Server started on " + url);
      if(BT.process.mainModule && BT.process.mainModule.filename){
        processname += "[" + BT.path.basename(BT.process.mainModule.filename) + "]";
      }
      BT.process.title = processname;
      if(BT.serverConfig && BT.serverConfig.REPL){
        BT.repl.start("scbt>>").context.server = me;
      }
    });
  },

  onRequest: function(req,res){
    var path = BT.url.parse(req.url).pathname.slice(1);
    var hasServed = false;
    var appnames = Object.keys(this.apps);
    var i;
    //SC.Logger.log("http request for: " + path);
    if(path === ""){ // root index
      this.serverIndex(req,res);
      hasServed = true;
    }
    if(!hasServed){
      // now detection of app root
      i = appnames.indexOf(path);
      if(i > -1){
        var index = this.apps[appnames[i]].get('indexHtml');
        if(index){
          res.writeHead(200);
          res.write(index);
          res.end();
          hasServed = true;
        }
      }
    }
    if(!hasServed){
      appnames.forEach(function(a){
        if(hasServed) return;
        if(path.indexOf(a) === 0){
          var c = this.apps[a].fileFor(path);
          if(c){
            res.writeHead(200, {
              //'Content-Length': c.length,
              'Content-Type': c.mimeType
            });
            res.write(c.contents);
            res.end();
            hasServed = true;
          }
        }
      },this);
    }

    //

    if(!hasServed){
      res.writeHead(404);
      res.write("File not found");
      res.end();
    }
  },

  serverIndex: function(req,res){ // automated list of apps
    res.writeHead(200);
    var ret = [];
    ret.push("<p> The following apps are configured: </p>");
    ret.push('<ul>');
    Object.keys(this.apps).forEach(function(a){
      var url = "http://%@:%@/%@".fmt(this._activeServerConfig.host,this._activeServerConfig.port,a);
      ret.push('<li><a href="%@">%@</a></p></li>'.fmt(url,a));
    },this);
    ret.push('</ul>');
    res.write(ret.join("\n"));
    res.end();
  },

  addApp: function(app){
    var appname = app.get('name');
    if(!appname) throw new Error("An app should always carry a name!");
    SC.Logger.log("Adding app %@".fmt(appname));
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
  },

  _fileClasses: null,

  registerFileClass: function(ext,klass){
    this._fileClasses[ext] = klass;
  },

  fileClassFor: function(ext){
    return this._fileClasses[ext];
  }
});