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
    return BT.path2Url(relp);
  }.property('path', 'framework').cacheable(),

  url: function () {
    return this.get('staticUrl');
  }.property(),

  contentForPath: function (path) {
    return this.get('content');
  },

  staticUrl: function () {
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
    BT.FSRequest.create().perform('readFile', this.get('path')).notify(this, this._readFile).start();
  },

  init: function () {
    sc_super();
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
    var isLastStageInBuild = opts && opts.lastStageInBuild; // this triggers a different discovery mechanism

    var resourceDeps = this.resourceDependencies;
    var staticFound = file.search(scstaticRegex) >= 0;
    if (!staticFound) {
      if (isLastStageInBuild) {
        SC.Logger.log("a last stage file without a match?? " + this.get('path'));
      }
      return file; // not found, don't do a thing
    }

    var fw = this.get('framework');
    var app = fw.get('belongsTo');
    var lines = file.split("\n");
    var klassName = SC._object_className(this.constructor);
    var ret = [];
    lines.forEach(function (line, line_index) {
      var match, fn, res, f, fwForFile;
      // scan for every line if it contains scstatic
      //
      match = scstaticRegex.exec(line);
      //if (isLastStageInBuild && match) SC.Logger.log("line %@ in %@ and found match: %@".fmt(line_index, this.get('path'), match[3]));
      if (match) {
        fn = match[3];

        if (isLastStageInBuild) {
          // we search for the fn in the resourceDependencies
          res = resourceDeps.filter(function (file) {
            var newfn;
            if (fn.indexOf(":") > -1) {
              newfn = fn.substr(fn.lastIndexOf(":") + 1);
            }
            else newfn = fn;
            return file.get('path').indexOf(newfn) > -1;
          });
          //SC.Logger.log("isLastStageInBuild: content of res is " + res.get('length'));
        }
        else {
          // now search for fn in the current fw
          if (fn.indexOf(":") > -1) {
            // we have a framework reference, we need to find the other framework in order to know which file we are targeting here
            // syntax is [fwname]:[filename]
            var fwref = fn.substr(0, fn.lastIndexOf(":")); // lastIndex to catch longer refs, such as sproutcore:foundation
            var newfn = fn.substr(fn.lastIndexOf(":") + 1);
            // take care of problems such as incomplete refs (foundation instead of sproutcore:foundation)
            var crossFw = app._fws.findProperty('ref', fwref);
            if (!crossFw) crossFw = app._fws.findProperty('name', fwref);
            if (!crossFw) {
              SC.Logger.warn(klassName + "#handleStatic: %@ is referred in %@ but this framework is still not loaded.".fmt(match[0], this.get('path')));
              ret.push(line.replace(scstaticRegex, '""')); // replace with empty string...
              return;
            }
            fwForFile = crossFw;
            fn = newfn;
          }
          else fwForFile = fw;

          res = this.findFwResourceFor(fwForFile, fn, opts);
        }

        if (res.length === 0) {
          SC.Logger.warn(klassName + "#handleStatic: found no files for %@ in file %@".fmt(match[0], this.get('path')));
          ret.push(line.replace(scstaticRegex, '""')); // replace with empty string...
          return;
        }
        if (res.length > 1) {
          SC.Logger.warn(klassName + "#handleStatic: found multiple files for %@ in file %@, taking the first (%@)".fmt(match[0], this.get('path'), f.get('path')));
        }
        f = res[0];
        ret.push(this.replaceResourceFromLine(line, f, scstaticRegex, opts));

        // there is a resource dependency, store it, but as filename only. A file can be deleted, and then the memory
        // won't be released, as this file is still being held
        resourceDeps.addObject(f);
      }
      else {
        if (line.indexOf("background: #abc") > -1) {
          //SC.Logger.log("background: #abc detected");
          if (lines[line_index -1] && lines[line_index - 1].indexOf("/*BT_SCSTATIC") > -1){
            line = line.replace ("background: #abc", "");
          }
        }
        ret.push(line);
      }
    }, this);
    return ret.join("\n");
  },

  findFwResourceFor: function (fwForFile, fn, opts) {
    return fwForFile.findResourceFor(fn);
  },

  replaceResourceFromLine: function (line, file, scstaticRegex, opts) {
    // the full replace should only take place when in
    // - debug mode
    // - build mode with lastStageInBuild

    var shouldReplace = BT.runMode === BT.RM_DEBUG || (BT.runMode === BT.RM_BUILD && opts && opts.lastStageInBuild);

    if (shouldReplace) {
      if (line.indexOf("/*BT_SCSTATIC") > -1) {
        line = line.replace("/*BT_SCSTATIC", "");
        line = line.replace("*/", ""); // should be only one.
        line = line.replace("((", "/*").replace("))", "*/"); // change comments back
      }
      var url = file.get('url');
      if (BT.runMode === BT.RM_BUILD && this.getPath('framework.relativeBuild')) {
        url = this.get('relativeUrl');
      }
      return line.replace(scstaticRegex, '"%@"'.fmt(url));
    }
    else { // we should check whether the line already is parsed once
      if (line.indexOf("/*BT_SCSTATIC") === -1) {
        // we need to catch existing comments, otherwise our commenting won't work
        //SC.Logger.log("commenting out line in " + this.get('path'));
        //SC.Logger.log("line was: " + line);
        line = line.replace("/*", "((").replace("*/", "))");
        line = "/*BT_SCSTATIC" + line + "*/";
        //SC.Logger.log("line becomes: " + line);
      }
      return line;
    }

  },

  relativeUrl: function () {
    var pathlib = require('path');
    var indexUrl = this.getPath('framework.belongsTo.indexHtmlUrl');
    return pathlib.relative(indexUrl, this.get('url')).replace("../", "");
  }.property('url').cacheable()

});
