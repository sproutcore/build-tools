BT.ScriptFile = BT.File.extend({
  extension: "js",

  contentType: 'application/javascript',

  parseContent: function(){
    // replace sc_super()
    var str = this.get('rawContent');
    if (/sc_super\(\s*[^\)\s]+\s*\)/.test(str)){
      SC.Logger.log("ERROR in %@:  sc_super() should not be called with arguments. Modify the arguments array instead.".fmt(this.get('path')));
    }
    if(str && str.replace){
      return str.replace(/sc_super\(\)/g, 'arguments.callee.base.apply(this,arguments)');
    }
  }
});

BT.JSONFile = BT.File.extend({
  extension: "json",
  contentType: 'application/json'
});

BT.CSSFile = BT.File.extend({
  extension: "css",
  contentType: 'text/css'
});

BT.projectManager.registerFileClass("js",BT.ScriptFile);
BT.projectManager.registerFileClass("json",BT.JSONFile);
BT.projectManager.registerFileClass("css",BT.CSSFile);