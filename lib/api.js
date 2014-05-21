/*jshint node:true*/
/*globals BT */

BT.P_WIN32 = "win32";
BT.PLATFORM = require('os').platform();
BT.RM_DEBUG = "debug";
BT.RM_BUILD = "build";

// these are the combine modes
BT.COMBINE_FWS_ALL = "combineAllFrameworks"; // combine all css and js into single files
BT.COMBINE_FWS_WRAPPER = "combineWrapperFrameworks", // combine only wrapper frameworks, rest separate
BT.COMBINE_FWS_APPSUPP_SPROUTCORE = "combineAppSproutCore", // combine sproutcore in one, the app and the rest in another
BT.COMBINE_FWS_NONE = "combineNone"; // no combining on app level

// very useful as
BT.path2Url = function (path) {
  if (BT.PLATFORM === BT.P_WIN32) {
    return path.replace(/\\/g, "/");
  }
  return path;
};

BT.url2Path = function (url) {
  if (BT.PLATFORM === BT.P_WIN32) {
    return url.replace(/\//g, "\\");
  }
  return url;
};

BT._resolveReference = function (ref, context) {
//  1. "sproutcore": depending on the context this is either an app, a framework or a module in the root of the project
//  2. "sproutcore:desktop": this is the subframework desktop inside the sproutcore framework
//  3. "sproutcore/lib/index.html": this is a reference to the file lib/index.html inside the sproutcore framework
//  4. "http://my.host.ext": a url, is taken literally
  //context is one of "app","framework","module"
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
};


BT.addApp = function (ref) {
  // add a ref
  //
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
};

BT.addFramework = function (fw) {
  BT.projectManager.addFramework(fw);
};

BT.addTheme = function (t) {
  BT.projectManager.addTheme(t);
};

BT.mkdir = function (dir, baseDir) {
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
};
