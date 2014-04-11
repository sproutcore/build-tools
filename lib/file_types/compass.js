/*global BT*/

BT.CompassFile = BT.CSSFile.extend({

  content: null, // not a computed property as normal, because we need to go async...

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
    // now replace $theme with #{$theme} as we are dealing with ruby and its automatic
    // variable insertion
    r = r.replace(/\$theme\./g, "#{$theme}.");

    var tmpPath = this.createTmpDir();
    //
    // what to do exactly?
    // - find _theme.css file
    // - write out the css file plus _theme.css file prepended to the temp folder
    // - invoke compass
    // - read back css
    //
    var themeDef = this.findThemeDef();
    if(themeDef){
      r = [themeDef.get('rawContent'), r].join("\n");
    } // else ignore...

    // now write out to tmp dir and let compass have a go
    var baseFn = [fw.get('name'), "_", pathlib.basename(p)].join("");
    var sassFn = pathlib.join(tmpPath, 'sass', p + ".scss");
    var cssFn = pathlib.join(tmpPath, 'stylesheets', p);

    var me = this;
    fslib.writeFileSync(sassFn, r);
    // we need to use the node wrap here to prevent an EMFILE error
    // require('child_process').exec("compass compile", { cwd: tmpPath }, function(err, stdout, stderr){

    // });
    // BT.AsyncWrapper.from('child_process').perform('exec', "compass compile", { cwd: tmpPath })
    //   .notify(this, this.compassDidExecute).start();
  }.observes('rawContent'),

  compassDidExecute: function(err, stdout, stderr){
    SC.Logger.log("compassDidExecute");
    if(!err){
      var c = fslib.readFileSync(cssFn);
      if(c){
        this.set('content', c.toString());
      }
    }
  },

  findThemeDef: function(){
    var p = this.get('path');
    var pathlib = require('path');
    var pDir = pathlib.dirname(p);
    // we are searching for _theme.css with the same pDir, or with some others...
    var frameworkDir = this.getPath('framework.path');
    var frameworkFiles = this.getPath('framework.files');
    var workdir = pDir;
    var themeDef, found = false;

    while(!found){
      themeDef = frameworkFiles.findProperty('path',pathlib.join(workdir,"_theme.css"));
      if(themeDef) found = true;
      else workdir = pathlib.dirname(workdir);
      if(workdir === frameworkDir) found = true;
    }

    return themeDef;
    // var themeDefDir = pathlib.join(pDir,"_theme.css");


    // var themeDef = fw.get('files').findProperty('path',themeDefDir);

  },

  // recursively create directories
  _mkdir: function (dir, baseDir) {
    var pathlib = require('path');
    var fslib = require('fs');
    if(!dir) return;
    var wdir = baseDir;
    dir.split(pathlib.sep).forEach(function (subdir) {
      var d = pathlib.join(wdir,subdir);
      try {
        fslib.mkdirSync(d);
      }
      catch (e) {
        if (e.code !== 'EEXIST') {
          throw e;
        }
      }
      wdir = pathlib.join(wdir,subdir);
    });
    return wdir;
  },

  createTmpDir: function(){
    var p = this.get('path');
    var pathlib = require('path');
    var fwpath = this.getPath('framework.path');
    var relPath = pathlib.relative(p,fwpath);
    //var basename = pathlib.basename(p);
    var tmpDir = pathlib.join("tmpnode","compass"); // make dynamic for windows cases

    var wdir = this._mkdir(tmpDir,BT.projectPath);

    this._mkdir(".sass-cache", wdir);
    this._mkdir("sass",wdir);
    this._mkdir("stylesheets",wdir);

    // already create the path in sass where the scss file should be written:
    this._mkdir(pathlib.dirname(p), pathlib.join(wdir,"sass"));

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
