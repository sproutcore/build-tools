var SC = require('sc-runtime');
var path = require('path');

var Framework = SC.Object.extend({
  isFramework: true,
  isFrameworkBundle: false,
  path: null,
  combineScripts: true,
  combineStylesheets: true,
  minifyScripts: false,
  minifyStylesheets: false,
  defaultLanguage: 'english',
  createSprite: false,
  defaultScriptExtensions: ["js"],
  defaultStylesheetExtensions: ["css"],
  defaultResourceExtensions: ["png","jpg", "jpeg", "gif", "svg"],

  // can also be solved by concatenatedProperties!!
  /*
    array, to put extra extensions, three options:
    - "coffee" if no specific parsing is needed
    - { coffee: "gulp-plugin" } where gulp-plugin is the module to require
    - { coffee: gulp-plugin } where gulp-plugin is a reference to the function to call
   */

  scriptExtensions: null,
  stylesheetExtensions: null,
  resourcesExtensions: null,

  includeTests: false,
  includeFixtures: true,

  gulpConfig: null, // place for the gulp config of this framework

  init: function(){

  },

  setupGulpPatterns: function(){
    var p, scriptsPattern, stylesheetsPattern, resourcesPattern;

    p = this.get('path');
    if(!p) throw new Error("Framework: a framework needs a path");

    // detect frameworks folder, if there is one, we are a frameworkBundle
    // if that is the case, just set this.isFrameworkBundle to true
    // all specific information should be a computed property which decides what to give back exactly.

    if(this.isFrameworkBundle) return;

    var makePattern = function(ext,negative){
      var ret = path.join(p,"**","*." + ext);
      if(negative) ret = "!" + ret;
      return ret;
    };
    scriptsPattern = this.get('defaultScriptExtensions').map(function(ext){
      return path.join(p,"**","*." + ext);
    });

    if(!includeFixtures) scriptsPattern.push("!" + path.join(p,"fixtures","*"));
    if(!includeTests) scriptsPattern.push("!" + path.join(p,"tests","*"));
  },

  name: function(){
    var p = this.get('path'); // assume we have one, as init checks
    // just get the last name from the path and take that
    // so "frameworks/sproutcore/frameworks/desktop" should become "desktop"
  }.property('path').cacheable(),

  reference: function(){
    // generate the reference from the path
    // "frameworks/sproutcore/frameworks/desktop" should become "sproutcore:desktop"
  }.property('path').cacheable()
});

module.exports = Framework;