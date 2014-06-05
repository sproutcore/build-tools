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

  language: 'any',

  urlTemplate: function () {
    if (BT.runMode === BT.RM_DEBUG) {
      return "/%{appName}/%{frameworkName}/%{relativePath}";
    }
    else {
      return "/static/%{frameworkName}/%{language}/%{frameworkContentHash}/%{relativePath}";
    }
  }.property().cacheable(),

  // relative path to framework root
  relativePath: function () {
    var pathlib = require('path');
    var relp = pathlib.relative(this.getPath('framework.path'), this.get('path'));
    //SC.Logger.debug("relp: " + relp);
    // SC.Logger.debug("BT.File#relativePath: framework.path: %@, this.path: %@, relpath: %@, framework.fullname: %@".fmt(
    //   this.getPath('framework.path'),
    //   this.get('path'),
    //   relp,
    //   this.getPath('framework.fullname')));
    //var ret = pathlib.join(this.getPath('framework.fullname'), relp);
    return BT.path2Url(relp);
  }.property('path', 'framework').cacheable(),

  // pending the PR request https://github.com/sproutcore/sproutcore/pull/1240 this stays the
  // way it is...
  url: function () {
    //return this._generateUrl(this.getPath('framework.belongsTo.language'));
    return this.get('staticUrl');
  }.property(),

  contentForPath: function (path) {
    return this.get('content');
  },

  staticUrl: function () {
    //return this._generateUrl(this.get('language'));
    var urlTemplate = this.get('urlTemplate');
    urlTemplate = (urlTemplate[urlTemplate.length - 1] === "/") ? urlTemplate.substr(0, urlTemplate.length - 1) : urlTemplate;
    return urlTemplate.fmt(this);
  }.property('relativePath').cacheable(),

  // set of computed properties for url

  appName: function () {
    return this.getPath('framework.belongsTo.name');
  }.property('belongsTo').cacheable(),

  frameworkName: function () {
    return this.getPath('framework.fullname');
  }.property('framework').cacheable(),

  shortFrameworkName: function () {
    return this.getPath('framework.name');
  }.property('framework').cacheable(),

  frameworkContentHash: function () {
    return this.getPath('framework.contentHash');
  }.property(),

  fileContentHash: function () {
    return this.get('contentHash');
  }.property(),

  // extension: function () {
  //   return this.get('extname');
  // }.property('exname').cacheable(),

  // _generateUrl: function (language) {
  //   var urlTemplate = this.get('urlTemplate');
  //   urlTemplate = (urlTemplate[urlTemplate.length - 1] === "/") ? urlTemplate.substr(0, urlTemplate.length - 1) : urlTemplate;
  //   var framework = this.get('framework');
  //   var opts = {
  //     appName: framework.getPath('belongsTo.name'),
  //     frameworkName: framework.get('fullname'),
  //     shortFrameworkName: framework.get('name'),
  //     language: language,
  //     frameworkContentHash: framework.get('contentHash'),
  //     fileContentHash: this.get('contentHash'),
  //     relativePath: this.get('relativePath'),
  //     extension: this.get('extname'),
  //     basename: this.get('basename')
  //   };
  //   return urlTemplate.fmt(opts);
  // },

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
    return this.parseContent();
  }.property('rawContent').cacheable(),

  // this is the raw file content
  rawContent: null,

  // function called to parse content;
  parseContent: function () {
    return this.get('rawContent');
  },

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
    sc_super();
    //this.set('path', this.path);
    //this.set('watchForChanges', this.watchForChanges);
    //this.pathDidChange();
    this.resourceDependencies = BT.DependenciesController.create();
  },

  destroy: function () {
    this.set('rawContent', ""); // trigger any observers to update
    sc_super();
  },

  contentHash: function () {
    var crypto = require('crypto');
    var c = this.get('rawContent');
    if (c) {
      return crypto.createHash('sha1').update(c, 'utf8').digest('hex');
    }
  }.property('rawContent').cacheable(),

   // error: null,

  // content: null,

  // this file type can depend on external files, and the saving process needs to be made aware of this
  resourceDependencies: null,

  handleStatic: function (file, opts) {
    // replace sc_static or static_url with the actual url
    var scstaticRegex = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+?)['\"]\\s*\\)");
    //match[3] contains the filename
    //
    var resourceDeps = this.resourceDependencies;
    var staticFound = file.search(scstaticRegex) >= 0;
    if (!staticFound) return file; // not found, don't do a thing

    var pathlib = require('path');
    var fw = this.get('framework');
    var app = fw.get('belongsTo');
    var lines = file.split("\n");
    var klassName = SC._object_className(this.constructor);
    var ret = [];
    lines.forEach(function (line) {
      var match, fn, res, f, fwForFile;
      // scan for every line if it contains scstatic
      match = scstaticRegex.exec(line);
      if (match) {
        fn = match[3];
        // now search for fn in the current fw
        if (fn.indexOf(":") > -1) {
          // we have a framework reference...
          // meaning we need to find the other framework in order to know which file we are targeting here
          // syntax is [fwname]:[filename]
          //SC.Logger.debug("app._fws: " + fw.get('belongsTo')._fws);
          var fwref = fn.substr(0, fn.lastIndexOf(":")); // lastIndex to catch longer refs, such as sproutcore:foundation
          var newfn = fn.substr(fn.lastIndexOf(":") + 1);
          //SC.Logger.debug("fwref of crossfw sc_static: " + fwref + " and fn " + newfn);
          // problems arise because of incomplete refs (foundation instead of sproutcore:foundation)
          var crossFw = app._fws.findProperty('ref', fwref);
          if (!crossFw) crossFw = app._fws.findProperty('name', fwref);
          if (!crossFw) {
            SC.Logger.warn(klassName+"#handleStatic: %@ is referred in %@ but this framework is still not loaded.".fmt(match[0], this.get('path')));
            ret.push(line.replace(scstaticRegex, '""')); // replace with empty string...
            return;
          }
          fwForFile = crossFw;
          fn = newfn;
        }
        else fwForFile = fw;

        res = this.findFwResourceFor(fwForFile, fn, opts);
        
        if (res.length === 0) {
          SC.Logger.warn(klassName+"#handleStatic: found no files for %@ in file %@".fmt(match[0], this.get('path')));
          ret.push(line.replace(scstaticRegex, '""')); // replace with empty string...
          return;
        }
        if (res.length > 1) {
          SC.Logger.warn(klassName+"#handleStatic: found multiple files for %@ in file %@, taking the first (%@)".fmt(match[0], this.get('path'), f.get('path')));
        }
        f = res[0];
        ret.push(this.replaceResourceFromLine(line, f, scstaticRegex, opts));

        // there is a resource dependency, store it, but as filename only. A file can be deleted, and then the memory
        // won't be released, as this file is still being held
        resourceDeps.addObject(f);
      }
      else {
        ret.push(line);
      }
    }, this);
    return ret.join("\n");
  },

  findFwResourceFor: function (fwForFile, fn, opts) {
    return fwForFile.findResourceFor(fn);
  },

  replaceResourceFromLine: function (line, file, scstaticRegex, opts) {
    var url = file.get('url');
    return line.replace(scstaticRegex, '"%@"'.fmt(url));
  }

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
