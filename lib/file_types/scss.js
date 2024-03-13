sc_require('code');

BT.SCSSFile = BT.CodeFile.extend(
{
  extension: 'scss',
  isSCSSFile: true,
  isStylesheet: true,
  contentType: 'text/css',
  language: 'any',

  contentFilters: [
    'filterStopIfPartial',
    'filterParseSASS',
  ],

  _sass_importer: function(path, from, done)
  {
    var pathlib = require('path');

    var pathBasename = pathlib.basename(path);
    if('_' !== pathBasename.charAt(0)) pathBasename = '_' + pathBasename;
    if('.scss' !== pathBasename.substr(-5).toLowerCase()) pathBasename = pathBasename + '.scss';
    path = pathlib.join(pathlib.dirname(path), pathBasename);

    var fullpath = ('stdin' === from)
      ? pathlib.join(pathlib.dirname(this.get('path')), path)
      : pathlib.join(pathlib.dirname(from), path);
    var file = this.getPath('framework.files.stylesheets').findProperty('path', fullpath)
    if(file && file.isSCSSFile)
    {
      var observers = file.contentObservers;
      if(!observers) observers = file.contentObservers = BT.DependenciesController.create();
      if(!observers.contains(this)) observers.addObject(this);
    }

    return null;
  },

  _sass_sc_static_handler: function(url)
  {
    var sass = require('node-sass');
    var SassString = sass.types.String;
    var className = SC._object_className(this.constructor);

    var res = this.get('framework').findResourceFor(url);
    if(!res || 0 === res.length)
    {
      BT.Logger.warn(className + "#_sass_sc_static_handler: found no files for %@ in file %@".fmt(url, this.get('path')));
      return new SassString('url(/* ' + url + ' */)');
    }

    var file = res[0];
    if(res.length > 1)
    {
      BT.Logger.warn(className + "#_sass_sc_static_handler: found multiple files for %@ in file %@, taking the first (%@)".fmt(url, this.get('path'), file.get('path')));
    }

    var deps = this.resourceDependencies;
    if(!deps.contains(file)) deps.addObject(file);

    var ret = this.getPath('framework.belongsTo.doRelativeBuild')
      ? file.get('relativeUrl')
      : file.get('url')

    return new SassString('url(' + ret + ')');
  },

  /**
    Parses an .scss file.
    Paths in sc_static() or static_url() are relative to the calling file.
  */
  filterParseSASS: function(content)
  {
    var self = this;
    var ret = null

    try
    {
      ret = require('node-sass').renderSync({
        data: content,
        includePaths: [require('path').dirname(this.get('path'))],
        functions: {
          'sc_static($url)': function(url) { return self._sass_sc_static_handler(url.getValue()) },
          'static_url($url)': function(url) { return self._sass_sc_static_handler(url.getValue()) },
        },
        importer: function(path, from, done) { return self._sass_importer(path, from, done) },
      }).css;
    }
    catch(e) { BT.Logger.warn("node-sass: " + e.formatted) }
    return ret;
  },

  /**
    Stops the processing of content because partials should not produce any output,
    but should be imported from usual SCSS files.
  */
  filterStopIfPartial: function(content)
  {
    return this.get('isPartial') ? null : content;
  },

  isPartial: function()
  {
    return '_' === require('path').basename(this.get('path')).charAt(0);
  }.property('path').cacheable(),

})
