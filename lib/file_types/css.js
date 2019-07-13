/*jshint node:true*/
/*globals BT */

sc_require('../mixins/slice');

/*
In this class there are quite a few handle* functions which in the end might be
better joined in some way, as each processes the entire text, as it most likely would improve
performance.
 */

/*
With CSS files and slicing there is the @2x story. This system works in such a way that a single css file can
actually be built into two different files. One with double size images (@2x), one without.
Effectively this means that an image is actually twice as big resolution wise, but given the same css size, which
improves the graphical quality (I assume).

So, during the setup parsing of the css file, whether or not this css file supports @2x needs to be detected, and run once with @2x
and once without, effectively generating two different file contents (especially with data urls,
unclear how this should work with graphical files)
 */

BT.CSSFile = BT.File.extend({

  extension: "css",
  isStylesheet: true,
  contentType: 'text/css',
  has2x: true, // flag to show whether this file also can have an 2x content
  language: 'any',

  contentForPath: function (path) {
    if (path.indexOf('@2x') !== -1) return this.get('content2x');
    return this.get('content');
  },

  minify: function (css) {
    var ret;
    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:minify');
    ret = require('cssmin')(css);
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:minify');
    return ret;
  },

  url2x: function () {
    return this.get('url').replace('.css', '@2x.css');
  }.property('url').cacheable(),

  relativeUrl2x: function () {
    return this.get('relativeUrl').replace('.css', '@2x.css');
  }.property('url').cacheable(),

  handleTheme: function (css) {
    var atTheme = /@theme\([\s\S]+?\)/;
    var dollarTheme = /\$theme\./;
    var lines, ret = [], theme, theme_layer, layer, insideComment;

    var atThemeFound = css.search(atTheme) >= 0;
    var dollarThemeFound = css.search(dollarTheme) >= 0;

    if (!atThemeFound && !dollarThemeFound) return css; // don't parse

    lines = css.split("\n");
    ret = [];
    //TODO: next line now only works for themeClasses...
    theme = this.getPath('framework.name'); // basic theme:
    //BT.Logger.trace('basic theme is: ' + theme);
    theme_layer = [theme];
    layer = 1;

    lines.forEach(function (line, linenumber) {
      var tmptheme, at_theme, param;
      var open_comment_pos = line.indexOf("/*");
      var close_comment_pos = line.indexOf("*/");
      var open_comment = open_comment_pos >= 0;
      var close_comment = close_comment_pos >= 0;
      if (open_comment && !close_comment) insideComment = true;
      if (close_comment && !open_comment) insideComment = false;
      if (insideComment) { // only pass over if inside comment
        ret.push(line);
        return;
      }
      if (atThemeFound) { // only run when there is an atTheme found in the file
        at_theme = line.search(atTheme);
        if (at_theme >= 0 && (at_theme < open_comment_pos || at_theme > close_comment_pos)) { // don't parse inside comments
          param = line.match(/\([\s\S]+?\)/);
          if (!param) {
            line += "/* you need to add a parameter when using @theme */";
            ret.push(line);
            BT.Logger.warn('@theme found without a parameter in file: ' + this.file.get('path') + " at line: " + linenumber);
            return;
          }
          else param = param[0].substr(1, param[0].length - 2);
          theme_layer.push(param);
          tmptheme = theme_layer.join(".");
          tmptheme = tmptheme[0] === "." ? tmptheme : "." + tmptheme;
          tmptheme = "$theme: \"" + tmptheme + "\";";
          //BT.Logger.debug('replacing attheme line, original: ' + line);
          //line = line.replace(atTheme, tmptheme);
          line = tmptheme;
          //BT.Logger.debug('replacing attheme line, replacement: ' + line);
          layer += 1;
        }
        if (line.indexOf("{") >= 0) layer += 1;
        if (line.indexOf("}") >= 0) {
          layer -= 1;
          if (theme_layer[layer]) {
            theme_layer.pop();
            tmptheme = theme_layer.join(".");
            tmptheme = tmptheme[0] === "." ? tmptheme: "." + tmptheme;
            //BT.Logger.debug("Inserting theme " + tmptheme);
            line = line.replace("}", "$theme: \"" + tmptheme + "\";");
          }
        }
      }
      // replace $theme by #{$theme} if it is followed by ".", "[" or "#"
      line = line.replace(/\$theme([\.\[#\s])/g, "#{$theme}$1");
      ret.push(line);
    }, this);
    return ret.join("\n");
  },

  content: function () {
    return this.parseContent();
  }.property('rawContent').cacheable(),

  content2x: function () {
    return this.parseContent({ x2: true });
  }.property('rawContent').cacheable(),

  handleAtImport: function (css) {
    // we try to find all the @import files, but if we cannot find them, we remove it
    var lines = css.split("\n");
    var ret = [];
    var importRegex = /@import[\s\S]?['"](.+?)['"];/;
    lines.forEach(function (line) {
      var match, fn, file;
      if (line.indexOf("@import") > -1) {
        match = importRegex.exec(line);
        if (match) {
          fn = match[1];
          // try to find it
          file = this.findIncludeFile(fn);
          if (file) {
            ret.push(file.get('rawContent'));
          }
          else {
            if (line.indexOf('compass') === -1) {
              BT.Logger.warn("Could not find " + line);
            }
            ret.push(""); // remove the @import
          }
        } // not a match, is this ever run?
        else ret.push(line); // not a match
      } // no @import on this line
      else ret.push(line);
    }, this);
    return ret.join("\n");
  },

  warnAtImport: function(css) {
    // we try to find all the @import files, but if we cannot find them, we remove it
    var lines = css.split("\n");
    var ret = [];
    var importRegex = /@import[\s\S]?['"](.+?)['"];/;
    lines.forEach(function (line) {
      var match, fn, file;
      if (line.indexOf("@import") > -1) {
        match = importRegex.exec(line);
        if (match) {
          fn = match[1];
          if (fn.indexOf('compass') === 0 || fn.indexOf('animation') === 0) {
            ret.push(line);
          }
          else {
            BT.Logger.warn("@import is not supported. Tried to @import: %@ in %@".fmt(match[0], this.get('path')));
          }
        } // not a match, is this ever run?
        else ret.push(line); // not a match
      } // no @import on this line
      else ret.push(line);
    }, this);
    return ret.join("\n");
  },

  parseContent: function (opts) {
    var raw = this.get('rawContent');
    var pathlib = require('path');
    var filepath = this.get('path');
    var framework = this.get('framework');
    var app = framework.get('belongsTo');
    var ret;

    if (!raw) {
      //BT.Logger.warn("how can a known file have no rawContent?? " + this.get('path'));
      return " ";
    }
    if (pathlib.basename(filepath)[0] === "_") { // filename starts with _, don't include content
      this.set("content", "");
      return;
    }
    var r = raw.toString();

    var partialContents;
    var partialIncludes = this.findSassPartials(); // this should also bring any _themes

    if (partialIncludes) {
      // partialIncludes will also have the themedef if it exists, so we can simply parse everything
      // if it doesn't exist the if below this one will fix that
      partialContents = partialIncludes.map(function (p) {
        var c = p.get('rawContent').toString().replace(/\/\*([\s\S]*?)\*\//g, "");

        if (framework.isTheme) {
          var basename = p.get('basename');
          if (basename === framework.get('scssVariablesPath')) {
            var scssVariablesPath = 'resources/'+app.get('scssVariablesPath');
            var variablesFile = app._appfw.files.findProperty('relativePath', scssVariablesPath);
            if (variablesFile) {
              c += variablesFile.get('rawContent').toString();
            }
          }
        }

        var partialPath = p.get('path');
        c = "/*BT_PARTIAL_START(" + p.get('path') + ")*/ \n" + c;
        c += "/*BT_PARTIAL_END(" + partialPath + ")*/ \n";
        return c;
      });
      partialContents.push(r);
      r = partialContents.join("\n");
    }
    if (!this.findIncludeFile("_theme.css") && !this.findIncludeFile("_theme.scss")) { // if a theme definition cannot be found, add it just in case
      r = '$theme: ".' + app.get('themeName') + '";\n' + r;
    }

    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:handleAtImport');
    // We do not support @import anymore. We automatically import files starting with a _ with findSassPartials
    //r = this.handleAtImport(r);
    r = this.warnAtImport(r);
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:handleAtImport');
    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:static_url');
    r = this.handleStatic(r, opts);
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:static_url');
    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:handleTheme');
    r = this.handleTheme(r);
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:handleTheme');

    // perhaps find the _theme.css file in the framework file list of the current directory
    // for now, plain sass parsing
    try {
      ret = this._parseSass(r);
    }
    catch (e) {
      var didSuccess = false;
      // If sass fail, we try to import compass
      try {
        r = '@import "compass";' + r;
        ret = this._parseSass(r, true);
        didSuccess = true;
      }
      catch (e) {
        var regex = /string\:([0-9]+)\: (.*)/;
        var match = regex.exec(e);
        if (match) {
          var line = parseInt(match[1], 10);
          BT.Logger.errorGroup("Sass parsing %@ in %@ line (%@)".fmt(match[2], this.get('path'), line));
          var start = line < 10 ? 0 : line - 10;
          var lines = r.split('\n');
          for (var i = 0; i < 20; i += 1) {
            BT.Logger.error("line: %@: %@".fmt(start + i, lines[start + i]));
          }
          BT.Logger.errorGroupEnd();
        }
        else {
          BT.Logger.error("Sass parsing error in %@: %@".fmt(this.get('path'), e));
        }
      }

      if (didSuccess) {
        BT.Logger.debug("Looks like you forgot to import compass in %@. Note that we imported it for you.".fmt(this.get('path')));
      }
    }

    // commented out minifying, because it doesn't make much sense on the individual file level
    // and if it is a combined file, it will overwrite this parseContent function anyway
    //
    // if (this.get('shouldMinify')) {
    //   if ((BT.runMode === BT.RM_BUILD) && !(opts && opts.lastStageInBuild)) {
    //     return ret;
    //   }
    //   else {
    //     ret = this.minify(ret);
    //   }
    // }
    //
    return ret;
  },

  _parseSass: function (css) {
    var sass = require('node-sass'),
      pathlib = require('path'),
      filepath = this.get('path'),
      curPath = pathlib.dirname(filepath),
      includePaths = [curPath],

      compassRegex = /@import[\s\S]?['"]compass(.*)['"];/;
      includeCompass = compassRegex.exec(css);

    if (includeCompass) {
      includePaths.push(BT.btPath + '/node_modules/compass-mixins/lib');
      includePaths.push(pathlib.join(BT.btPath, '..', 'compass-mixins', 'lib')); // also support the new npm scenario
    }

    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:sass');
    ret = sass.renderSync({
      data: css,
      includePaths: includePaths
    }).css;
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:sass');

    if (typeof ret !== "string" && !(ret instanceof Buffer)) {
      BT.Logger.warn("Something happened with the sass parsing as it doesn't return a string");
    }

    return ret;
  },

  findIncludeFile: function (filename) {
    var p = this.get('path');
    var pathlib = require('path');
    var pDir = pathlib.dirname(p);
    var frameworkDir = this.getPath('framework.path');
    var frameworkFiles = this.getPath('framework.files');
    var workdir = pDir;
    var includeFile, found = false;

    // catch the situation that the base dir is equal to the frameworkDir.
    if (workdir === frameworkDir) {
      return frameworkFiles.findProperty('path', pathlib.join(workdir, filename));
    }

    while (!found) { // this needs to be a while, because we need to search our way down
      includeFile = frameworkFiles.findProperty('path', pathlib.join(workdir, filename));
      if (includeFile) found = true;
      else workdir = pathlib.dirname(workdir);
      if (workdir === frameworkDir) found = true;
    }

    return includeFile;
  },

  findSassPartials: function () {
    var ret = [];
    var p = this.get('path');
    var frameworkDir = this.getPath('framework.path');
    var frameworkFiles = this.getPath('framework.files');
    var done = false;
    var pathlib = require('path');
    var workdir = pathlib.dirname(p);

    var findPartial = function (f) {
      var tmpfn = f.get('path');
      var tmpbasename = pathlib.basename(tmpfn);
      if (tmpfn.indexOf(workdir) > -1) {
        var extname = pathlib.extname(tmpbasename);
        if (tmpbasename[0] === "_" && (extname === ".css" || extname === ".scss")) {
          // found one, add to ret
          //BT.Logger.debug("Found partial include: %@".fmt(f.get('path')));
          ret.push(f);
        }
      }
    };

    if (workdir === frameworkDir) done = true;
    while (!done) {
      frameworkFiles.forEach(findPartial);
      workdir = pathlib.dirname(workdir);
      if (workdir === frameworkDir) done = true;
    }
    return ret;
  },

  findFwResourceFor: function (fwForFile, fn, opts) {
    var x2 = opts && opts.x2,
      res;

    if (x2) {
      var fnx2 = BT.url2x2(fn);
      res = fwForFile.findResourceFor(fnx2);
      if (res.length === 0) res = null;
    }
    if (!res) res = fwForFile.findResourceFor(fn);

    return res;
  },

  replaceResourceFromLine: function (line, file, matchText, matchIndex, separator, opts) {
    // the full replace should only take place when in
    // - debug mode
    // - build mode with lastStageInBuild

    var shouldReplace = BT.runMode === BT.RM_DEBUG || (BT.runMode === BT.RM_BUILD && opts && opts.lastStageInBuild);

    if (shouldReplace) {
      line = this._removeBtScstaticMarker(line, matchText, matchIndex, separator);

      var path = file.get('path'),
        url = file.get('url'),
        x2 = path.indexOf('@2x') !== -1;

      if (x2) {
        var sizeOf = require('image-size'),
          img = sizeOf(path);

        if (img) {
          var bg = this.prepareBackgroundSize(img.width / 2, img.height / 2),
              i = matchIndex + 5;

          while (line.charAt(i) && line.charAt(i) !== ';') { i++; }
          i++;
          line = line.slice(0, i) + bg + line.slice(i);
        }
      }

      if (this.getPath('framework.belongsTo.doRelativeBuild')) {
        url = file.get('relativeUrl');
      }
      line = line.replace(matchText, 'url(' + separator + url + separator + ')');
    }
    else { // we should check whether the line already is parsed once
      line = this._addBtScstaticMarker(line, matchText, matchIndex, separator);
    }
    return line;
  },

  prepareBackgroundSize: function (width, height) {
    if (SC.none(width) || SC.none(height)) throw new Error('width and height shoud be defined.');

    var bg = '';
    bg += "background-size: %@px %@px;".fmt(width, height);
    bg += "-webkit-background-size: %@px %@px;".fmt(width, height);
    bg += "-moz-background-size: %@px %@px;".fmt(width, height);
    return bg;
  },

});
