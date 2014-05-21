/*jshint node:true*/
/*globals BT*/

// this is slowly starting to look like a file class...
// BT.CombinedFile = BT.File.extend({
//   content: null, // override default computed property, as it will be set directly
//   contentHash: function () {
//     var crypto = require('crypto');
//     return crypto.createHash('sha1').update(this.get('content'), 'utf8').digest('hex');
//   }.property('content').cacheable()
// });
//
BT.CombinedFileMixin = {
  parseContent: function () { // yes this is a bit of a hack, but we need the correct type of file
    var r = this.get('rawContent'), ret;
    if (r && this.shouldMinify) {
      //if (BT.runBenchmarks) SC.Benchmark.start("combinedFileMinify");
      ret = this.minify(r.toString());
      //if (BT.runBenchmarks) SC.Benchmark.end("combinedFileMinify");
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
    this.invokeNext('filesToCombineDidChange'); // make sure this fires
  },

  filesToCombineDidChange: function () {
    //SC.Logger.log("filesToCombineDidChange");
    var files = this.get('filesToCombine');
    if (!files) return;
    var o = this._combinedFile,
      resourceDependencies = [];

    if (!o) { // no combined file means also no content
      o = this.get('outputFileClass').create(BT.CombinedFileMixin, {
        framework: this.get('framework'),
        path: this.get('relpath'),
        shouldMinify: this.get('minify'),
        relativePath: this.get('relpath'),
        contentType: this.get('contentType')
        // minifying will be looked up by the file on the framework
      });
      this._combinedFile = o;
      this.set('content', [o]);
    }
    // now update the content
    var ret = []; // make sure there is always something, even if there is no content
    files.forEach(function (f) {
      ret.push("/* begin of file %@ */".fmt(f.get('path')));
      ret.push(f.get('content') || "");
      ret.push('/* end of file %@ */'.fmt(f.get('path')));

      var d = f.get('resourceDependencies');
      if (d) resourceDependencies = resourceDependencies.concat(d);
    });
    o.set('rawContent', ret.join("\n"));
    o.resourceDependencies = resourceDependencies;
  }.observes('filesDidChange')

});