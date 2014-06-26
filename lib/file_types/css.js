/*jshint node:true*/
/*globals BT */

sc_require('../mixins/slice');
sc_require('../mixins/compass');

/*
In this class there are quite a few handle* functions which in the end might be
better joined in some way, as each processes the entire text, as it most likely would improve
performance. The gsub route as taken by the slicing (also in this class) was tried at first for the
handleTheme approach, and turned out to slow performance hugely.
The slicing still uses the gsub approach, as there doesn't seem to be a difference between line per line
parsing and using gsub
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

BT.CSSFile = BT.File.extend(BT.SliceMixin, BT.CompassMixin, {

  extension: "css",
  isStylesheet: true,
  contentType: 'text/css',
  has2x: true, // flag to show whether this file also can have an 2x content

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
    //SC.Logger.debug('basic theme is: ' + theme);
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
            SC.Logger.warn('@theme found without a parameter in file: ' + this.file.get('path') + " at line: " + linenumber);
            return;
          }
          else param = param[0].substr(1, param[0].length - 2);
          theme_layer.push(param);
          tmptheme = theme_layer.join(".");
          tmptheme = tmptheme[0] === "." ? tmptheme : "." + tmptheme;
          tmptheme = "$theme: \"" + tmptheme + "\";";
          //SC.Logger.debug('replacing attheme line, original: ' + line);
          //line = line.replace(atTheme, tmptheme);
          line = tmptheme;
          //SC.Logger.debug('replacing attheme line, replacement: ' + line);
          layer += 1;
        }
        if (line.indexOf("{") >= 0) layer += 1;
        if (line.indexOf("}") >= 0) {
          layer -= 1;
          if (theme_layer[layer]) {
            theme_layer.pop();
            tmptheme = theme_layer.join(".");
            tmptheme = tmptheme[0] === "." ? tmptheme: "." + tmptheme;
            //SC.Logger.debug("Inserting theme " + tmptheme);
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
          else ret.push(""); // remove the @import
        } // not a match, is this ever run?
        else ret.push(line); // not a match
      } // no @import on this line
      else ret.push(line);
    }, this);
    return ret.join("\n");
  },

  parseContent: function (opts) {
    var raw = this.get('rawContent');
    var sass = require('node-sass');
    var pathlib = require('path');
    var filepath = this.get('path');
    var ret;
    var curPath = pathlib.dirname(filepath);
    if (!raw) {
      //SC.Logger.warn("how can a known file have no rawContent?? " + this.get('path'));
      return " ";
    }
    if (pathlib.basename(filepath)[0] === "_") { // filename starts with _, don't include content
      this.set("content", "");
      return;
    }
    var r = raw.toString();

    var themeDef = this.findIncludeFile("_theme.css"), themeDefContents;
    if (themeDef) {
      // prepend, but strip all comments from _theme.css
      themeDefContents = themeDef.get('rawContent').toString().replace(/\/\*[\s\S]+\*\//g, "");
      r = [themeDefContents, r].join("\n");
    } // if not found, take the current theme name from the fw and prepend it
    else {
      // only works for theme classes, but usually any other framework will have
      // a _theme.css. Perhaps change for frameworks.theme...
      r = '$theme: ".' + this.getPath('framework.belongsTo.themeName') + '";\n' + r;
    }

    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:handleAtImport');
    r = this.handleAtImport(r);
    // was -> r = r.replace(/@import[\s\S]?['"].+?['"];/g, ""); // replace import "compass/css3";
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:handleAtImport');
    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:static_url');
    r = this.handleStatic(r, opts);
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:static_url');
    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:slicing');
    r = this.applySlicing(r, opts);
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:slicing');
    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:handleTheme');
    r = this.handleTheme(r);
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:handleTheme');

    if (BT.runBenchmarks) SC.Benchmark.start('cssFile:compass');
    r = this.handleCompass(r);
    if (BT.runBenchmarks) SC.Benchmark.end('cssFile:compass');

    // perhaps find the _theme.css file in the framework file list of the current directory
    // for now, plain sass parsing
    try {
      if (BT.runBenchmarks) SC.Benchmark.start('cssFile:sass');
      ret = sass.renderSync({
        data: r,
        includePaths: [curPath]
      });
      if (BT.runBenchmarks) SC.Benchmark.end('cssFile:sass');
    }
    catch (e) {
      SC.Logger.error("error when parsing sass in " + this.get('path'));
      //SC.Logger.error("content of error: "+ SC.inspect(e));
      var regex = /string\:([0-9]+)/;
      var match = regex.exec(e);
      var line = parseInt(match[1], 10);
      SC.Logger.error("line in error (%@)".fmt(line));
      var start = line < 10 ? 0 : line - 10;
      var lines = r.split('\n');
      for (var i = 0; i < 20; i += 1) {
        SC.Logger.error("line: %@: %@".fmt(start + i, lines[start + i]));
      }
      //SC.Logger.error(r.split("\n")[line]);
      // SC.Logger.error("content: " + r);
      //
      throw e;
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

    while (!found) { // this needs to be a while, because we need to search our way down
      includeFile = frameworkFiles.findProperty('path', pathlib.join(workdir, filename));
      if (includeFile) found = true;
      else workdir = pathlib.dirname(workdir);
      if (workdir === frameworkDir) found = true;
    }

    return includeFile;
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

  replaceResourceFromLine: function (line, file, scstaticRegex, opts) {
    var path = file.get('path'),
      url = file.get('url'),
      x2 = path.indexOf('@2x') !== -1;

    if (x2) {
      var img = this.loadImage(path);

      if (img) {
        var bg = this.prepareBackgroundSize(img.width / 2, img.height / 2),
            match = scstaticRegex.exec(line),
            i = match.index + 5;

        while (line.charAt(i) && line.charAt(i) !== ';') { i++; }
        i++;
        line = line.slice(0, i) + bg + line.slice(i);
      }
    }
    else {
      // the full replace should only take place when in
      // - debug mode
      // - build mode with lastStageInBuild

      var shouldReplace = BT.runMode === BT.RM_DEBUG || (BT.runMode === BT.RM_BUILD && opts && opts.lastStageInBuild);

      if (shouldReplace) {
        var startSCSTATIC = line.indexOf("/*BT_SCSTATIC");
        if (startSCSTATIC > -1) {
          line = line.replace("/*BT_SCSTATIC", "");
          line = line.replace("*/", "");
          // we won't replace the background #abc here, because sass puts it on the next line.
          // The main function will take care of removing it.
        }
        if (BT.runMode === BT.RM_BUILD && this.getPath('framework.relativeBuild')) {
          url = file.get('relativeUrl');
        }
        line = line.replace(scstaticRegex, 'url("%@")'.fmt(url));
      }
      else { // we should check whether the line already is parsed once
        if (line.indexOf("/*BT_SCSTATIC") === -1) {
          // we need to catch existing comments, otherwise our commenting won't work
          var semicolonPos = line.lastIndexOf(";");
          line = "/*BT_SCSTATIC" + line.substr(0, semicolonPos + 1) + "*/" + line.substr(semicolonPos + 2);
          // we need to add something in case the static line is the only element in the css property
          // just commenting out would leave an empty property, which would then be removed by sass
          line += " background: #abc;";
        }
      }
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

  loadImage: function (path, filebuffer) {
    var Canvas = require('canvas');
    var img = new Canvas.Image();
    img.src = filebuffer || path;

    if (!img.complete) {
      SC.Logger.warn('no filebuffer found for ' + path);
    }
    return img;
  },

});

