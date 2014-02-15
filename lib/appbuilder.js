// var SC = require('sc-runtime');

// var fs = require('fs');
// var path = require('path');

BT.AppBuilder = SC.Object.extend({
  concatenatedProperties: ['frameworks','modules'],

  name: function(){ // name of the application
    return BT.path.basename(this.get('path'));
  }.property('path'),


  path: null, // path of the app inside the project

  frameworks: null, // frameworks needed for this application, will be instantiated in place

  modules: null, // modules belonging to this application, will be instantiated in place

  includeSC: true, // whether this app uses Sproutcore,

  init: function(){
    BT.projectManager.addApp(this);
    if(this.frameworks && frameworks.indexOf('sproutcore') === -1){
      this.frameworks.unshift("sproutcore");
    }
    if(!this.frameworks && this.includeSC){
      this.frameworks = ["sproutcore"];
    }
    this._instantiateFrameworks();
  },


  _instantiateFrameworks: function(){
    // take the frameworks, and instantiate in place
    this._fws = this.frameworks.map(function(fwref){
      var k;
      if(SC.typeOf(fwref) === SC.T_STRING){
        k = BT.projectManager.getFrameworkClass(fwref);
      }
      else k = fwref;
      return k.create();
    });
  }

});

