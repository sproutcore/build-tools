/*jshint node:true*/
/*globals BT*/

BT.CombinedFrameworksController = BT.CombinedFilesController.extend({
  
  url: function () {
    var framework = this.get('framework');
    return '/' + framework.get('name') + '/'+ this.get('relpath');
  }.property(),

});