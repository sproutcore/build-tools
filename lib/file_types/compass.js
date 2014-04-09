/*global BT*/

BT.CompassFile = BT.CSSFile.extend({

  content: null, // not a computed property as normal, because we need to go async...

  parseContent: function(){
    var rawContent = this.get('rawContent');
    //var fw = this.get('framework');
    var pathlib = require('path');
    var fslib = require('fs');
    var p = this.get('path');
    if(!rawContent) return "";
    if(this.get('isThemeDefinition')) return "";

    var r = rawContent.toString();

    var tmpPath = this.createTmpDir();
    //
    // what to do exactly?
    // - find _theme.css file
    // - write out the css file plus _theme.css file prepended to the temp folder
    // - invoke compass
    // - read back css
    //
    var themeDef = this.findThemeDef();
    r = [themeDef.get('rawContent'), r].join("\n");
    // now write out to tmp dir and let compass have a go
    var baseFn = pathlib.join(tmpPath, pathlib.basename(p));
    var me = this;
    fslib.writeFileSync(baseFn + ".scss"));
    require('child_process').exec("compass", { cwd: tmpPath }, function(err, stdout, stderr){
      if(!err){
        var c = fslib.readFileSync(baseFn + ".css");
        if(c){
          me.set('content',c.toString());
        }
      }
    });
  }.observes('rawContent'),

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

  createTmpDir: function(){
    var p = this.get('path');
    var pathlib = require('path');
    var basename = pathlib.basename(p);

    var createDir = function(dir){
      var fs = require('fs');
      try {
        fs.mkDirSync(dir);
      }
      catch(e){
        if(e.code !== 'EEXISTS'){
          throw e;
        }
      }
    };

    var wdir = BT.projectPath;
    ["tmp", 'compass', basename].forEach(function (d) {
      wdir = pathlib.join(wdir,d);
      createDir(wdir);
    });

    return wdir;
  }
});
