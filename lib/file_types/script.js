/*global BT */
BT.ScriptFile = BT.File.extend({
  extension: "js",
  isScript: true,
  order: null, // this is where the framework will store the order of this file
  contentType: 'application/javascript',

  _replaceScSuper: function (str) {
    if (/sc_super\(\s*[^\)\s]+\s*\)/.test(str)) {
      SC.Logger.log("ERROR in %@:  sc_super() should not be called with arguments. Modify the arguments array instead.".fmt(this.get('path')));
    }
    if (str && str.replace) {
      return str.replace(/sc_super\(\)/g, 'arguments.callee.base.apply(this,arguments)');
    }
  },

  // yes, sadly this is (almost entirely) duplication of code, as it is also in css.js.
  // difference is that in scripts we just replace it by a string
  handleStatic: function (css) {
    // replace sc_static or static_url with the actual url
    var scstaticRegex = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+?)['\"]\\s*\\)");
    //match[3] contains the filename
    //
    var staticFound = css.search(scstaticRegex) >= 0;
    if (!staticFound) return css; // not found, don't do a thing

    var pathlib = require('path');
    var fw = this.get('framework');
    var app = fw.get('belongsTo');
    var lines = css.split("\n");
    var ret = [];
    lines.forEach(function (line) {
      var match, fn, opts, f, fwForFile;
      // scan for every line if it contains scstatic
      match = scstaticRegex.exec(line);
      if (match) {
        fn = match[3];
        // now search for fn in the current fw
        if (fn.indexOf(":") > -1) {
          // we have a framework reference...
          // meaning we need to find the other framework in order to know which file we are targeting here
          // syntax is [fwname]:[filename]
          //SC.Logger.log("app._fws: " + fw.get('belongsTo')._fws);
          var fwref = fn.substr(0, fn.lastIndexOf(":")); // lastIndex to catch longer refs, such as sproutcore:foundation
          var newfn = fn.substr(fn.lastIndexOf(":") + 1);
          //SC.Logger.log("fwref of crossfw sc_static: " + fwref + " and fn " + newfn);
          // problems arise because of incomplete refs (foundation instead of sproutcore:foundation)
          var crossFw = app._fws.findProperty('ref', fwref);
          if (!crossFw) crossFw = fw.get('belongsTo')._fws.findProperty('name', fwref);
          if (!crossFw) {
            SC.Logger.log("BT.CssFile#handleStatic: %@ is referred in %@ but this framework is still not loaded.".fmt(match[0], this.get('path')));
            ret.push(line);
            return;
          }
          fwForFile = crossFw;
          fn = newfn;
        }
        else fwForFile = fw;
        opts = fwForFile.findResourceFor(fn);
        if (opts.length === 0) {
          SC.Logger.log("BT.CssFile#handleStatic: found no files for %@ in file %@".fmt(match[0], this.get('path')));
          ret.push(line);
          return;
        }
        // still running?
        f = opts[0];
        if (opts.length > 1) {
          SC.Logger.log("BT.CssFile#handleStatic: found multiple files for %@ in file %@, taking the first (%@)".fmt(match[0], this.get('path'), f.get('path')));
        }
        // now we have a match, we need an url
        ret.push(line.replace(scstaticRegex, '"%@"'.fmt(pathlib.join(app.get('name'), f.get('relativePath')))));
      }
      else {
        ret.push(line);
      }
    }, this);
    return ret.join("\n");
  },

  dependencies: function () {
    // find dependencies
    var c = this.get('content');
    var ext = "." + this.get('extension');
    var fwpath = this.getPath('framework.path');
    var pathlib = require('path');
    var abspath, relpath, match;
    var ret = [];
    var re = new RegExp("sc_require\\([\"'](.*?)[\"']\\)", "g");
    while (match = re.exec(c)) {
      relpath = match[1];
      relpath = (relpath.lastIndexOf(ext) === -1) ? relpath + ext : relpath;
      //depFilename = BT.path.join(BT.projectPath, me.get('path'), relpath);
      // //currentFile.after(depFilename); // will automatically do the reverse lookup
      abspath = pathlib.join(fwpath, relpath);
      if (!ret.contains(abspath)) ret.push(abspath);
    }
    return ret;
  }.property('content').cacheable(),

  parseContent: function () {
    // replace sc_super()
    var raw = this.get('rawContent');
    if (!raw) {
      //SC.Logger.log("how can a known file have no rawContent?? " + this.get('path'));
      // very simple: either empty, or about to be deleted from the system
      return "";
    }
    var str = raw.toString(); // rawContent is a buffer, scriptfile always a string
    str = this._replaceScSuper(str);
    str = this.handleStatic(str);
    return str;
  }
});