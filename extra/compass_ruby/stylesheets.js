/*global BT */
BT.FrameworkStylesheetsController.reopen({
  // watch all css files for their signal they have been writing out their scss file
  cssFileDidChange: function () {
    // is called by a css file when it's content has been parsed and written out
    BT.runCompass(this);
    //this.invokeOnce('runCompass');
  }.observes('*@each.rawContentHasChanged'),

  // runCompass: function () {
  //   SC.Logger.log("running compass for...");
  //   var pathlib = require('path');
  //   var tmpPath = pathlib.join(BT.projectPath, "tmpnode", "compass");
  //   BT.AsyncWrapper.from('child_process').perform('exec', "compass compile", { cwd: tmpPath })
  //      .notify(this, this.compassDidRun).start();
  // },

  compassDidRun: function (err, stdout, stderr) {
    //SC.Logger.log(stdout);
    SC.Logger.log("compassDidRun for " + this.getPath('framework.name'));
    this.filterProperty('rawContentHasChanged').forEach(function (f) {
      f.reloadParsedContent();
    });
    if (this.getPath('framework.combineStylesheets')) {
      SC.Logger.log("trying to trigger filesDidChange for " + this.getPath('framework.name'));
      //this.setPath('frameworks.stylesheets.filesDidChange', true);
      //calling update method on fw directly
      this.getPath('framework.stylesheets').filesToCombineDidChange();
    }
  }
});