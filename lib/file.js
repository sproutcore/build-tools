/*jshint node:true*/
/* globals BT */

/*
  A file is a representation of a file on disk
  Caching of the file contents is done in the object itself.
  This means that a single file can exist multiple times in memory.
  This seems like overkill, but the amount of memory is pretty small
  and because of framework configurations the effect on the output of
  the file can differ wildly.

  Every file has a reference to the framework it belongs to.

  Every file will get an url, which is the name of the framework,
  plus the internal path inside the framework

*/


BT.File = SC.Object.extend({

  isFile: true, // walk like a duck

  path: null,

  framework: null,

  urlTemplate: function () {
    if (BT.runMode === "debug") {
      return "%{appName}/%{frameworkName}/%{relativePath}";
    }
    else {
      return "/static/%{frameworkName}/%{language}/%{frameworkContentHash}/%{relativePath}";
    }
  }.property().cacheable(),

  // relative path to framework root
  relativePath: function () {
    var pathlib = require('path');
    var relp = pathlib.relative(this.getPath('framework.path'), this.get('path'));
    //SC.Logger.log("relp: " + relp);
    // SC.Logger.log("BT.File#relativePath: framework.path: %@, this.path: %@, relpath: %@, framework.fullname: %@".fmt(
    //   this.getPath('framework.path'),
    //   this.get('path'),
    //   relp,
    //   this.getPath('framework.fullname')));
    //var ret = pathlib.join(this.getPath('framework.fullname'), relp);
    return BT.path2Url(relp);
  }.property('path', 'framework', 'urlPrefix').cacheable(),

  url: function () {
    var urlTemplate = this.get('urlTemplate');
    urlTemplate = (urlTemplate[urlTemplate.length - 1] === "/") ? urlTemplate.substr(0, urlTemplate.length - 1) : urlTemplate;
    var opts = {
      appName: this.getPath('framework.belongsTo.name'),
      frameworkName: this.getPath('framework.fullname'),
      shortFrameworkName: this.getPath('framework.name'),
      language: this.getPath('framework.language'),
      frameworkContentHash: this.getPath('framework.contentHash'),
      fileContentHash: this.get('contentHash'),
      relativePath: this.get('relativePath'),
      extension: this.get('extname'),
      basename: this.get('basename')
    };
    return urlTemplate.fmt(opts);
  }.property('relativePath', 'path', 'urlPrefix').cacheable(),

  extension: null,

  extname: function () {
    return require('path').extname(this.get('path'));
  }.property('path').cacheable(),

  basename: function () {
    return require('path').basename(this.get('path'));
  }.property('path').cacheable(),

  contentType: null, // should be set by the extension

  // content should be something watchable, and also any processes should end up here
  content: function () {
    //SC.Logger.log("content of %@ calculated".fmt(this.get('path')));
    return this.parseContent();
  }.property('rawContent').cacheable(),

  // this is the raw file content
  rawContent: null,

  // function called to parse content;
  parseContent: function () {
    return this.get('rawContent');
  },

  // sets in motion reading the file
  pathDidChange: function () {
    // SC.Logger.log("pathDidChange for " + this.get('path'));
    BT.FSManager.perform('readFile', this.get('path')).notify(this, this._readFile);
  }.observes('path'),

  _readFile: function (result) {
    if (SC.ok(result)) {
      this.set('rawContent', result);
    }
  },

  fileDidChange: function () {
    //BT.FSManager.perform('readFile', this.get('path')).notify(this, this._readFile).start();
    BT.FSRequest.create().perform('readFile', this.get('path')).notify(this, this._readFile).start();
  },

  init: function () {
    //this.set('path', this.path);
    //this.set('watchForChanges', this.watchForChanges);
    //this.pathDidChange();
  },

  destroy: function () {
    this.deleteWatcher();
    this.set('rawContent', ""); // trigger any observers to update
    sc_super();
  },

  contentHash: function () {
    var crypto = require('crypto');
    var c = this.get('content');
    if (c) {
      return crypto.createHash('sha1').update(c, 'utf8').digest('hex');
    }
  }.property('content').cacheable(),

   // error: null,

  // content: null,



  // mtimeDidChange: function(){
  //   console.log('mtimeDidChange observer fired');
  //   if(this.get('mtime') !== this.get('prevmtime')){
  //     this.retrieveContent();
  //   }
  //   else {
  //     this._triggerContentCallbacks();
  //   }
  // }.observes('mtime'),

  // contentDidChange: function(){ // to trigger callback calling
  //   if(this.get('isScript')){
  //     this.content = tools.rewriteSuper(this.content); // don't trigger observers
  //   }
  //   this._triggerContentCallbacks();
  // }.observes('content'),

  // _triggerContentCallbacks: function(){
  //   var c = this.get('content');
  //   var cb;
  //   if(!this._cbs) return; // don't do a thing when no callbacks are registered
  //   for(var i=0,len=this._cbs.length;i<len;i+=1){
  //     cb = this._cbs.pop();
  //     cb(c);
  //   }
  // },

  // _cbs: null,

  // read: function(callback){
  //   if(!this._cbs) this._cbs = [];
  //   this._cbs.push(callback);
  //   this.checkMTime();
  // }

});
