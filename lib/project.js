/*jshint node:true*/
/*globals BT*/

BT.projectManager = SC.Object.create({
  apps: null,

  appsUrls: null,

  fwclasses: null,

  projectPath: null, // this is where the path to the project dir will be set by the loading process

  init: function () {
    this.apps = {};
    this.appsUrls = {};
    this.fwclasses = {};
    this.watchers = {};
    this.fileClasses = {};
    this.themeClasses = {};
  },

  startServer: function () {
    BT.Logger.info("Starting development server...");
    if (BT.runBenchmarks) SC.Benchmark.end('sc_config_load');
    //return;
    var me = this,
        http = require('http'),
        url = require('url'),
        path = require('path'),
        ips = [],
        processname = "SproutCore BuildTools",
        hostname = (BT.serverConfig && BT.serverConfig.host) ? BT.serverConfig.host : 'localhost',
        port = (BT.serverConfig && BT.serverConfig.port) ? BT.serverConfig.port : 4020,
        proxyConf;

    if (BT.serverConfig && BT.serverConfig.proxies) {
      BT.Logger.info("Proxy config found");
      if (SC.typeOf(BT.serverConfig.proxies === SC.T_ARRAY)) {
        BT.Logger.debug("Proxy array found");
        proxyConf = BT.serverConfig.proxies;
      } else if (SC.typeOf(BT.serverConfig.proxies === SC.T_HASH)) {
        BT.Logger.debug("Proxy hash found");
        proxyConf = [BT.serverConfig.proxies];
      }
      else {
        BT.Logger.error("Invalid proxy config...");
      }
    }

    if (proxyConf) {
      BT.Logger.info("Creating proxies");
      this._proxies = [];
      proxyConf.forEach(function (p) {
        BT.Logger.debug("Feeding proxy: " + require('util').inspect(p));
        this._proxies.push(BT.Proxy.create(p));
      }, this);
      //this._proxies = proxyConf.map(BT.Proxy.create);
    }

    if (BT.serverConfig && !BT.serverConfig.localOnly) {
      var interfaces = require('os').networkInterfaces();
      Object.keys(interfaces).forEach(function (k) {
        interfaces[k].forEach(function (address) {
          if (address.family === 'IPv4' && !address.internal) {
            ips.push(address.address);
          }
        });
      });
      ips = ips.join(", ");
      hostname = null;
    }
    this._activeServerConfig = { // useful for other bits in the manager
      host: hostname || 'localhost',
      port: port
    };
    var f = function () {
      SC.RunLoop.begin();
      me.onRequest.apply(me, arguments);
      SC.RunLoop.end();
    };
    var server = http.createServer(f).on('error', function (err) {
      if (err) {
        if (err.code === "EOF") {
          BT.Logger.error("Error while trying to attach the server. Is the port perhaps taken?");
          process.exit(1);
        }
        else {
          BT.Logger.error('Unknown error while trying to attach the server.');
          process.exit(1);
        }
      }
    }).listen(port, hostname, function () {
      var serverUrl = url.format({ protocol: 'http', hostname: hostname || "*", port: port});
      if (ips && ips.length > 0) {
        serverUrl += ", ips: " + ips;
      }
      BT.Logger.debug("Server started in %@".fmt(BT.get('runningTime')));
      BT.Logger.info("Server started on " + serverUrl);
      if (BT.runBenchmarks) {
        SC.Benchmark.end('BT_startup');
        BT.Logger.log(SC.Benchmark.report());
      }
      if (process.mainModule && process.mainModule.filename) {
        processname += "[" + path.basename(process.mainModule.filename) + "]";
      }
      process.title = processname;
      // perhaps later
      // if(BT.serverConfig && BT.serverConfig.REPL){
      //   BT.repl.start("scbt>>").context.server = me;
      // }
      if (BT.outputFiles) {
        var outputPath = BT.outputFiles;
        if (SC.typeOf(outputPath) !== SC.T_STRING) outputPath = 'debug_output';
        outputPath = BT.mkdir(outputPath, outputPath[0] !== '/' ? BT.projectPath : '');

        // write out all the files out in a outputPath folder
        BT.Logger.info("Writing out files to '%@'".fmt(outputPath));

        var pathlib = require('path');
        var fslib = require('fs');
        Object.keys(me.apps).forEach(function (appname) {
          var appdebug = BT.mkdir(appname, outputPath);
          var fws = me.apps[appname]._fws;
          //var appfiles = me.apps[appname]._fws.getEach('files').flatten();
          var appfiles = fws.getEach('scripts').concat(fws.getEach('stylesheets')).concat(fws.getEach('resources')).flatten();
          // the line above needs to be able to also pick up the combined files...
          appfiles.forEach(function (f) {
            if (!f) return;
            var relpath = f.get('relativePath');
            BT.Logger.debug("Writing out file '%@'".fmt(relpath));
            BT.mkdir(pathlib.dirname(relpath), appdebug);
            fslib.writeFileSync(pathlib.join(appdebug, relpath), f.get('content'));
          }, this);
          // write out index
          fslib.writeFileSync(pathlib.join(appdebug, "index.html"), me.apps[appname].getPath('indexHtmlFile.content'));
        }, this);
        BT.Logger.debug("done writing files...");
      }
    });
    if (!(BT.serverConfig && BT.serverConfig.noSocket || BT.noSocket)) { // only disable when no socket is wanted
      BT.socketManager = BT.SocketIO.create({ httpServer: server });
    }
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
    var apps = [];
    var opts = this._buildOpts;
    if (opts && opts.apps && opts.apps.length > 0) {
      opts.apps.forEach(function (appname) {
        var app = this.apps[appname];
        if (!app) BT.Logger.warn("Could not find app '%@'".fmt(appname));
        else {
          apps.push(app);
        }
      }, this);
    }
    else {
      apps = Object.keys(this.apps).map(function (appname) { return this.apps[appname]; }, this);
    }

    if (apps.length === 0) {
      BT.Logger.warn("No apps found with this name");
      process.exit(1);
    }
    //whatever happens, we should only start after everything is in, so we check the files of the apps
    //and if not all files have a rawContent somehow, we are not going to build
    var unloadedFile = apps.getEach('files').flatten().findProperty('rawContent', null);
    if (unloadedFile) {
      BT.Logger.warn("Postponing save, the apps are not ready yet: " + unloadedFile.get('path'));
      this.invokeNext('_startBuild');
      return;
    }

    BT.Logger.info("Building %@ app(s): %@".fmt(apps.get('length'), apps.getEach('name')));

    this.appsLanguagesToBuild = [];

    apps.forEach(function (app) {
      app.get('languagesToBuild').forEach(function (language) {
        this.appsLanguagesToBuild.push({ app: app, language: language });
      }, this);
    }, this);

    this._startBuildAppLanguage();
  },

  _startBuildAppLanguage: function () {
    BT.Logger.debug("_startBuildAppLanguage");
    var appLanguage = this.buildAppLanguage = this.appsLanguagesToBuild.shift();
    if (!appLanguage) return this._endBuild();

    var app = this.appToBuild = appLanguage.app;
    app.set('language', appLanguage.language);

    this.invokeNext('_doBuildAppLanguage');
  },

  _doBuildAppLanguage: function () {
    var app = this.appToBuild,
      language = app.get('language'),
      files = [],
      allResources = [];

    BT.Logger.debug("Start '%@' app build for '%@' language".fmt(app.get("name"), language));

    app.get('files').flatten().forEach(function (f) {
      allResources.push(f);
    });
    BT.Logger.trace("Did push allResources");

    files.push(app.get('indexHtmlFile'));
    BT.Logger.trace("Did add index.html");

    app.get('buildFiles').flatten().forEach(function (f) {
      var fLang = f.get('language');
      if (fLang === 'any' || fLang === language) files.push(f);
    });
    BT.Logger.debug("Did add buildFiles");

    BT.Logger.debug("Calculating file contents");
    BT.Logger.debug("File count before filtering: " + files.get('length'));
    var urls = [];
    files = files.filter(function (f) {
      var url = f.get('url');
      if (!urls.contains(url)) {
        if (f.get('content') === "") return false;
        urls.push(url);
        return true;
      }
    });
    BT.Logger.debug("File count after filtering: " + files.get('length'));
    //files = files.uniqueProperty('url'); // filter based on uniqueness... uniqueProperty doesn't exist...
    // save files :)
    BT.Logger.info("Saving '%@' files...".fmt(language));
    var pathlib = require('path');
    var fslib = require('fs');
    BT.mkdir(app.get('relativeBuildPath'), BT.projectPath);
    var basepath = pathlib.join(BT.projectPath, app.get('relativeBuildPath'));
    files.forEach(function (file, i) {
      var url = file.get('url');
      var urlPath = BT.url2Path(url);
      var p = pathlib.join(basepath, urlPath);

      if (fslib.existsSync(p) && url !== '/static/service_worker/service_worker.js') {
        BT.Logger.info("File (%@ of %@) %@ already written to %@".fmt(i+1, files.length, url, p));
        return;
      }

      BT.mkdir(pathlib.dirname(urlPath), basepath);
      BT.Logger.debug("About to save %@".fmt(file.get('url')));
      fslib.writeFileSync(p, file.parseContent({ lastStageInBuild: true }));
      if (file.get('has2x')) {
        //replaceInBuild
        //return this.parseContent({ x2: true });
        urlPath = BT.url2Path(file.get('url2x'));
        p = pathlib.join(basepath, urlPath);
        fslib.writeFileSync(p, file.parseContent({ lastStageInBuild: true, x2: true }));
      }

      var resourceDeps = file.get('resourceDependencies');
      if (resourceDeps && resourceDeps.get('length') > 0) {
        resourceDeps.forEach(function (dep) {
          var depPath = dep.get('path'),
            depUrl = dep.get('url');
          BT.mkdir(pathlib.dirname(depUrl), basepath);

          if (fslib.statSync(depPath).isFile()) {
            fslib.writeFileSync(pathlib.join(basepath, depUrl), fslib.readFileSync(depPath));
          }
          else {
            BT.Logger.error("The file %@ doesn't exist".fmt(depPath));
          }
        }, this);
      }
      BT.Logger.info("File (%@ of %@) %@ written to %@".fmt(i+1, files.length, file.get('url'), p));
    }, this);

    this._startBuildAppLanguage();
  },

  _endBuild: function () {
    BT.Logger.info("Build time %@".fmt(BT.get('runningTime')));

    if (BT.runBenchmarks) {
      SC.Benchmark.end("build");
      BT.Logger.log(SC.Benchmark.report());
    }
    if (!this._buildOpts.hasREPL) process.exit(0);
  },

  targets: function () {
    var appnames = Object.keys(this.apps);
    // make sure that test runner is first
    if (appnames.contains("sproutcore/tests")) {
      appnames.sort(function (f, s) {
        if (f === "sproutcore/tests") return -1;
        else return 1;
      });
    }
    var apps = appnames.map(function (a) { return this.apps[a]; }, this);
    var targets = [];
    apps.forEach(function (app) {
      app._allFws.forEach(function (fw) {
        if (fw.isApp) return; // don't add apps, they are already in...
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
    var appsUrls = this.appsUrls;
    var appurls = Object.keys(appsUrls);
    var i;
    BT.Logger.debug("http request for: " + path);
    if (path === "/") { // root index
      this.serverIndex(req, res);
      hasServed = true;
    }
    if (path === "/debug_broadcaster") {
      if (BT.socketManager && req.method == 'POST') {
        var body = '';
        req.on('data', function(data) { body += data; });
        req.on('end', function() { BT.socketManager.broadcast(body); });
      }
      hasServed = true;
    }
    if (!hasServed) {
      BT.Logger.trace(path + " is not an index, trying index file");
      // now detection of app root
      i = appurls.indexOf(path.slice(1));
      if (i > -1) {
        var index = appsUrls[appurls[i]].getPath('indexHtmlFile.content');
        if (index) {
          res.writeHead(200);
          res.write(index);
          res.end();
          hasServed = true;
        }
      }
    }
    if (!hasServed) {
      BT.Logger.trace(path + " is not an indexfile, trying targets.json");
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
      BT.Logger.trace(path + " is not targets.json, trying app file");
      appurls.forEach(function (a) {
        if (hasServed) return;
        if (path.slice(1).indexOf(a) === 0) {
          var c = appsUrls[a].fileFor(path);
          if (c) {
            res.writeHead(200, {
              //'Content-Length': c.length,
              'Content-Type': c.get('contentType')
            });
            var content = c.contentForPath(path);
            if (!content || (typeof content !== 'string' && !(content instanceof Buffer))) {
              BT.Logger.warn("file %@ doesn't have content?".fmt(c.get('path')));
              BT.Logger.debug(require('util').inspect(content));
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
      BT.Logger.trace(path + " is not app file, trying proxy");
      // try one by one
      var hasProxied = false;
      var numProxies = this._proxies.length;

      this._proxies.forEach(function (proxy) {
        BT.Logger.trace("trying path with proxy " + proxy.host + ":" + proxy.port);
        if (!hasProxied) {
          hasProxied = proxy.process(req, res);
          BT.Logger.trace("proxy " + proxy.host + ":" + proxy.port + " returns " + hasProxied);
        }
      });
      if (hasProxied) hasServed = true;
    }
    if (!hasServed) {
      BT.Logger.trace("nothing matches with " + path + " so, returning 404");
      res.writeHead(404);
      res.write("File not found");
      res.end();
    }
  },

  serverIndex: function (req, res) { // automated list of apps
    var ejs = require('ejs');
    var pathlib = require('path');
    var fslib = require('fs');
    var template = fslib.readFileSync(pathlib.join(BT.btPath, "templates", "server_index.ejs"));

    var ret = ejs.render(template.toString(), {
      BT: BT,
      apps: Object.keys(this.apps).map(function (appname) { return this.apps[appname]; }, this)
    });

    // we have to slow down the index page, because of the SC.Request test which uses the root to test
    // timeout responses on. Problem is that the response is sufficiently fast to make the tests fail
    // even when defining a timeout of 1ms in SC.Request.
    // res.writeHead(200);
    // res.write(ret.join("\n"));
    // res.end();
    setTimeout(function () {
      res.writeHead(200);
      res.write(ret);
      res.end();
    }, 15);
  },

  addApp: function (app) {
    var appname = app.get('name');
    if (!appname) throw new Error("An app should always carry a name!");
    BT.Logger.info("Adding app '%@'".fmt(appname));
    if (!this.apps[appname]) this.apps[appname] = app;
    var url = app.get('url');
    if (!this.appsUrls[url]) this.appsUrls[url] = app;
  },

  addFramework: function (fwclass) {
    //if(!this.fwclasses) this.fwclasses = SC.Set.create();
    var fwref = fwclass.prototype.ref;
    BT.Logger.trace('registering framework: ' + fwref + " from " + fwclass.prototype.path);
    this.fwclasses[fwref] = fwclass;
    //BT.Logger.debug('keys in fwcache: ' + BT.util.inspect(Object.keys(this.fwclasses)));
  },

  getFrameworkClass: function (fwref) {
    var pathlib = require('path');
    BT.Logger.traceGroup('trying to find class for ' + fwref);
    var ret = this.fwclasses[fwref];
    if (!ret) { // try to actively locate the fw
      BT.Logger.trace('class not found, actively locating...');
      var relref = BT._resolveReference(fwref, "framework");

      // essentially there are two locations for frameworks: globally (inside here)
      // or inside the project dir. BT._resolveReference will return a relative url
      // so we have to prepend it with the current projDir
      var d = pathlib.join(BT.projectPath, relref, "sc_config");
      //var d = pathlib.join(relref,"sc_config");

      BT.Logger.trace("trying to runConfig: " + d);
      var loadresult = sc_require(d);
      BT.Logger.trace("loadresult: " + require('util').inspect(loadresult));
      if (!SC.ok(loadresult) && loadresult.code === "ENOENT") {
        BT.Logger.trace("not present in project, trying to load from global folder");
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
      BT.Logger.trace('class found...');
    }
    BT.Logger.traceGroupEnd();
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

  templateExtensions: function () {
    var ret = [];
    Object.keys(this.fileClasses).forEach(function (ext) {
      if (this.fileClasses[ext].isTemplate) ret.push(ext);
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

      BT.Logger.info("trying to runConfig: " + d);
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
