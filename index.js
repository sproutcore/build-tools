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
//var SC = require('sc-runtime'); // for now

var util = require('util');
var http = require('http');
var repl = require('repl');
var dirname = __dirname; // dirname of this file
var events = require('events');
var pathlib = require('path');

var env = require('sproutnode');

var files = [
  'lib/core.js',
  'lib/node_wrap.js',
  'lib/fs.js',
  'lib/project.js',
  'lib/file.js',
  'lib/file_types/css.js',
  'lib/file_types/image.js',
  'lib/file_types/json.js',
  'lib/file_types/script.js',
  'lib/filetypes.js',
  'lib/appbuilder.js',
  'lib/api.js',
  'lib/controllers/stylesheets',
  'lib/controllers/scripts',
  'lib/controllers/files',
  'lib/controllers/combined_files',
  'lib/framework.js',
  'extra/compass_ruby/compass.js',
  'extra/compass_ruby/stylesheets.js',
];

// we need to install some new stuff in the running context


files.forEach(function (f) {
  env.loadFile(pathlib.join(dirname,f));
});



// var btContext = vm.createContext({
//   SC: SC,
//   BT: {
//     process: process,
//     projectPath: null,
//     curFile: null,
//     curPath: null,
//     fs: fs,
//     http: http,
//     path: path,
//     util: util,
//     url: url,
//     repl: repl,
//     events: events,
//     minimatch: minimatch,
//     runConfig: function(f){
//       try {
//         var hasSCConfig = f.indexOf("sc_config") > -1;
//         var fp = hasSCConfig? f: path.join(f,"sc_config");
//         var p = path.join(btContext.BT.projectPath,fp);
//         var cFile = btContext.BT.curFile; //save
//         var cPath = btContext.BT.curPath || btContext.BT.projectPath;
//         var curDir = hasSCConfig? path.dirname(f): f;

//         btContext.BT.curFile = p;
//         btContext.BT.curPath = curDir;
//         //util.log('reading file ' + p);
//         var c = fs.readFileSync(p,{ encoding: 'utf8'});
//         //util.log('code in file: ' + c);
//         vm.runInContext(c,btContext,p);
//         btContext.BT.curFile = cFile; // restore
//         btContext.BT.curPath = cPath;
//       }
//       catch(er){
//         util.log('error when running config: ' + util.inspect(er));
//         throw er;
//       }
//     }
//   },
//   sc_require: function(f){
//     var hasSCConfig = f.indexOf("sc_config") > -1;
//     var fp = hasSCConfig? f: path.join(f,"sc_config");

//     var cFile = btContext.BT.curFile; //save
//     var cPath = btContext.BT.curPath || btContext.BT.projectPath;
//     var curDir = hasSCConfig? path.dirname(f): f;

//     var p = path.join(cPath,fp);
//     var c = fs.readFileSync(p,{ encoding: 'utf8'});

//     btContext.BT.curFile = p;
//     btContext.BT.curPath = curDir;

//     vm.runInContext(c,btContext,p);

//     btContext.BT.curFile = cFile; // restore
//     btContext.BT.curPath = cPath;
//   },

//   require: require
// });

// now, we include the files from lib and run them through the env in the right order





// files.forEach(function(f){
//   var p = path.join(dirname,f);
//   var c = fs.readFileSync(p,{ encoding: 'utf8'}); // this is allowed to throw
//   if(c){
//     if (/sc_super\(\s*[^\)\s]+\s*\)/.test(c)){
//       SC.Logger.log("ERROR in %@:  sc_super() should not be called with arguments. Modify the arguments array instead.".fmt(this.get('path')));
//     }
//     if(c && c.replace){
//       c = c.replace(/sc_super\(\)/g, 'arguments.callee.base.apply(this,arguments)');
//     }
//     vm.runInContext(c, btContext, p);
//     SC.Logger.log("ran " + f);
//   }
// });

// now we have everything running, take the config file

module.exports.startDevServer = function(projectpath, opts){
  env.setPath('BT.runMode',"debug");
  try {
    env.setPath('BT.projectPath',projectpath);
    env.setPath('BT.curPath', projectpath);
    env.setPath('BT.btPath', dirname);
    var p = pathlib.join(projectpath,'sc_config');
    env.loadFile(p); // this should actually load the config
    env.runCode("BT.projectManager.startServer();");
    if(opts.hasREPL){
      env.repl();
    }

    //env.runCode("console.log(__dirname);");
  }
  catch(e){
    util.log('error caught: ' + util.inspect(e,true,10));
    if(e.code === 'ENOENT'){
      util.log("You did not create a valid project config file");
      throw e;
    }
    else if(e.message.indexOf("EMFILE") > -1 && e.message.indexOf("Too many opened files") > -1){
      util.log("It seems your OS only allows a very limited number of open files. On OSX and Linux please run ulimit -n 4096");
      process.exit(1);
      //throw e;
    }
    else {
      throw e;
    }
  }

  // btContext.BT.runMode = "debug";
  // try {
  //   var p = path.join(projectpath,'sc_config');
  //   var c = fs.readFileSync(p,{ encoding: 'utf8'});
  //   btContext.BT.projectPath = projectpath;
  //   btContext.BT.curPath = projectpath;
  //   btContext.BT.curFile = p;
  //   vm.runInContext(c,btContext,p);
  //   vm.runInContext("BT.projectManager.startServer();", btContext);
  //   if(opts.hasREPL){
  //     repl.start({
  //       prompt: "SCBT>> "
  //     }).context = btContext;
  //   }
  //   //util.log('SC.projectManager: ' + util.inspect(btContext.BT.projectManager));
  //   //util.log('TestObject: ' + util.inspect(btContext.TestObject));
  //   //util.log("appOne: " + util.inspect(btContext.BT.projectManager.apps));
  // }
  // catch(e){
  //   util.log('error caught: ' + util.inspect(e,true,10));
  //   if(e.code === 'ENOENT'){
  //     util.log("You did not create a valid project config file");
  //     throw e;
  //   }
  //   else if(e.message.indexOf("EMFILE") > -1 && e.message.indexOf("Too many opened files") > -1){
  //     util.log("It seems your OS only allows a very limited number of open files. On OSX and Linux please run ulimit -n 4096");
  //     process.exit(1);
  //     //throw e;
  //   }
  //   else {
  //     util.log('unknown error in %@: %@'.fmt(p,util.inspect(e)));
  //     util.log('error.errorcode: ' + util.inspect(e.message));
  //     throw e;
  //   }
  //}
};

//vm.runInContext(btContext,)