//basic use of gulp:

// var gulp = require('gulp');
// var uglify = require('gulp-uglify');

// gulp.task('scripts', function(){
//   return gulp.src(['client/js/**/*.js', '!client/js/vendor/**/*.js'])
//     .pipe(uglify())
//     .pipe(gulp.dest('build/js'));
// });

// the basic setup of the build tools is to first parse the configuration
// the configuration should contain specific settings for either dev or deploy / serve or build

//var gulp = require('gulp');

// var Project = require('./lib/project');
// var autodetect = require('./lib/autodetect');
// var util = require('util');

// module.exports.startDevServer = function(path){
//   // first do autodetection on path, which generates the entire config
//   autodetect(path, function(err,config){
//     util.log('generated config: ' + util.inspect(config));
//     //var p = Project.create(config);
//   });
// };

// what this does is require SC and then require all the necessary files in lib.
var vm = require('vm');
var SC = require('sc-runtime'); // for now
var util = require('util');
var path = require('path');
var fs = require('fs');
var dirname = __dirname; // dirname of this file

var btContext = vm.createContext({
  SC: SC,
  BT: {
    projectDir: null,
    curFile: null,
    curPath: null,
    fs: fs,
    path: path,
    util: util,
    runConfig: function(f){
      try {
        var hasSCConfig = f.indexOf("sc_config") > -1;
        var fp = hasSCConfig? f: path.join(f,"sc_config");
        var p = path.join(btContext.BT.projectDir,fp);
        var cFile = btContext.BT.curFile; //save
        var cPath = btContext.BT.curPath || btContext.BT.projectDir;
        var curDir = hasSCConfig? path.dirname(f): f;

        btContext.BT.curFile = p;
        btContext.BT.curPath = curDir;
        util.log('reading file ' + p);
        var c = fs.readFileSync(p,{ encoding: 'utf8'});
        util.log('code in file: ' + c);
        vm.runInContext(c,btContext,p);
        btContext.BT.curFile = cFile; // restore
        btContext.BT.curPath = cPath;
      }
      catch(e){
        util.log('error when running config: ' + util.inspect(e));
        throw e;
      }
    }
  },
  sc_require: function(f){
    var hasSCConfig = f.indexOf("sc_config") > -1;
    var fp = hasSCConfig? f: path.join(f,"sc_config");

    var cFile = btContext.BT.curFile; //save
    var cPath = btContext.BT.curPath || btContext.BT.projectDir;
    var curDir = hasSCConfig? path.dirname(f): f;

    //var p = path.join(btContext.BT.projectDir,fp);
    var p = path.join(cPath,fp);
    var c = fs.readFileSync(p,{ encoding: 'utf8'});

    btContext.BT.curFile = p;
    btContext.BT.curPath = curDir;

    vm.runInContext(c,btContext,p);

    btContext.BT.curFile = cFile; // restore
    btContext.BT.curPath = cPath;
  }
});

// now, we include a few files from lib and run them through the env

var files = ['lib/enhance_env.js','lib/project.js','lib/appbuilder.js','lib/api.js','lib/framework.js'];

files.forEach(function(f){
  var p = path.join(dirname,f);
  var c = fs.readFileSync(p,{ encoding: 'utf8'}); // this is allowed to throw
  if(c){
    vm.runInContext(c, btContext, p);
  }
});

// now we have everything running, take the config file

module.exports.startDevServer = function(projectpath){
  try {
    var p = path.join(projectpath,'sc_config');
    var c = fs.readFileSync(p,{ encoding: 'utf8'});
    btContext.BT.projectDir = projectpath;
    btContext.BT.curPath = projectpath;
    btContext.BT.curFile = p;
    vm.runInContext(c,btContext,p);
    //util.log('SC.projectManager: ' + util.inspect(btContext.BT.projectManager));
    //util.log('TestObject: ' + util.inspect(btContext.TestObject));
    util.log("appOne: " + util.inspect(btContext.BT.projectManager.apps));
  }
  catch(e){
    if(e.code === 'ENOENT'){
      util.log("You did not create a valid project config file");
      throw e;
    }
    else {
      util.log('unknown error in %@: %@'.fmt(p,util.inspect(e)));
    }
  }
};

//vm.runInContext(btContext,)