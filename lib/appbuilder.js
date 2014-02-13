// var SC = require('sc-runtime');

// var fs = require('fs');
// var path = require('path');

SC.AppBuilder = SC.Object.extend({
  concatenatedProperties: ['frameworks','modules'],

  name: null, // name of the application

  path: null, // path of the app inside the project

  frameworks: null, // frameworks needed for this application, will be instantiated in place

  modules: null, // modules belonging to this application, will be instantiated in place

  includeSC: true, // whether this app uses Sproutcore,
});

SC.AppBuilder.create = function(){
  // we need to add something in order to register at the projectmanager
  var C =this, ret = new C(arguments);
  if (SC.ObjectDesigner) {
    SC.ObjectDesigner.didCreateObject(ret, SC.$A(arguments));
  }
  SC.projectManager.addApp(ret);
  return ret ;
};