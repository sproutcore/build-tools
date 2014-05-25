/*jshint node:true */
/*globals BT*/

BT.ScriptFile = BT.File.extend({
  extension: "js",
  isScript: true,
  isTest: function () {
    // a test is a script, which isn't a normal script. The relative path of a test file to its framework starts with tests
    // Not doing this with regex on the complete path, as that disabled using an app called tests
    var relp = this.get('relativePath');
    var test_i = relp.indexOf("tests");
    if (test_i === 0 || test_i === 1) { // for tests/ or /tests
      return true;
    }
    else return false;
  }.property('path').cacheable(),

  shouldMinify: false,
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

  minify: function (str) {
    var ret;
    try {
      if (BT.runBenchmarks) SC.Benchmark.start('scriptFile:minify');
      ret = require('uglify-js').minify(str, { fromString: true }).code;
      if (BT.runBenchmarks) SC.Benchmark.end('scriptFile:minify');
    }
    catch (e) {
      throw e;
    }
    return ret;
  },

  handleIfDebug: function (src) {
    // should handle
    // //@if(debug) ... //@endif
    // and get rid of it when the runmode is not debug
    if (BT.runMode === BT.RM_DEBUG) return src; // don't do a thing
    else {
      var startregex = /@if\s?\(debug\)/;
      //var endregex = /@endif/;
      var lines = src.split("\n"), ret = [];
      var insideIfDebug;
      lines.forEach(function (line) {
        if (line.search(startregex) > -1) {
          insideIfDebug = true;
        }
        if (!insideIfDebug) ret.push(line);
        if (insideIfDebug) {
          if (line.indexOf("@end") > -1) insideIfDebug = false; // catches both @end and @endif
        }
      });
      return ret.join("\n");
    }
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
    if (!str) return "";
    if (BT.runBenchmarks) SC.Benchmark.start('scriptFile:sc_super');
    str = this._replaceScSuper(str);
    if (BT.runBenchmarks) SC.Benchmark.end('scriptFile:sc_super');
    if (BT.runBenchmarks) SC.Benchmark.start('scriptFile:static_url');
    str = this.handleStatic(str);
    if (BT.runBenchmarks) SC.Benchmark.end('scriptFile:static_url');
    if (this.get('isTest')) {
      var testCode = 'if (typeof SC !== "undefined") {\n  SC.mode = "TEST_MODE";\n';
      testCode += 'SC.filename = "%@"; \n}\n(function() {\n'.fmt(this.get('url'));
      testCode += str;
      testCode += "\n})();\n";
      str = testCode;
    }
    else {
      // let handleIfDebug decide whether to do anything, in case it has to be extended somehow
      if (BT.runBenchmarks) SC.Benchmark.start('scriptFile:handleIfDebug');
      str = this.handleIfDebug(str);
      if (BT.runBenchmarks) SC.Benchmark.end('scriptFile:handleIfDebug');
      str = str.replace(/(sc_require\([\"'].*?[\"']\)[,;]?)/g, "//$1");
      if (this.get('shouldMinify')) {
        str = this.minify(str);
      }
    }
    return str;
  }
});