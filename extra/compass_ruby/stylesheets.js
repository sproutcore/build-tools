/*global BT */
BT.FrameworkStylesheetsController.reopen({
  // watch all css files for their signal they have been writing out their scss file
  cssFileDidChange: function () {
    // is called by a css file when it's content has been parsed and written out
    this.invokeOnce('runCompass');
  }.observes('@each.rawContentHasChanged'),

  runCompass: function () {
    var pathlib = require('path');
    var tmpPath = pathlib.join(BT.projectPath, "tmpnode", "compass");
    BT.AsyncWrapper.from('child_process').perform('exec', "compass compile", { cwd: tmpPath })
       .notify(this, this.compassDidRun).start();
  },

  compassDidRun: function (err, stdout, stderr) {
    this.filterProperty('rawContentHasChanged').forEach(function (f) {
      f.reloadParsedContent();
    });
  }
});