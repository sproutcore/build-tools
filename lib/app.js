var SC = require('sc-runtime');
var Framework = require('./framework');

var App = SC.Object.extend({

  concatenatedProperties: ['frameworks','modules'],

  name: null, // name of the application

  path: null, // path of the app inside the project

  frameworks: null, // frameworks needed for this application, will be instantiated in place

  modules: null, // modules belonging to this application, will be instantiated in place

  includeSC: true, // whether this app uses Sproutcore,

  init: function(){
    // set up frameworks, add SC if defined
  }

});

module.exports = App;