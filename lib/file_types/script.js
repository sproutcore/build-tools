/*jshint node:true */
/*globals BT*/

sc_require('../mixins/traceur');

BT.ScriptFile = BT.File.extend(BT.TraceurMixin, {
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
      BT.Logger.error("ERROR in %@:  sc_super() should not be called with arguments. Modify the arguments array instead.".fmt(this.get('path')));
    }
    if (str && str.replace) {
      // return str.replace(/sc_super\(\)/g, 'arguments.callee.base.apply(this,arguments)');
      // the best way of doing sc_super in an ES5 strict mode compatible way, is to force functions calling sc_super to have a name
      // that way it is easy to refer to the function itself, and the base can be used as normal.
      // How this is achieved: every file is split into lines, then sc_super is searched for.
      // If sc_super is found, the process walks back until a function definition is found.
      // as soon as it is found, it is checked whether it is named. If it is not, the name is added.
      // also the function arguments are taken. Then sc_super then is replaced by name.base.apply(this, [ args found at function def ])
      var lines = str.split('\n');
      var ret = [];
      // var fnDefRegExp = /([a-zA-Z_]+)\s*:\s*function\s*\(([\s\S]*?)\)\s*{?/;
      var fnDefRegExp = /([a-zA-Z_]+)\s*:\s*function\s*([a-zA-Z_]*)?\s*\(([\s\S]*?)\)\s*{?/;
      var insideComment = false;

      // The search string is built up like this because it might otherwise be replaced by the sc_super replacement
      // of the BT environment itself
      var scsupersearch = "sc_super";
      scsupersearch += "()";
      lines.forEach(function (l, line_i) {
        if (l.indexOf("/*") > -1 && l.indexOf("*/") === -1) { // otherwise same line block comment
          insideComment = true;
          ret.push(l);
        }
        else if (l.indexOf("*/") > -1 && l.indexOf("/*") === -1) {
          insideComment = false;
          ret.push(l);
        }
        else if (insideComment) {
          ret.push(l);
        }
        else {
          var superIndex = l.indexOf(scsupersearch);
          if (superIndex === -1 && l.indexOf("_super") > -1) {
          }
          if (superIndex === -1 && l.indexOf("//") < superIndex) {
            ret.push(l);
          }
          else if (superIndex === -1) {
            ret.push(l);
          }
          else {// sc_super found
            // walk back to a line containing
            var curLine, match, replacement;
            for (var i = line_i; i > 0; i-= 1) {
              curLine = ret[i] || lines[i];
              match = fnDefRegExp.exec(curLine);
              if (match) {
                // We need to detect whether the function definition is anonymous, and if it is, make it named
                // then replace the sc_super by name.base.apply(this, [args]);
                // if it isn't we need to use the name given
                if (!match[2]) {
                  if (ret[i] === undefined && i === line_i) {
                    l = l.replace("function", "function " + match[1]);
                  }
                  else ret[i] = ret[i].replace("function", "function " + match[1]);
                  replacement = match[1] + ".base.apply(this";
                }
                else {
                  replacement = match[2] + ".base.apply(this";
                }
                // now replace the sc_super
                // if (match[3]) replacement += ", [" + match[3] + "]";
                // according to https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#what-is-safe-arguments-usage
                // this should be safe.
                replacement += ",arguments";
                replacement += ")"; // no semicolon, as the return value can be used as a function argument
                ret.push(l.replace(/sc_super\s*\(\)/g, replacement));
                break;
              }
            }
            if (i === 0) {
              BT.Logger.warn("WARNING: Cannot find function definition for sc_super. Is it used outside an object literal? file: %@".fmt(this.get('path')));
            }
          }
        }
        var latestLine = ret[ret.length - 1];
        var sc_super_index = latestLine.indexOf(/sc_super\s*\(/);
        if (sc_super_index !== -1) { // don't take sc_super inside comments
          if (!insideComment) { // only does block comments
            if (latestLine.indexOf("//") === -1 || latestLine.indexOf("//") > sc_super_index) {
              BT.Logger.warn("sc_super has not been replaced on line %@ in file %@. This is possibly a bug in the BT.".fmt(line_i, this.get('path')));
            }
          }
        }
      }, this);
      ret = ret.join("\n");
      if (ret.indexOf(/sc_super\s*\(\)/) !== -1) {
        BT.Logger.warn("WARNING: file did not successfully replace all sc_super occurrences!", this.get('path'));
      }
      return ret;
    }
    return str;
  },

  minify: function (str) {
    if (BT.runBenchmarks) SC.Benchmark.start('scriptFile:minify');
    var result = require('terser').minify(str, {
      warnings: true,
      output: {
        max_line_len: 1000
      }
    });
    if (result.warning) {
      BT.Logger.warn("Warning while minifying the script file '%@': %@".fmt(this.get('path'), result.warning));
    }
    if (result.error) {
      BT.Logger.error("Error while minifying the script file '%@': %@".fmt(this.get('path'), result.error));
    }
    if (BT.runBenchmarks) SC.Benchmark.end('scriptFile:minify');
    return result.code;
  },

  /**
    Handle `//@if(debug|build) ... //@endif` comments

    @private
  */
  handleRunModeComments: function (src) {
    var startregex;

    switch(BT.runMode) {
      case BT.RM_DEBUG:
        startregex = /@if\s?\(build\)/;
      break;
      case BT.RM_BUILD:
        startregex = /@if\s?\(debug\)/;
      break;
    }

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

  parseContent: function (opts) {

    // replace sc_super()
    var raw = this.get('rawContent');
    if (!raw) {
      //BT.Logger.warn("how can a known file have no rawContent?? " + this.get('path'));
      // very simple: either empty, or about to be deleted from the system
      return "";
    }
    var str = raw.toString(); // rawContent is a buffer, scriptfile always a string
    if (!str) return "";

    // let handleRunModeComments decide whether to do anything, in case it has to be extended somehow
    if (BT.runBenchmarks) SC.Benchmark.start('scriptFile:handleRunModeComments');
    str = this.handleRunModeComments(str);
    if (BT.runBenchmarks) SC.Benchmark.end('scriptFile:handleRunModeComments');

    if (BT.runBenchmarks) SC.Benchmark.start('scriptFile:sc_super');
    str = this._replaceScSuper(str);
    if (BT.runBenchmarks) SC.Benchmark.end('scriptFile:sc_super');

    // Note: Traceur compiler will remove the comments, which means that handleRunModeComments must
    // be call before and sc_require must be commented after.
    if (BT.runBenchmarks) SC.Benchmark.start('scriptFile:traceurCompilation');
    str = this.handleTraceur(str);
    if (BT.runBenchmarks) SC.Benchmark.end('scriptFile:traceurCompilation');

    if (BT.runBenchmarks) SC.Benchmark.start('scriptFile:static_url');
    str = this.handleStatic(str, opts);
    if (BT.runBenchmarks) SC.Benchmark.end('scriptFile:static_url');

    if (this.get('isTest')) {
      var testCode = 'if (typeof SC !== "undefined") {\n  SC.mode = "TEST_MODE";\n';
      testCode += 'SC.filename = "%@"; \n}\n(function() {\n'.fmt(this.get('url'));
      testCode += str;
      testCode += "\n})();\n";
      str = testCode;
    }
    else {
      str = str.replace(/(sc_require\([\"'].*?[\"']\)[,;]?)/g, "//$1");
      if (this.get('shouldMinify')) {
        str = this.minify(str);
      }
    }
    return str;
  }
});
