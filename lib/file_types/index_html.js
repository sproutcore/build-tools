/*jshint node:true */
/*globals BT*/

BT.IndexHtmlFile = BT.File.extend({

  extension: "html",

  contentType: 'text/html',

  isResource: true,

  /**
    To which app this index.html belongs

    @private
  */
  belongsTo: null,

  relativePath: function() {
    return this.getPath('belongsTo.indexHtmlFileName'); //"index.html",
  }.property(),

  framework: function() {
    return this.get('belongsTo')._appfw;
  }.property(),

  /**
    @private
  */
  rawContent: function () {
    if (BT.runBenchmarks) SC.Benchmark.start('appBuilder:renderIndexHtml');
    // return an ejs generated template, never ever cache this
    var ejs = require('ejs');
    var pathlib = require('path');
    var fslib = require('fs');
    var template;
    var belongsTo = this.get('belongsTo');

    if (belongsTo.get('htmlTemplate')) { // try to load it
      try {
        template = fslib.readFileSync(pathlib.join(BT.projectPath, belongsTo.get('htmlTemplate')));
      }
      catch (e) {
        if (e.code === "ENOENT") {
          BT.Logger.warn("The buildtools could not find the configured template, falling back to the default one");
        }
        else throw e;
      }
    }
    if (!template) { // load the default one
      template = fslib.readFileSync(pathlib.join(BT.btPath, "templates", "app_index.ejs"));
    }
    var ret;
    try {
      if (BT.runBenchmarks) SC.Benchmark.start('appBuilder:ejsRender');
      ret = ejs.render(template.toString(), {
        app: belongsTo,
        BT: BT,
        compileDebug: true,
        sc_static: function (fn) {
          BT.Logger.debug("sc_Static in ejs Render");
          // if (BT.runBenchmarks) SC.Benchmark.start('appBuilder:ejsRender(sc_static)');
          var appfw = this.app._appfw,
              deps = appfw.getPath('scripts.firstObject.resourceDependencies'),
              file = appfw.findResourceFor(fn);

          if (file.get('length') !== 1) {
            BT.Logger.warn("no resource found for: " + fn);
            return '';
          }
          file = file[0];
          deps.addObject(file);
          // if (BT.runBenchmarks) SC.Benchmark.end('appBuilder:ejsRender(sc_static)');
          return file.get('url');
        }
      });
      if (BT.runBenchmarks) SC.Benchmark.end('appBuilder:ejsRender');
      if (belongsTo.get('minifyHtml')) {
        if (BT.runBenchmarks) SC.Benchmark.start('appBuilder:minifyHtml');
        var minify = require('html-minifier').minify;
        ret = minify(ret, {
          removeComments: true,
          collapseWhitespace: true,
          minifyJS: true,
          minifyCSS: true
        });
        if (BT.runBenchmarks) SC.Benchmark.end('appBuilder:minifyHtml');
      }
    }
    catch (er) {
      BT.Logger.error("Problem compiling the Html template: " + require('util').inspect(er));
      BT.Logger.error("ret: " + require('util').inspect(ret));
    }
    if (BT.runBenchmarks) SC.Benchmark.end('appBuilder:renderIndexHtml');
    return ret;
  }.property(),

});
