/*jshint node:true */
/*globals BT*/

BT.FrameworkFilesController = SC.ArrayController.extend({

  framework: null, // to which fw does this controller belong

  scripts: function () {
    // a script is a script file which is not a test
    return this.filterProperty('isScript').filterProperty('isTest', false);
  }.property('[]').cacheable(),

  stylesheets: function () {
    return this.filterProperty('isStylesheet');
  }.property('[]').cacheable(),

  resources: function () {
    return this.filterProperty('isResource');
  }.property("[]").cacheable(),

  templates: function () {
    return this.filterProperty('isTemplate');
  }.property("[]").cacheable(),

  tests: function () {
    return this.filterProperty('isScript').filterProperty('isTest', true);
  }.property("[]").cacheable(),

  filenames: function () {
    var ret = {};
    this.getEach('url').forEach(function (n, i) {
      ret[n] = i;
    });
    this.getEach('url2x').forEach(function (n, i) {
      if (n) ret[n] = i;
    });
    return ret;
  }.property('[]').cacheable(),

  fileFor: function (fn) {
    var fns = this.get('filenames');
    var f = fns[fn];
    if (!f) {
      f = fns[fn.replace('.html', '.js')]; // replace .html in request by .js to see whether that matches
    }
    return this.objectAt(f);
  },

  contentHash: function () {
    var crypto = require('crypto').createHash('sha1');
    var c;
    for (var i = 0, len = this.get('length'); i < len; i += 1) {
      c = this.objectAt(i).get('rawContent');
      if (c) crypto.update(c);
    }
    return crypto.digest('hex');
  }.property('@each.rawContent').cacheable()

});