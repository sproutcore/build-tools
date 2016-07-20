/*globals BT*/

BT = SC.Object.create({

  VERSION: "0.0.1",

  P_WIN32: "win32",

  PLATFORM: require('os').platform(),

  // ..........................................................
  // RUN MODES
  //

  RM_DEBUG: "debug",

  RM_BUILD: "build",


  // ..........................................................
  // COMBINE MODES
  //

  /**
    Combine all css and js into single files

    @type String
    @constant
    @static
  */
  COMBINE_FWS_ALL: "combineAllFrameworks",

  /**
    Combine only wrapper frameworks, rest separate

    @type String
    @constant
    @static
  */
  COMBINE_FWS_WRAPPER: "combineWrapperFrameworks",

  /**
    Combine sproutcore in one, the app and the rest in another

    @type String
    @constant
    @static
  */
  COMBINE_FWS_APPSUPP_SPROUTCORE: "combineAppSproutCore",

  /**
    No combining on app level

    @type String
    @constant
    @static
  */
  COMBINE_FWS_NONE: "combineNone",


  // ..........................................................
  // PRIVATE
  //

  /**
    @private
  */
  LANGUAGE_MAP: {
    en: ['english', 'en_US'],
    fr: ['french', 'fr_FR'],
    de: ['german', 'de_DE'],
    ja: ['japanese', 'ja_JA'],
    es: ['spanish', 'es_ES'],
    it: ['italian', 'it_IT']
  },

  path2Url: function (path) {
    if (BT.PLATFORM === BT.P_WIN32) {
      return path.replace(/\\/g, "/");
    }
    return path;
  },

  url2Path: function (url) {
    if (BT.PLATFORM === BT.P_WIN32) {
      return url.replace(/\//g, "\\");
    }
    return url;
  },

  url2x2: function (url) {
    var p = url.split('.'),
      ext = p[p.length - 1];
    return p.slice(0, p.length - 1) + '@2x.' + ext;
  },

  /**
    1. "sproutcore": depending on the context this is either an app, a framework or a module in the root of the project
    2. "sproutcore:desktop": this is the subframework desktop inside the sproutcore framework
    3. "sproutcore/lib/index.html": this is a reference to the file lib/index.html inside the sproutcore framework
    4. "http://my.host.ext": a url, is taken literally

    @param {String} context is one of "app","framework","module"
  */
  _resolveReference: function (ref, context) {
    var prefix, p, pathlib = require('path'), ret;
    if (context === "app") {
      prefix = "apps";
    } else if (context === "framework") {
      prefix = "frameworks";
    } else if (context === "module") {
      prefix = "modules";
    } else if (context === "theme") {
      prefix = "themes";
    }
    if (ref.indexOf("http") > -1) {
      ret = ref; // don't do anything
    } else if (ref.indexOf(":") > -1) {
      p = ref.replace(/\:/g, pathlib.sep + "frameworks" + pathlib.sep);
      ret = pathlib.join(prefix, p);
    }
    else ret = pathlib.join(prefix, ref);
    if (BT.PLATFORM === BT.P_WIN32) {
      ret = BT.path2Url(ret);
    }
    return ret;
  },

  addApp: function (ref) {
    var app;
    if (SC.typeOf(ref) === SC.T_STRING) {
      app = BT.AppBuilder.create({
        path: 'apps/' + ref
      });
    }
    else {
      app = ref;
    }
    BT.projectManager.addApp(app);
  },

  addFramework: function (fw) {
    BT.projectManager.addFramework(fw);
  },

  addTheme: function (t) {
    BT.projectManager.addTheme(t);
  },

  fileExist: function (path) {
    var fslib = require('fs');

    try {
      var stat = fslib.statSync(path);
      return stat.isFile();
    } catch (e) {
      return false;
    }
  },

  mkdir: function (dir, baseDir) {
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

  languageFor: function (lang) {
    if (BT.LANGUAGE_MAP[lang]) return lang;
    else {
      for (var l in BT.LANGUAGE_MAP) {
        var langs = BT.LANGUAGE_MAP[l];
        if (langs.contains(lang)) return l;
      }
    }
    throw new Error("Could not find the language for '" + lang + "'.");
  },

  runningTime: function () {
    var seconds = (Date.now() - BT.startTime) / 1000,
      minutes = Math.floor(seconds / 60);

    seconds = Math.floor(seconds % 60);
    return "%@ minutes %@ secs".fmt(minutes, seconds);
  }.property(),

});
