/*jshint node:true*/
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
    if (BT.runBenchmarks) SC.Benchmark.start('BT_startup');
    //return;
    var me = this,
        http = require('http'),
        url = require('url'),
        path = require('path'),
        processname = "SproutCore BuildTools",
        hostname = (BT.serverConfig && BT.serverConfig.host) ? BT.serverConfig.host : 'localhost',
        port = (BT.serverConfig && BT.serverConfig.port) ? BT.serverConfig.port : 4020,
        proxyConf;

    if (BT.serverConfig && BT.serverConfig.proxies){
      //SC.Logger.log("proxy config found");
      if (SC.typeOf(BT.serverConfig.proxies === SC.T_ARRAY)) {
        //SC.Logger.log("array found");
        proxyConf = BT.serverConfig.proxies;
      } else if (SC.typeOf(BT.serverConfig.proxies === SC.T_HASH)) {
        //SC.Logger.log("hash found");
        proxyConf = [BT.serverConfig.proxies];
      }
      else {
        throw new Error("Invalid proxy config...");
      }
    }

    if (proxyConf) {
      //SC.Logger.log("creating proxies");
      this._proxies = [];
      proxyConf.forEach( function(p) {
        //SC.Logger.log("feeding proxy: " + require('util').inspect(p));
        this._proxies.push(BT.Proxy.create(p));
      }, this);
      //this._proxies = proxyConf.map(BT.Proxy.create);
    }

    if (BT.serverConfig && BT.serverConfig.localOnly === false) hostname = null;
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
      if (BT.runBenchmarks) {
        SC.Benchmark.end('BT_startup');
        SC.Logger.log(SC.Benchmark.report());
      }
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
        var tmpdebug = BT.mkdir("tmpdebug", BT.projectPath);
        var pathlib = require('path');
        var fslib = require('fs');
        Object.keys(me.apps).forEach(function (appname) {
          var appdebug = BT.mkdir(appname, tmpdebug);
          var fws = me.apps[appname]._fws;
          //var appfiles = me.apps[appname]._fws.getEach('files').flatten();
          var appfiles = fws.getEach('scripts').concat(fws.getEach('stylesheets')).concat(fws.getEach('resources')).flatten();
          // the line above needs to be able to also pick up the combined files...
          appfiles.forEach(function (f) {
            if (!f) return;
            var relpath = f.get('relativePath');
            SC.Logger.log("relpath: " + relpath);
            BT.mkdir(pathlib.dirname(relpath), appdebug);
            fslib.writeFileSync(pathlib.join(appdebug, relpath), f.get('content'));
          }, this);
          // write out index
          fslib.writeFileSync(pathlib.join(appdebug, "index.html"), me.apps[appname].get('indexHtml'));
        }, this);
        SC.Logger.log("done writing files...");
      }
    });
  },

  startBuild: function (opts) {
    this.set('_buildOpts', opts);
    if (BT.runBenchmarks) SC.Benchmark.start("build");
    this.invokeNext('_startBuild'); // we need to wait a bit before everything is parsed...
  },

  _buildOpts: null,

  _startBuild: function () {
    // will save all apps, unless the app specifically indicates not wanting to be saved.
    // The main issue with saving is that there will need to be a few ways in which you'd want
    // to build, and in special cases even be able to provide your own build specification and / or procedure
    // The build task will get all the apps and retrieve all the files from it
    // for now only all apps

    // essentially we take all files from all apps, including the index.html
    // then we make sure every url is unique, which filters out any double files (in case of a central sproutcore or framework)
    // then we save everything to disk
    var apps;
    var opts = this._buildOpts;
    if (opts && opts.apps && opts.apps.length > 0) {
      apps = opts.apps.map(function (appname) { return this.apps[appname]; }, this);
    }
    else {
      apps = Object.keys(this.apps).map(function (appname) { return this.apps[appname]; }, this);
    }
    this.appsToBuild = apps;

    //whatever happens, we should only start after everything is in, so we check the files of the apps
    //and if not all files have a rawContent somehow, we are not going to build
    var unloadedFile = apps.getEach('files').flatten().findProperty('rawContent', null);
    if (unloadedFile) {
      SC.Logger.log("postponing save, the apps are not ready yet: " + unloadedFile.get('path'));
      this.invokeNext('_startBuild');
      return;
    }

    var allResources = [];
    apps.getEach('files').flatten().forEach(function (f) {
      allResources.push(f);
    });
    this.allResources = allResources;

    SC.Logger.log("Building apps " + apps.getEach('name'));

    this.buildLanguages = SC.Set.create();
    apps.forEach(function (app) {
      this.buildLanguages.addEach(app.get('languages'));
    }, this);

    this._startBuildLanguage();
  },

  _startBuildLanguage: function () {
    var language = this.buildLanguages.pop();
    if (!language) return this._endBuild();

    this.appsToBuild.forEach(function (app) {
      if (app.get('languages').contains(language)) {
        app.set('language', language);
      }
    });

    this.invokeNext('_doBuildLanguage');
  },

  _doBuildLanguage: function () {
    var apps = this.appsToBuild,
      files = [],
      allResources = this.allResources;

    apps.forEach(function (app) {
      files.push(BT.File.create({
        framework: app._appfw,
        isResource: true,
        relativePath: "index.html",
        content: app.get('indexHtml')
      }));

      if (app.get('addHtml5Manifest')) {
        files.push(BT.AppCacheFile.create({
          framework: app._appfw,
          app: app
        }));
      }
    });

    apps.getEach('buildFiles').flatten().forEach(function (f) {
      var fLang = f.get('language');
      if (fLang === 'any' || fLang === language) files.push(f);
    });

    SC.Logger.log("Calculating file contents");
    //SC.Logger.log("num files before filtering: " + files.get('length'));
    var urls = [];
    files = files.filter(function (f) {
      var url = f.get('url');
      if (!urls.contains(url)) {
        if (f.get('content') === "") return false;
        urls.push(url);
        return true;
      }
    });

    SC.Logger.log("num files after filtering: " + files.get('length'));
    //files = files.uniqueProperty('url'); // filter based on uniqueness... uniqueProperty doesn't exist...
    // save files :)
    SC.Logger.log("Saving files...");
    var pathlib = require('path');
    var fslib = require('fs');
    BT.mkdir("build", BT.projectPath);
    var basepath = pathlib.join(BT.projectPath, "build");
    files.forEach(function (file, i) {
      var urlPath = BT.url2Path(file.get('url'));
      var p = pathlib.join(basepath, urlPath);
      BT.mkdir(pathlib.dirname(urlPath), basepath);
      SC.Logger.log("About to save %@".fmt(file.get('url')));
      fslib.writeFileSync(p, file.get('content'));

      var resourceDeps = file.get('resourceDependencies');
      if (resourceDeps && resourceDeps.get('length') > 0) {
        resourceDeps.forEach(function(depurl) {
          var deppath = allResources.findProperty('url', depurl).get('path')
          BT.mkdir(pathlib.dirname(depurl), basepath);
          
          if (fslib.statSync(deppath).isFile()) {
            fslib.writeFileSync(pathlib.join(basepath, depurl), fslib.readFileSync(deppath));
          }
          else {
            SC.Logger.log("the file %@ doesn't exist".fmt(deppath));
          }
        }, this);
      }
      SC.Logger.log("saved file %@ of %@".fmt(i, files.length));
      //SC.Logger.log("File %@ written to %@".fmt(file.get('url'), p));
    }, this);

    this._startBuildLanguage();
  },

  _endBuild: function () {
    SC.Logger.log("done...");
    // throw new Error("QUIT"); // seems
    if (BT.runBenchmarks) {
      SC.Benchmark.end("build");
      SC.Logger.log(SC.Benchmark.report());
    }
    process.exit(0);
  },

  targets: function () {
    // let's do this differenty, and just for the framework classes ourselves
    //this._fakeApp = BT{ name: "", _fws: [] };
    var appnames = Object.keys(this.apps);
    // make sure that test runner is first
    if (appnames.contains("sproutcore/tests")) {
      appnames.sort(function (f, s) {
        if (f === "sproutcore/test") return -1;
        else return 1;
      });
    }
    var apps = appnames.map(function (a) { return this.apps[a]; }, this);
    var targets = [];
    apps.forEach(function (app) {
      app._allFws.forEach(function (fw) {
        var t = fw.get('targets');
        if (targets.findProperty('name', t.name)) return; // don't do a thing if already exists
        targets.push(t);
        if (fw.isWrapperFramework) { //
          t.parent = "";
          // we can assume here all the deps have passed now
          targets.forEach(function (tg) {
            if (tg !== t && tg.name !== t.name && tg.name.indexOf(t.name) > -1 && !tg.parent) {
              tg.parent = t.name;
            }
          });
        }
      });
      targets.push(app.get('targets'));
    });
    return JSON.stringify(targets);
    //return JSON.stringify(apps.getEach('targets').flatten());

  }.property(),

  onRequest: function (req, res) {
    var urllib = require('url');
    //var path = urllib.parse(req.url).pathname.slice(1);
    var path = urllib.parse(req.url).pathname;
    var hasServed = false;
    var appnames = Object.keys(this.apps);
    var i;
    //SC.Logger.log("http request for: " + path);
    if (path === "/") { // root index
      this.serverIndex(req, res);
      hasServed = true;
    }
    if (!hasServed) {
      // now detection of app root
      i = appnames.indexOf(path.slice(1));
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
      if (path === "/sc/targets.json") { // specific to show all targets in this system
        res.writeHead(200, {
          'Content-Type': "application/json"
        });
        res.write(this.get('targets') || "");
        res.end();
        hasServed = true;
      }
    }
    if (!hasServed) {
      appnames.forEach(function (a) {
        if (hasServed) return;
        if (path.slice(1).indexOf(a) === 0) {
          var c = this.apps[a].fileFor(path);
          if (c) {
            res.writeHead(200, {
              //'Content-Length': c.length,
              'Content-Type': c.get('contentType')
            });
            var content = c.get('content');
            if (!content) {
              //SC.Logger.log("file %@ doesn't have content?".fmt(c.get('path')));
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
    if (!hasServed && this._proxies) {
      // try one by one
      var hasProxied = false;
      this._proxies.forEach(function (proxy) {
        if (!hasProxied) {
          hasProxied = proxy.process(req, res);
        }
      });
      if (hasProxied) hasServed = true;
    }
    if (!hasServed) {
      res.writeHead(404);
      res.write("File not found");
      res.end();
    }
  },

  serverIndex: function (req, res) { // automated list of apps
    // delay the index with a bit
    var ret = [];
    ret.push("<p> The following apps are configured: </p>");
    ret.push('<ul>');
    Object.keys(this.apps).forEach(function (a) {
      var url = "http://%@:%@/%@".fmt(this._activeServerConfig.host, this._activeServerConfig.port, a);
      ret.push('<li><a href="%@">%@</a></p></li>'.fmt(url, a));
    }, this);
    ret.push('</ul>');
    // we have to slow down the index page, because of the SC.Request test which uses the root to test
    // timeout responses on. Problem is that the response is sufficiently fast to make the tests fail
    // even when defining a timeout of 1ms in SC.Request.
    setTimeout(function () {
      res.writeHead(200);
      res.write(ret.join("\n"));
      res.end();
    }, 10);
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

  getFrameworkClass: function (fwref) {
    var pathlib = require('path');
    //SC.Logger.log('trying to find class for ' + fwthis.gsub(filecontent, INCLUDE, 'replacer'););
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
      //SC.Logger.log("loadresult: " + require('util').inspect(loadresult));
      if (!SC.ok(loadresult) && loadresult.code === "ENOENT") {
        //SC.Logger.log("not present in project, trying to load from global folder");
        // try to load from here:
        d = pathlib.join(BT.btPath, relref, "sc_config");
        loadresult = sc_require(d);
        if (loadresult.isError) {
          throw loadresult;
        }
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