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

var Project = require('./lib/project');
var autodetect = require('./lib/autodetect');

module.exports.startDevServer = function(path){
  // first do autodetection on path, which generates the entire config
  autodetect(this.path, function(config){
    var p = Project.create(config);
  });
};