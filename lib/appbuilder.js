// var SC = require('sc-runtime');

// var fs = require('fs');
// var path = require('path');

BT.AppBuilder = SC.Object.extend({
  concatenatedProperties: ['frameworks','modules'],

  name: null, // name of the application

  path: null, // path of the app inside the project

  frameworks: null, // frameworks needed for this application, will be instantiated in place

  modules: null, // modules belonging to this application, will be instantiated in place

  includeSC: true, // whether this app uses Sproutcore,

  init: function(){
    BT.projectManager.addApp(this);
  }
});

BT.AppBuilder.from = function(value) {
  var args = SC.A(arguments); args.shift();
  var func = function() {
    var klass = SC.objectForPropertyPath(value);
    if (!klass) {
      console.error('SC.State.plugin: Unable to determine path %@'.fmt(value));
      return undefined;
    }
    if (!klass.isClass || !klass.kindOf(BT.AppBuilder)) {
      console.error('SC.State.plugin: Unable to extend. %@ must be a class extending from BT.AppBuilder'.fmt(value));
      return undefined;
    }
    return klass.extend.apply(klass, args);
  };
  func.AppBuilderPlugin = true;
  return func;
};