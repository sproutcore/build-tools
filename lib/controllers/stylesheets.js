BT.FrameworkStylesheetsController = SC.ArrayController.extend({
  framework: null,  // have a link to the framework
  orderBy: 'path ASC',
  filesHaveChanged: function () {
    //SC.Logger.log("stylesheet file has changed...");
    return true;
  }.property('@each.rawContent')
});