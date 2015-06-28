/*globals BT*/

BT.FrameworkStylesheetsController = SC.ArrayController.extend({
  framework: null,  // have a link to the framework
  orderBy: 'path ASC',
  filesHaveChanged: function () {
    BT.Logger.trace("stylesheet file has changed...");
    //return true;
    return this.get('propertyRevision'); // makes sure it is always different
  }.property('@each.rawContent'),

  finishedLoading: function () {
    var ret = this.every(function (f) {
      if (f.get('rawContent') !== null) return true;
    });
    return ret;
    // need to watch rawContent, because content doesn't seem to work.
  }.property('@each.rawContent').cacheable(),
});