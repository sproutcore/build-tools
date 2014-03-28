/*
var SC = require('sc-runtime'),
    tools = require('./tools'),
    config = require('./config');

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

  extension: null,

  extname: function(){
    return BT.path.extname(this.get('path'));
  }.property('path').cacheable(),

  // isScript: function(){
  //   return config.scriptExtensions.contains(this.get('extname'));
  // }.property('extname').cacheable(),

  // isTest: function(){
  //   return this.get('isScript') && /tests\//.test(this.get('path'));
  // }.property('extname').cacheable(),

  // isStylesheet: function(){
  //   return config.stylesheetExtensions.contains(this.get('extname'));
  // }.property('extname').cacheable(),

  // isResource: function(){
  //   return config.resourceExtensions.contains(this.get('extname'));
  // }.property('extname').cacheable(),

  isThemeDefinition: function(){
    var p = this.get('path');
    if(BT.path.basename(p) === '_theme.css') return true;
    else return false;
  }.property('path').cacheable(),

  contentType: null // should be set by the extension

  // contentType: function(){
  //   return BT.projectManager.contentTypeFor(this.get('path'));
  // }.property('extname').cacheable(),
  // contentType: function(){ //perhaps do with a library
  //   var ext = this.get('extname');
  //   switch(ext){
  //     case   '.js': return 'text/javascript; charset=utf-8';
  //     case  '.css': return 'text/css; charset=utf-8';
  //     case  '.png': return 'image/png';
  //     case  '.jpg': return 'image/jpeg';
  //     case  '.gif': return 'image/gif';
  //     case '.json': return 'application/json';
  //     case  '.svg': return 'image/svg+xml';
  //     default:
  //       tools.log('WARNING: unknown content type for ' + ext);
  //       return 'type/unknown';
  //   }
  // }.property('extname').cacheable(),


  // content should be something watchable, and also any processes should end up here
  content: function(){
    return this.parseContent();
  }.property('rawContent').cacheable(),

  // this is the raw file content
  rawContent: null,

  // function called to parse content;
  parseContent: function(){
    return this.get('rawContent');
  },

  // sets in motion reading the file
  pathHasChanged: function(){
    BT.FSManager.perform('readFile',this.get('path')).notify(this,this._readFile);
  }.observes('path'),

  _readFile: function(result){
    if(SC.ok(result)){
      this.set('rawContent',result);
    }
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
