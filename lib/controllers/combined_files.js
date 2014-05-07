/*jshint node:true*/
/*globals BT*/

// this is slowly starting to look like a file class...
BT.CombinedFile = BT.File.extend({
  content: null, // override default computed property, as it will be set directly
  contentHash: function () {
    var crypto = require('crypto');
    return crypto.createHash('sha1').update(this.get('content'), 'utf8').digest('hex');
  }.property('content').cacheable()
});

BT.CombinedFilesController = SC.ArrayController.extend({
  relpath: null,
  contentType: null,
  filesToCombine: null,
  filesDidChange: null,
  _combinedFile: null,
  framework: null,
  init: function () {
    sc_super();
    this.invokeNext('filesToCombineDidChange'); // make sure this fires
  },
  filesToCombineDidChange: function () {
    //SC.Logger.log("filesToCombineDidChange");
    var files = this.get('filesToCombine');
    if (!files) return;
    var o = this._combinedFile;
    if (!o) { // no combined file means also no content
      o = BT.CombinedFile.create({
        framework: this.framework,
        path: this.get('relpath'),
        relativePath: this.get('relpath'),
        content: null,
        contentType: this.get('contentType')
      });
      this._combinedFile = o;
      this.set('content', [o]);

    }
    // now update the content
    var ret = [" "]; // make sure there is always something, even if there is no content
    files.forEach(function (f) {
      ret.push("/* begin of file %@ */".fmt(f.get('path')));
      ret.push(f.get('content'));
      ret.push('/* end of file %@ */'.fmt(f.get('path')));
    });
    o.set('content', ret.join("\n"));
  }.observes('filesDidChange')
});