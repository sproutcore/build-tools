BT.ScriptFile = BT.File.extend({
  extension: "js",
  isScript: true,
  order: null, // this is where the framework will store the order of this file
  contentType: 'application/javascript',

  _replaceScSuper: function(str){
    if (/sc_super\(\s*[^\)\s]+\s*\)/.test(str)){
      SC.Logger.log("ERROR in %@:  sc_super() should not be called with arguments. Modify the arguments array instead.".fmt(this.get('path')));
    }
    if(str && str.replace){
      return str.replace(/sc_super\(\)/g, 'arguments.callee.base.apply(this,arguments)');
    }
  },

  dependencies: function(){
    // find dependencies
    var c = this.get('content');
    var ext = "." + this.get('extension');
    var ret = [];
    var re = new RegExp("sc_require\\([\"'](.*?)[\"']\\)", "g");
    while (match = re.exec(c)) {
      relpath = match[1];
      relpath = (relpath.lastIndexOf(ext) === -1)? relpath + ext: relpath;
      //depFilename = BT.path.join(BT.projectPath, me.get('path'), relpath);
      // //currentFile.after(depFilename); // will automatically do the reverse lookup
      if(!ret.contains(relpath)) ret.push(relpath);
    }
    return ret;
  }.property('content').cacheable(),

  parseContent: function(){
    // replace sc_super()
    var str = this.get('rawContent');
    str = this._replaceScSuper(str);
    return str;
  }
});

BT.JSONFile = BT.File.extend({
  extension: "json",
  contentType: 'application/json'
});

BT.CSSFile = BT.File.extend({
  extension: "css",
  isStylesheet: true,
  contentType: 'text/css'
});

BT.projectManager.registerFileClass("js",BT.ScriptFile);
BT.projectManager.registerFileClass("json",BT.JSONFile);
BT.projectManager.registerFileClass("css",BT.CSSFile);