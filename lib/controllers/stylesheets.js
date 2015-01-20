/*globals BT*/

BT.FrameworkStylesheetsController = SC.ArrayController.extend({
  framework: null,  // have a link to the framework
  orderBy: 'path ASC',
  filesHaveChanged: function () {
    //SC.Logger.info("stylesheet file has changed...");
    //return true;
    return this.get('propertyRevision'); // makes sure it is always different
  }.property('@each.rawContent')
});