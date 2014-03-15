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
    SC.Logger.log("instantiating fws");
    // The idea here is that frameworks export their dependencies, so
    // a one dimensional list can be made here which orders them correctly
    // and make the list contain only unique values.
    // After that the frameworks are instantiated one by one

    var deps = [];
    this.frameworks.forEach(function(fw){
      var ddeps;
      // if(fw.prototype && fw.prototype.isApp) return; // don't process apps...
      var ref = (SC.typeOf(fw) === SC.T_STRING)? fw: fw.ref;
      var fwclass = BT.projectManager.getFrameworkClass(ref);
      if(!fwclass) BT.util.log("Could not find referenced framework: " + ref);
      else {
        ddeps = fwclass.dependencies();
        // filter out any duplicates
        var ret = [];
        ddeps.forEach(function(dd){
          var r = (SC.typeOf(dd) === SC.T_STRING)? dd: dd.ref;
          // doesn't occur in ret in either string form or prop form
          if(ret.indexOf(r) === -1 && !ret.findProperty("ref",r)){
            ret.push(dd);
          }
        });
        deps = deps.concat(ret);
      }
    },this);

    if(this.includeSC){
      deps.push("sproutcore:bootstrap");
    }

    BT.util.log("deps for %@ are: %@".fmt(this.get('name'), BT.util.inspect(deps)));

    // take the frameworks, and instantiate in place
    this._fws = deps.map(function(fwref){
      var k;
      if(SC.typeOf(fwref) === SC.T_STRING){
        k = BT.projectManager.getFrameworkClass(fwref);
        return k.create();
      }
      else {
        k = BT.projectManager.getFrameworkClass(fwref.ref);
        fwref.ref = undefined;
        return k.create(fwref[BT.runMode]); // apply either debug or production settings
      }
    });

    this._fws.push(BT.Framework.create({
      path: this.path,
      isApp: true
    }));
  },

  indexHtml: function(){
    // return some basic html, which also refers any files in the right order
    var appname = this.get('name');
    var ret = ["<html>"];
    ret.push("<body>");
    this._fws.forEach(function(fw){
      ret.push("<p>%@</p>".fmt(fw.ref));
      ret.push("<ul>");
      if(fw.files){
        Object.keys(fw.files).forEach(function(f){
          var url = BT.path.join(appname, f.replace(BT.projectPath,"").replace(/\/frameworks/g,""));
          ret.push('<li><a href="%@">%@</a> </li>'.fmt(url,f));
        });
      }
      ret.push("</ul>");
    });
    ret.push("</body></html>");
    return ret.join("\n");
  }.property(),

  // the url layout should be
  // [appname]/[fwname]/[subfwname]/[file]
  // which essentially means this app will get the request because of the file being in this app
  // fwname/subfwname allows us to detect which fw, can be translated to fwref format
  //
  fileContentsFor: function(url){
    var fwurl = url.split("/").slice(1).join("/");
    var f;
    //var ret = "fileContentsFor: " + url.split("/").slice(1).join("/");
    for(var i=0,len=this._fws.length;i<len;i+=1){
      f = this._fws[i].files[fwurl];
      if(f){
        return f.contents;
      }
    }

    // first try a match with all the frameworks


    //
    //

  }


});

