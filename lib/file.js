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

  framework: null, // perhaps not necessary

  relativePath: function () {
    var pathlib = require('path');
    var relp = pathlib.relative(this.getPath('framework.path'), this.get('path'));
    return pathlib.join(this.getPath('framework.fullname'), relp);
  }.property('path', 'framework').cacheable(),

  extension: null,

  watchForChanges: false,

  extname: function () {
    return require('path').extname(this.get('path'));
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

  _watcher: null,

  // add or remove a watcher
  // implement a default nodejs watcher for the moment
  watchForChangesDidChange: function () {
    if (this.get('watchForChanges')) {
      this._watcher = BT.FSManager.perform('watchFile', this.get('path'))
          .unschedule().notify(this, this._fileDidChange);
    }
    else if (this._watcher) {
      this._watcher.returnValue.close();
      this._watcher.destroy();
      this._watcher = null;
    }
  }.observes('watchForChanges'),

  _fileDidChange: function (evt) {
    if (evt === 'change') {
      BT.FSManager.perform('readFile', this.get('path')).notify(this, this._readFile).start();
    }
  },

  init: function () {
    //this.set('path', this.path);
    //this.set('watchForChanges', this.watchForChanges);
    //this.pathDidChange();
    this.watchForChangesDidChange();
  }

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
