/*jshint node:true*/
/*globals BT*/

BT.CombinedFileMixin = {
  parseContent: function (opts) { // yes this is a bit of a hack, but we need the correct type of file
    var x2 = opts && opts.x2,
      r = x2 ? this.get('rawContent2x') : this.get('rawContent'),
      ret;

    r = r.toString();

    var isLastStageInBuild = BT.runMode === BT.RM_BUILD && opts && opts.lastStageInBuild;
    var shouldMinify = this.shouldMinify && (BT.runMode === BT.RM_DEBUG || isLastStageInBuild);

    if (r.indexOf("BT_SCSTATIC") > -1) {
      SC.Logger.debug("BT.CombinedFileMixin#parseContent: found lines to replace in " + this.get('path'));
      if (isLastStageInBuild) {
        SC.Logger.debug("BT.CombinedFileMixin#parseContent: replacing as it is last stage in build");
        r = this.handleStatic(r, opts);
      }
    }

    if (r && shouldMinify) {
      if (BT.runBenchmarks) SC.Benchmark.start("combinedFileMinify");
      ret = this.minify(r);
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

  init: function () {
    sc_super();
    this.filesToCombineDidChange(); // make sure this fires
  },

  filesToCombineDidChange: function () {
    SC.Logger.debug("filesToCombineDidChange");
    var files = this.get('filesToCombine');
    if (!files) return;
    var o = this._combinedFile,
      resourceDeps = BT.DependenciesController.create();

    if (!o) { // no combined file means also no content
      o = this.get('outputFileClass').create(BT.CombinedFileMixin, {
        framework: this.get('framework'),
        path: this.get('relpath'),
        shouldMinify: this.get('minify'),
        relativePath: this.get('relpath')
        // minifying will be looked up by the file on the framework
      });
      // only set the contentType when it is actually needed
      if (this.get('contentType')) o.set('contentType', this.get('contentType'));
      this._combinedFile = o;
      this.set('content', [o]);
    }
    // now update the content
    var ret = [], // make sure there is always something, even if there is no content
      ret2x = [];

    files.forEach(function (f) {
      ret.push("/* begin of file %@ */".fmt(f.get('path')));
      ret.push(f.get('content') || "");
      ret.push('/* end of file %@ */'.fmt(f.get('path')));

      // This is specific to CSS files
      if (f.get('has2x')) {
        ret2x.push("/* begin of file %@ */".fmt(f.get('path')));
        ret2x.push(f.get('content2x') || "");
        ret2x.push('/* end of file %@ */'.fmt(f.get('path')));
      }

      var d = f.get('resourceDependencies');
      resourceDeps.addObjects(d);
    });
    o.set('rawContent', ret.join("\n"));
    o.set('rawContent2x', ret2x.join("\n"));
    o.set('resourceDependencies', resourceDeps);
  }.observes('filesDidChange')

});