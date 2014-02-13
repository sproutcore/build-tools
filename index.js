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
  fs: fs,
  projectDir: dirname,
  parseConfig: function(f){
    try{
      var p = path.join(dirname,f);
      var c = fs.readFileSync(p,{ encoding: 'utf8'});
      vm.runInContext(c,btContext,p);
      return true;
    }
    catch(e){
      return false;
    }
  },
  path: path,
  util: util
});

// now, we include a few files from lib and run them through the env

var files = ['lib/project.js','lib/appbuilder.js'];

files.forEach(function(f){
  var p = path.join(dirname,f);
  var c = fs.readFileSync(p,{ encoding: 'utf8'}); // this is allowed to throw
  if(c){
    vm.runInContext(c, btContext, p);
  }
});

//util.log("SC.ProjectManager: " + util.inspect(SC.ProjectManager));

// now we have everything running, take the config file

module.exports.startDevServer = function(projectpath){
  try {
    var p = path.join(projectpath,'sc_config');
    var c = fs.readFileSync(p,{ encoding: 'utf8'});
    vm.runInContext(c,btContext,p);
    util.log('SC.projectManager: ' + util.inspect(SC.projectManager));
  }
  catch(e){
    if(e.code === 'ENOENT'){
      throw new Error("you did not create a valid project config file");
    }
    else {
      util.log('unknown error in %@: %@'.fmt(p,util.inspect(e)));
    }
  }
};

//vm.runInContext(btContext,)