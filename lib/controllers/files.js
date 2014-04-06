BT.FrameworkFilesController = SC.ArrayController.extend({

  framework: null, // to which fw does this controller belong

  scripts: function () {
    //BT.TEST = this;
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
    var names = this.getEach('relativePath').forEach(function (n, i) {
      ret[n] = i;
    });
    return ret;
  }.property('[]').cacheable(),

  fileFor: function (fn) {
    var fns = this.get('filenames');
    return this.objectAt(fns[fn]);
  }

});