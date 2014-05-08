/*jshint node:true */
/*globals BT*/

BT.FrameworkFilesController = SC.ArrayController.extend({

  framework: null, // to which fw does this controller belong

  scripts: function () {
    return this.filterProperty('isScript');
  }.property('[]').cacheable(),

  stylesheets: function () {
    return this.filterProperty('isStylesheet');
  }.property('[]').cacheable(),

  resources: function () {
    return this.filterProperty('isResource');
  }.property("[]").cacheable(),

  filenames: function () {
    var ret = {};
    this.getEach('url').forEach(function (n, i) {
      ret[n] = i;
    });
    return ret;
  }.property('[]').cacheable(),

  fileFor: function (fn) {
    var fns = this.get('filenames');
    return this.objectAt(fns[fn]);
  },

  contentHash: function () {
    var crypto = require('crypto').createHash('sha1');
    var c;
    for (var i = 0, len = this.get('length'); i < len; i += 1) {
      c = this.objectAt(i).get('rawContent');
      if (c) crypto.update(c);
    }
    return crypto.digest('hex');
  }.property('@each.rawContent').cacheable(),

  // // contains a
  stylesheets2x: function () {

  }.property('@each.has2x').cacheable()

});