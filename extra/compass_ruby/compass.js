/*global BT*/

BT.CompassFile = BT.CSSFile.extend({

  content: null, // not a computed property as normal, because we need to go async...

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
    //SC.Logger.log('basic theme is: ' + theme);
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
      if (atThemeFound) { // skip when no atTheme found
        at_theme = line.search(atTheme);
        if (at_theme >= 0 && (at_theme < open_comment_pos || at_theme > close_comment_pos)) { // don't parse inside comments
          param = line.match(/\([\s\S]+?\)/);
          if (!param) {
            line += "/* you need to add a parameter when using @theme */";
            ret.push(line);
            SC.Logger.log('@theme found without a parameter in file: ' + this.file.get('path') + " at line: " + linenumber);
            return;
          }
          else param = param[0].substr(1, param[0].length - 2);
          theme_layer.push(param);
          tmptheme = theme_layer.join(".");
          tmptheme = tmptheme[0] === "." ? tmptheme : "." + tmptheme;
          tmptheme = "$theme: \"" + tmptheme + "\";";
          //tools.log('replacing attheme line, original: ' + line);
          //line = line.replace(atTheme, tmptheme);
          line = tmptheme;
          //tools.log('replacing attheme line, replacement: ' + line);
          layer += 1;
        }
        if (line.indexOf("{") >= 0) layer += 1;
        if (line.indexOf("}") >= 0) {
          layer -= 1;
          if (theme_layer[layer]) {
            theme_layer.pop();
            tmptheme = theme_layer.join(".");
            tmptheme = tmptheme[0] === "." ? tmptheme: "." + tmptheme;
            line = line.replace("}", "$theme: \"" + tmptheme + "\";");
          }
        }
      }
      line = line.replace(/\$theme\./g, "#{$theme}.");
      ret.push(line);
    }, this);
    return ret.join("\n");
  },

  parseContent: function () {
    var rawContent = this.get('rawContent');
    var fw = this.get('framework');
    var pathlib = require('path');
    var fslib = require('fs');
    var p = this.get('path');
    if (!rawContent) return "";
    if (this.get('isThemeDefinition')) {
      this.set('content', "");
      return;
    }

    var r = rawContent.toString();
    r = this.applySlicing(r);

    // // now do the @theme replacement
    // r = this.replaceAtTheme(r);

    // // now replace $theme with #{$theme} as we are dealing with ruby and its automatic
    // // variable insertion
    // r = r.replace(/\$theme\./g, "#{$theme}.");
    r = this.handleTheme(r);

    var tmpPath = this.createTmpDir();
    //
    // what to do exactly?
    // - find _theme.css file
    // - write out the css file plus _theme.css file prepended to the temp folder
    // - invoke compass
    // - read back css
    //
    var themeDef = this.findThemeDef();
    if (themeDef) {
      r = [themeDef.get('rawContent'), r].join("\n");
    } // if not found, take the current theme name from the fw and prepend it
    else {
      // only works for theme classes, but usually any other framework will have
      // a _theme.css. Perhaps change for frameworks.theme...
      r = "$theme: " + fw.get('name') + ";\n" + r;
    }

    // now write out to tmp dir and let compass have a go
    var baseFn = [fw.get('name'), "_", pathlib.basename(p)].join("");
    var sassFn = pathlib.join(tmpPath, 'sass', p + ".scss");
    var cssFn = pathlib.join(tmpPath, 'stylesheets', p);

    var me = this;
    fslib.writeFileSync(sassFn, r);
    // we need to use the node wrap here to prevent an EMFILE error
    // require('child_process').exec("compass compile", { cwd: tmpPath }, function(err, stdout, stderr){

    this.set('rawContentHasChanged', true);

    // });
    // BT.AsyncWrapper.from('child_process').perform('exec', "compass compile", { cwd: tmpPath })
    //   .notify(this, this.compassDidExecute).start();
  }.observes('rawContent'),

  reloadParsedContent: function () {
    // reload the file
    var pathlib = require('path');
    var tmpPath = pathlib.join(BT.projectPath, "tmpnode", "compass"); // make dynamic for windows cases
    var cssFn = pathlib.join(tmpPath, 'stylesheets', this.get('path'));
    var c = fslib.readFileSync(cssFn);
    if (c) {
      this.set('content', c.toString());
    }
    this.set('rawContentHasChanged', false);
  },

  compassDidExecute: function (err, stdout, stderr) {
    var fslib = require('fs');
    SC.Logger.log("compassDidExecute");
    if (!err) {
      var c = fslib.readFileSync(cssFn);
      if (c) {
        this.set('content', c.toString());
      }
    }
  },

  findThemeDef: function () {
    var p = this.get('path');
    var pathlib = require('path');
    var pDir = pathlib.dirname(p);
    // we are searching for _theme.css with the same pDir, or with some others...
    var frameworkDir = this.getPath('framework.path');
    var frameworkFiles = this.getPath('framework.files');
    var workdir = pDir;
    var themeDef, found = false;

    while (!found) {
      themeDef = frameworkFiles.findProperty('path', pathlib.join(workdir, "_theme.css"));
      if (themeDef) found = true;
      else workdir = pathlib.dirname(workdir);
      if (workdir === frameworkDir) found = true;
    }

    return themeDef;
    // var themeDefDir = pathlib.join(pDir,"_theme.css");


    // var themeDef = fw.get('files').findProperty('path',themeDefDir);

  },

  // recursively create directories
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

  createTmpDir: function () {
    var p = this.get('path');
    var pathlib = require('path');
    var fwpath = this.getPath('framework.path');
    var relPath = pathlib.relative(p, fwpath);
    //var basename = pathlib.basename(p);
    var tmpDir = pathlib.join("tmpnode", "compass"); // make dynamic for windows cases

    var wdir = this._mkdir(tmpDir, BT.projectPath);

    this._mkdir(".sass-cache", wdir);
    this._mkdir("sass", wdir);
    this._mkdir("stylesheets", wdir);

    // already create the path in sass where the scss file should be written:
    this._mkdir(pathlib.dirname(p), pathlib.join(wdir, "sass"));

    // var wdir = BT.projectPath;
    // ["tmp_node", 'compass'].forEach(function (d) {
    //   wdir = pathlib.join(wdir,d);
    //   createDir(wdir);
    // });

    // createDir(pathlib.join(wdir,'.sass-cache'));
    // createDir(pathlib.join(wdir,'sass'));
    // createDir(pathlib.join(wdir,'stylesheets'));

    // var compassRoot = wdir;
    // wdir = pathlib.join()

    // relPath.split(pathlib.sep)

    // var compassCfg = [];
    // compassCfg.push("require 'compass/import-once/activate'");
    // compassCfg.push('css_dir = "stylesheets"');
    // compassCfg.push('sass_dir = "sass"');

    // fs.writeFileSync(pathlib.join(wdir,'config.rb'), compassCfg.join("\n"));
    return wdir;
  }
});

BT.projectManager.registerFileClass("css", BT.CompassFile);
