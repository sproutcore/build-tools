sc_require('code');

BT.SCSSFile = BT.CodeFile.extend(
{
  extension: 'scss',
  isSASS: true,
  isStylesheet: true,
  contentType: 'text/css',
  language: 'any',

  contentFilters: [
    'filterSetupContentObservers',
    'filterStopIfPartial',
    'filterParseSASS',
  ],

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
      }).css;
    }
    catch(e) { BT.Logger.warn("node-sass: " + e.formatted) }
    return ret;
  },

  _didSetupContentObservers: false,

  /**
    Sets up dependencies from the imported file to the importing one.
    Activated once per file and performs a false 'node-sass' processing.
    Doesn't make changes in the content.
  */
  filterSetupContentObservers: function(content)
  {
    if(this._didSetupContentObservers) return content;
    this._didSetupContentObservers = true;

    var self = this;
    try
    {
      require('node-sass').renderSync({
        data: content,
        importer: function(to, from, done)
        {
          var pathlib = require('path');
          var dir = pathlib.dirname(self.get('path'));
          var framework = self.get('framework');
          var file = null;

          to = pathlib.join(dir, to);
          for(var i = 0; i < 4; ++i)
          {
            switch(i)
            {
              case 0:
                file = framework.getPath('files.stylesheets').findProperty('path', to);
                break;
              case 1:
                file = framework.getPath('files.stylesheets').findProperty('path', to + '.scss');
                break;
              case 2:
                file = framework.getPath('files.stylesheets').findProperty('path', to = pathlib.join(pathlib.dirname(to), '_' + pathlib.basename(to)));
                break;
              case 3:
                file = framework.getPath('files.stylesheets').findProperty('path', to + '.scss');
                break;
            }
            if(file && file.isCode)
            {
              if(!file.contentObservers) file.contentObservers = BT.DependenciesController.create();
              // the 'file' will notify 'this' when file's rawContent changes.
              file.contentObservers.addObject(self);
              break;
            }
          }
          return { contents:'' };
        }
      })
    }
    catch(e) {}

    return content;
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
