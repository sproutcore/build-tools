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

  path: function () {
    return this.getPath('rawFile.path');
  }.property('rawFile').cacheable(),

  framework: null,

  language: function () {
    return this.getPath('rawFile.language') || "any";
    //return this.getPath('framework.belongsTo.language');
  }.property('rawFile').cacheable(),

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
  }.property(),

  // set of computed properties for url

  appName: function () {
    return this.getPath('framework.belongsTo.name');
  }.property(),

  frameworkName: function () {
    return this.getPath('framework.fullname');
  }.property(),

  shortFrameworkName: function () {
    return this.getPath('framework.name');
  }.property(),

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
    //return require('path').extname(this.get('path'));
    return this.getPath('rawFile.extname');
  }.property('rawFile').cacheable(),

  basename: function () {
    //return require('path').basename(this.get('path'));
    return this.getPath('rawFile.basename');
  }.property('rawFile').cacheable(),

  contentType: null, // should be set by the extension

  // content should be something watchable, and also any processes should end up here
  content: function () {
    return this.parseContent();
  }.property('rawContent').cacheable(),

  // this is the raw file content
  rawContent: function (key, value) {
    if (value !== undefined) { // we are being set, this happens for combined files, especially css files
      BT.Logger.trace("setting rawContent of %@".fmt(this.get('path'), value));
      this._storedRawContent = value;
    }
    else {
      if (this._storedRawContent) {
        BT.Logger.trace("retrieving stored rawContent of " + this.get('path'));
        return this._storedRawContent;
      }
      else {
        BT.Logger.trace("retrieving rawContent of " + this.get('path'));
        return this.getPath('rawFile.content') || "";
      }
    }
  }.property(),

  _storedRawContent: null,

  /**
   * here the raw file will be set
   * @type {BT.RawFile}
   */
  rawFile: null,

  // function called to parse content;
  parseContent: function () {
    return this.get('rawContent');
  },

  init: function () {
    sc_super();
    this.resourceDependencies = BT.DependenciesController.create();
    var rawFile = this.get('rawFile');
    //if (!rawFile) BT.Logger.debug("Problem? file %@ doesn't have a rawFile??".fmt(this._debugPath));
    if (rawFile) rawFile.addObserver('content', this, this.rawContentDidChange);
  },

  rawContentDidChange: function () {
    this.notifyPropertyChange('rawContent');
  },

  destroy: function () {
    //this.set('rawContent', ""); // trigger any observers to update
    this.notifyPropertyChange('rawContent');
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
    var scstaticRegex = new RegExp("(sc_static|static_url)\\(\\s*(['\"])(resources\/){0,1}(.+?)['\"]\\s*\\)", 'g');
    //match[3] contains the filename
    var isLastStageInBuild = opts && opts.lastStageInBuild; // this triggers a different discovery mechanism

    var resourceDeps = this.resourceDependencies;
    var staticFound = file.search(scstaticRegex) >= 0;
    if (!staticFound) {
      if (isLastStageInBuild) {
        BT.Logger.warn("a last stage file without a match?? " + this.get('path'));
      }
      return file; // not found, don't do a thing
    }

    var fw = this.get('framework');
    var app = fw.get('belongsTo');
    var lines = file.split("\n");
    var klassName = SC._object_className(this.constructor);
    var ret = [];
    lines.forEach(function (line, line_index) {
      var match, matchText, matchIndex, fn, separator, res, f, fwForFile;

      // scan for every line if it contains scstatic
      // since sc_static may not be replaced immediatly in build mode we make sure to no match twice the same part.
      while (match = scstaticRegex.exec(line)) {
        if (isLastStageInBuild && match) BT.Logger.trace("line %@ in %@ and found match: %@".fmt(line_index, this.get('path'), match[3]));
        matchText = match[0];
        separator = match[2];
        matchIndex = match.index;
        fn = match[4];

        if (isLastStageInBuild) {
          // we search for the fn in the resourceDependencies
          if (opts && opts.x2) {
            var newfnx2 = BT.url2x2(fn);
            res = this._filterResourceDependencies(newfnx2);
          }
          if (!res || !res.length) res = this._filterResourceDependencies(fn);

          BT.Logger.trace("isLastStageInBuild: content of res is " + res.get('length'));
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
              BT.Logger.warn(klassName + "#handleStatic: %@ is referred in %@ but this framework is still not loaded.".fmt(matchText, this.get('path')));
              line = line.replace(matchText, '""'); // replace with empty string...
              continue;
            }
            fwForFile = crossFw;
            fn = newfn;
          }
          else fwForFile = fw;

          res = this.findFwResourceFor(fwForFile, fn, opts);
        }

        if (res.length === 0) {
          BT.Logger.warn(klassName + "#handleStatic: found no files for %@ in file %@".fmt(matchText, this.get('path')));
          line = line.replace(matchText, '""'); // replace with empty string...
          continue;
        }
        else if (res.length > 1) {
          BT.Logger.warn(klassName + "#handleStatic: found multiple files for %@ in file %@, taking the first (%@)".fmt(matchText, this.get('path'), f.get('path')));
        }
        f = res[0];
        line = this.replaceResourceFromLine(line, f, matchText, matchIndex, separator, opts);

        // there is a resource dependency, store it, but as filename only. A file can be deleted, and then the memory
        // won't be released, as this file is still being held
        resourceDeps.addObject(f);

        BT.Logger.trace("#handleStatic: %@ has been replaced in %@.".fmt(matchText, line));
      }

      ret.push(line);

    }, this);
    return ret.join("\n");
  },

  findFwResourceFor: function (fwForFile, fn, opts) {
    return fwForFile.findResourceFor(fn);
  },

  replaceResourceFromLine: function (line, file, matchText, matchIndex, separator, opts) {
    // the full replace should only take place when in
    // - debug mode
    // - build mode with lastStageInBuild

    var shouldReplace = BT.runMode === BT.RM_DEBUG || (BT.runMode === BT.RM_BUILD && opts && opts.lastStageInBuild);

    if (shouldReplace) {
      line = this._removeBtScstaticMarker(line, matchText, matchIndex, separator);

      var url = file.get('url');
      if (BT.runMode === BT.RM_BUILD && this.getPath('framework.relativeBuild')) {
        url = this.get('relativeUrl');
      }
      return line.replace(matchText, separator + url + separator);
    }
    else { // we should check whether the line already is parsed once
      return this._addBtScstaticMarker(line, matchText, matchIndex, separator);
    }

  },

  relativeUrl: function () {
    var pathlib = require('path');
    var indexUrl = this.getPath('framework.belongsTo.indexHtmlFile.url');
    return pathlib.relative(indexUrl, this.get('url')).replace("../", "");
  }.property(),

  _filterResourceDependencies: function (fn) {
    var res = this.resourceDependencies;

    return res.filter(function (file) {
      var newfn;
      if (fn.indexOf(":") > -1) {
        newfn = fn.substr(fn.lastIndexOf(":") + 1);
      }
      else newfn = fn;

      return file.get('path').indexOf(newfn) > -1;
    });
  },

  _addBtScstaticMarker: function (line, matchText, matchIndex, separator) {
    // we need to catch existing comments, otherwise our commenting won't work
    var sep = separator === '"' ? "'" : '"';
    line = line.substr(0, matchIndex) + sep + "BT_SCSTATIC" + line.substr(matchIndex, matchText.length) + sep + line.substr(matchIndex + matchText.length);

    return line;
  },

  _removeBtScstaticMarker: function (line, matchText, matchIndex, separator) {
    if (line.indexOf("BT_SCSTATIC") > -1) {
      var sep = separator === '"' ? "'" : '"';

      line = line.replace(sep + "BT_SCSTATIC" + matchText + sep, matchText);
    }

    return line;
  }

});
