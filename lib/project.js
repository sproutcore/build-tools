/*globals BT*/

BT.projectManager = SC.Object.create({
  apps: null,

  fwclasses: null,

  projectPath: null, // this is where the path to the project dir will be set by the loading process

  init: function () {
    this.apps = {};
    this.fwclasses = {};
    this.watchers = {};
    this.fileClasses = {};
    this.themeClasses = {};
  },

  startServer: function () {
    SC.Logger.log("Starting development server...");
    //SC.Benchmark.start('BT_startup');
    //return;
    var me = this,
        http = require('http'),
        url = require('url'),
        path = require('path'),
        processname = "SproutCore BuildTools",
        hostname = (BT.serverConfig && BT.serverConfig.host) ? BT.serverConfig.host : 'localhost',
        port = (BT.serverConfig && BT.serverConfig.port) ? BT.serverConfig.port : 4020;

    this._activeServerConfig = { // useful for other bits in the manager
      host: hostname,
      port: port
    };
    var f = function () {
      SC.RunLoop.begin();
      me.onRequest.apply(me, arguments);
      SC.RunLoop.end();
    };
    http.createServer(f).on('error', function (err) {
      if (err) {
        if (err.code === "EOF") {
          SC.Logger.log("Error while trying to attach the server. Is the port perhaps taken?");
          process.exit(1);
        }
        else {
          SC.Logger.log('Unknown error while trying to attach the server.');
          process.exit(1);
        }
      }
    }).listen(port, hostname, function () {
      var serverUrl = url.format({ protocol: 'http', hostname: hostname, port: port});
      SC.Logger.log("Server started on " + serverUrl);
      //SC.Benchmark.end('BT_startup');
      if (process.mainModule && process.mainModule.filename) {
        processname += "[" + path.basename(process.mainModule.filename) + "]";
      }
      process.title = processname;
      // perhaps later
      // if(BT.serverConfig && BT.serverConfig.REPL){
      //   BT.repl.start("scbt>>").context.server = me;
      // }
      if (BT.debugServer) {
        // write out all the files out in a tmpdebug folder
        SC.Logger.log("BT.debugServer, writing out files");
        var tmpdebug = me._mkdir("tmpdebug",BT.projectPath);
        var pathlib = require('path');
        var fslib = require('fs');
        Object.keys(me.apps).forEach( function (appname) {
          var appdebug = me._mkdir(appname, tmpdebug);
          var fws = me.apps[appname]._fws;
          //var appfiles = me.apps[appname]._fws.getEach('files').flatten();
          var appfiles = fws.getEach('scripts').concat(fws.getEach('stylesheets')).concat(fws.getEach('resources')).flatten();
          // the line above needs to be able to also pick up the combined files...
          appfiles.forEach(function (f) {
            if (!f) return;
            var relpath = f.get('relativePath');
            SC.Logger.log("relpath: " + relpath);
            me._mkdir(pathlib.dirname(relpath), appdebug);
            fslib.writeFileSync(pathlib.join(appdebug, relpath), f.get('content'));
          }, this);
          // write out index
          fslib.writeFileSync(pathlib.join(appdebug, "index.html"), me.apps[appname].get('indexHtml'));
        }, this);
        SC.Logger.log("done writing files...");
      }
    });
  },

  // function to recursively create dirs
  _mkdir: function (dir, baseDir) {
    var pathlib = require('path');
    var fslib = require('fs');
    if (!dir) return;
    var wdir = baseDir;
    dir.split(pathlib.sep).forEach(function (subdir) {
      var d = pathlib.join(wdir, subdir);
      try {
        fslib.mkdirSync(d);
      }
      catch (e) {
        if (e.code !== 'EEXIST') {
          throw e;
        }
      }
      wdir = pathlib.join(wdir, subdir);
    });
    return wdir;
  },


  onRequest: function (req, res) {
    var urllib = require('url');
    var path = urllib.parse(req.url).pathname.slice(1);
    var hasServed = false;
    var appnames = Object.keys(this.apps);
    var i;
    //SC.Logger.log("http request for: " + path);
    if (path === "") { // root index
      this.serverIndex(req, res);
      hasServed = true;
    }
    if (!hasServed) {
      // now detection of app root
      i = appnames.indexOf(path);
      if (i > -1) {
        var index = this.apps[appnames[i]].get('indexHtml');
        if (index) {
          res.writeHead(200);
          res.write(index);
          res.end();
          hasServed = true;
        }
      }
    }
    if (!hasServed) {
      appnames.forEach(function (a) {
        if (hasServed) return;
        if (path.indexOf(a) === 0) {
          var c = this.apps[a].fileFor(path);
          if (c) {
            res.writeHead(200, {
              //'Content-Length': c.length,
              'Content-Type': c.get('contentType')
            });
            var content = c.get('content');
            if (!content) {
              SC.Logger.log("file %@ doesn't have content?".fmt(c.get('path')));
              res.write("");
            }
            else res.write(content);
            // res.write(c.get('content'));
            res.end();
            hasServed = true;
          }
        }
      }, this);
    }

    //

    if (!hasServed) {
      res.writeHead(404);
      res.write("File not found");
      res.end();
    }
  },

  serverIndex: function (req, res) { // automated list of apps
    res.writeHead(200);
    var ret = [];
    ret.push("<p> The following apps are configured: </p>");
    ret.push('<ul>');
    Object.keys(this.apps).forEach(function (a) {
      var url = "http://%@:%@/%@".fmt(this._activeServerConfig.host, this._activeServerConfig.port, a);
      ret.push('<li><a href="%@">%@</a></p></li>'.fmt(url, a));
    }, this);
    ret.push('</ul>');
    res.write(ret.join("\n"));
    res.end();
  },

  addApp: function (app) {
    var appname = app.get('name');
    if (!appname) throw new Error("An app should always carry a name!");
    SC.Logger.log("Adding app %@".fmt(appname));
    if (!this.apps[appname]) this.apps[appname] = app;
  },

  addFramework: function (fwclass) {
    //if(!this.fwclasses) this.fwclasses = SC.Set.create();
    var fwref = fwclass.prototype.ref;
    //BT.util.log('registering fw: ' + fwref);
    this.fwclasses[fwref] = fwclass;
    //BT.util.log('keys in fwcache: ' + BT.util.inspect(Object.keys(this.fwclasses)));
  },

  // the watcher is on the project manager to prevent multiple framework instances declaring watchers on the same
  // files. We only want one watcher, and we will figure out ourselves which fw instance should be called
  addWatch: function (watchpatterns, target) {

    if (!target) {
      throw new Error("BT.projectManager#addWatch: Trying to add a watcher without a target!");
    }

    this._watcher.add(watchpatterns); // gaze (the watcher) will make the patterns unique
    if (SC.typeOf(watchpatterns) === SC.T_STRING) {
      watchpatterns = [watchpatterns];
    }
    watchpatterns.forEach(function (p) {
      // find ref
      var r = this._watchPatterns.findProperty('pattern', p);
      if (!r) { // create ref
        this._watchPatterns.push({
          pattern: p,
          targets: [target]
        });
      }
      else {
        // double check whether target already exists
        if (r.targets.indexOf(target) === -1) {
          r.targets.push(target);
        }
      }
    }, this);
  },

  _watcherDidFire: function (event, filepath) {
    // use BT.minimatch to figure out which fw instances to call
    this._watchPatterns.forEach(function (p) {
      if (BT.minimatch(p.pattern, filepath)) {
        p.targets.forEach(function (t) {
          t.target.fileHasChanged(filepath); // let invokeOnce be done by the framework
        });
      }
    });
  },

  getFrameworkClass: function (fwref) {
    var pathlib = require('path');
    //BT.util.log('trying to find class for ' + fwref);
    var ret = this.fwclasses[fwref];
    if (!ret) { // try to actively locate the fw
      //BT.util.log('class not found, actively locating...');
      var relref = BT._resolveReference(fwref, "framework");

      // essentially there are two locations for frameworks: globally (inside here)
      // or inside the project dir. BT._resolveReference will return a relative url
      // so we have to prepend it with the current projDir
      var d = pathlib.join(BT.projectPath, relref, "sc_config");
      //var d = pathlib.join(relref,"sc_config");

      //SC.Logger.log("trying to runConfig: " + d);
      var loadresult = sc_require(d);
      if (loadresult.isError && loadresult.code === "ENOENT") {
        // try to load from here:
        d = pathlib.join(BT.btPath, relref, "sc_config");
        loadresult = sc_require(d);
        if (loadresult.isError) throw loadresult;
      }
      else if (loadresult.isError) throw loadresult;
      //BT.runConfig(d); // should auto-register
      // try {
      //   sc_require(d);
      // }
      // catch(e){
      //   if(e.code === 'ENOENT'){ // code not found, try inside here...

      //   }
      // }

      ret = this.fwclasses[fwref]; // should now contain the fw
    }
    else {
      //BT.util.log('class found...');
    }
    return ret;
  },

  fileClasses: null,

  registerFileClass: function (ext, klass) {
    this.fileClasses[ext] = klass;
  },

  fileClassFor: function (ext) {
    return this.fileClasses[ext];
  },

  extensions: function () {
    return Object.keys(this.fileClasses);
  }.property(),

  scriptExtensions: function () {
    var ret = [];
    Object.keys(this.fileClasses).forEach(function (ext) {
      if (this.fileClasses[ext].isScript) ret.push(ext);
    });
    return ret;
  }.property(),

  stylesheetExtensions: function () {
    var ret = [];
    Object.keys(this.fileClasses).forEach(function (ext) {
      if (this.fileClasses[ext].isStylesheet) ret.push(ext);
    });
    return ret;
  }.property(),

  resourceExtensions: function () {
    var ret = [];
    Object.keys(this.fileClasses).forEach(function (ext) {
      if (this.fileClasses[ext].isResource) ret.push(ext);
    });
    return ret;
  }.property(),

  addTheme: function (k) {
    var ref = k.prototype.ref;
    this.themeClasses[ref] = k;
  },

  getThemeClass: function (ref) {
    var pathlib = require('path');
    var ret = this.themeClasses[ref];
    if (!ret) { // try to actively locate the fw
      var relref = BT._resolveReference(ref, "theme");

      // essentially there are two locations for themes: globally (inside here)
      // or inside the project dir. BT._resolveReference will return a relative url
      // so we have to prepend it with the current projDir
      var d = pathlib.join(BT.projectPath, relref, "sc_config");

      SC.Logger.log("trying to runConfig: " + d);
      var loadresult = sc_require(d);
      if (loadresult.isError && loadresult.code === "ENOENT") {
        // try to load from here:
        d = pathlib.join(BT.btPath, ref, "sc_config");
        loadresult = sc_require(d);
        if (loadresult.isError) throw loadresult;
      }
      else if (loadresult.isError) throw loadresult;
      ret = this.themeClasses[ref]; // should now contain the fw
    }
    return ret;
  }
});