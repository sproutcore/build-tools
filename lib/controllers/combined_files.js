/*jshint node:true*/
/*globals BT*/

BT.CombinedFileMixin = {
  parseContent: function (opts) { // yes this is a bit of a hack, but we need the correct type of file
    var x2 = opts && opts.x2,
        r, ret;

    if (this._combineContent && opts && opts.lastStageInBuild) {
      this._combineContent(); // just run one more time for safety's sake
    }

    r = x2 ? this.get('rawContent2x') : this.get('rawContent');

    if (r === undefined) {
      BT.Logger.warn("%@ doesn't seem to have a rawContent?".fmt(this.get('path')));
    }
    r = r.toString();

    // filter r for double partials
    var partialPaths = {}, tmpPath, tmpEnd;

    var partialStartRegex = /\/\*BT_PARTIAL_START\((.+?)\)\*\//;
    var partialEndRegex = /\/\*BT_PARTIAL_END\((.+?)\)\*\//;
    var match, newr = "";

    if (r.indexOf("BT_PARTIAL_START") > -1) {
      while (r.length > 0) {
        if (match = partialStartRegex.exec(r)) {
          tmpPath = match[1];
          newr += r.slice(0, match.index);
          if (!partialPaths[tmpPath]) {
            partialPaths[tmpPath] = 1; // just set it to something
            // find the next end, then copy the block to newr
            tmpEnd = partialEndRegex.exec(r);
            newr += r.slice(match.index, tmpEnd.index + tmpEnd[0].length);
            // set r to the rest
            r = r.slice(tmpEnd.index + tmpEnd[0].length);
          }
          else { // the path does already exist, we need to cut the content
            tmpEnd = partialEndRegex.exec(r);
            r = r.slice(tmpEnd.index + tmpEnd[0].length);
          }
        }
        else {
          newr += r;
          r = "";
        }
      }
      r = newr;
    }

    var isLastStageInBuild = BT.runMode === BT.RM_BUILD && opts && opts.lastStageInBuild;
    var shouldMinify = this.shouldMinify && (BT.runMode === BT.RM_DEBUG || isLastStageInBuild);

    if (r.indexOf("BT_SCSTATIC") > -1) {
      BT.Logger.trace("BT.CombinedFileMixin#parseContent: found lines to replace in " + this.get('path'));
      if (isLastStageInBuild) {
        BT.Logger.trace("BT.CombinedFileMixin#parseContent: replacing as it is last stage in build");
        r = this.handleStatic(r, opts);
      }
    }

    if (r && shouldMinify) {
      if (BT.runBenchmarks) SC.Benchmark.start("combinedFileMinify");
      BT.Logger.trace("BT.CombinedFileMixin#parseContent: will minify " + this.get('path'));
      ret = this.minify(r);
      BT.Logger.trace("BT.CombinedFileMixin#parseContent: did minify " + this.get('path'));
      if (BT.runBenchmarks) SC.Benchmark.end("combinedFileMinify");
      return ret;
    }
    else return r;
  }
};

BT.CombinedFilesController = SC.ArrayController.extend({
  relpath: null,
  contentType: null,
  filesToCombine: null,
  filesDidChange: null,
  _combinedFile: null,
  minify: false,
  framework: null,
  outputFileClass: null, // decides what kind of output there will be
  resourceDependencies: null,
  language: "any",

  init: function () {
    sc_super();
    this.filesToCombineDidChange(); // make sure this fires
  },

  filesToCombineDidChange: function () {
    BT.Logger.trace("filesToCombineDidChange: %@".fmt(this.get('relpath')));
    //if (!this.get('finishedLoading')) return; // nothing yet to do that cannot be done later...

    var files = this.get('filesToCombine');
    if (!files) return;

    if (BT.runBenchmarks) SC.Benchmark.start('CombinedFilesController:filesToCombineDidChange');
    var o = this._combinedFile;
      //resourceDeps = BT.DependenciesController.create();

    if (!o) { // no combined file means also no content
      o = this.get('outputFileClass').create(BT.CombinedFileMixin, {
        framework: this.get('framework'),
        path: this.get('relpath'),
        shouldMinify: this.get('minify'),
        relativePath: this.get('relpath'),
        parent: this,
        resourceDependencies: BT.DependenciesController.create(),

        _combineContent: function () {
          var ret = [], ret2x = [];
          var resDeps = [];
          var resourceDeps = this.get('resourceDependencies');
          var files = this.getPath('parent.filesToCombine');
          var lang = this.getPath('parent.language');
          files.forEach(function (f) {
            var flang = f.get('language');
            if (flang !== "any" && flang !== lang) return; // skip this file, as it is not the right language
            ret.push("/* begin of file %@ */".fmt(f.get('path')));
            ret.push(f.get('content') || "");
            ret.push('/* end of file %@ */'.fmt(f.get('path')));

            // This is specific to CSS files
            if (f.get('has2x')) {
              ret2x.push("/* begin of file %@ */".fmt(f.get('path')));
              ret2x.push(f.get('content2x') || "");
              ret2x.push('/* end of file %@ */'.fmt(f.get('path')));
            }

            f.get('resourceDependencies').forEach(function (rd) {
              if (!resDeps.contains(rd)) resDeps.push(rd);
            });
          });
          this.set('rawContent', ret.join("\n"));
          this.set('rawContent2x', ret2x.join("\n"));
          resourceDeps.set('content', resDeps);
        },

        content: function () {
          this._combineContent();
          return sc_super();
        }.property(),

        content2x: function () {
          this._combineContent();
          return sc_super();
        }.property(),

        rawContent: "", // overwriting the default computed property on purpose
        rawContent2x: ""
        // minifying will be looked up by the file on the framework
      });
      // only set the contentType when it is actually needed
      if (this.get('contentType')) o.set('contentType', this.get('contentType'));
      this._combinedFile = o;
      this.set('content', [o]);
    }
    // now update the content
    // var ret = [], // make sure there is always something, even if there is no content
    //   ret2x = [];


    // o.set('rawContent', ret.join("\n"));
    // o.set('rawContent2x', ret2x.join("\n"));
    // o.set('resourceDependencies', resourceDeps);
    if (BT.runBenchmarks) SC.Benchmark.end('CombinedFilesController:filesToCombineDidChange');
  }.observes('filesDidChange', 'finishedLoading')

});