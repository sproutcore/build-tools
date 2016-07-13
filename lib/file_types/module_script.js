/*jshint node:true */
/*globals BT*/

BT.ModuleScriptFile = BT.ScriptFile.extend({

  isModuleScript: true,

  rawContent: function () {
    var framework = this.get('framework'),
      modules = framework.get('modules'),
      ret = '';

    modules.forEach(function (module) {
      ret += this.renderModule(module);
    }, this);

    return '(function () { \n' +
      '  if (!SC.MODULE_INFO) { throw "SC.MODULE_INFO is not defined!"; }\n' +
      '  ' + ret + '\n' +
      '})();';
  }.property(),

  renderModule: function (module) {
    var ejs = require('ejs'),
      //pathlib = require('path'),
      template = this.get('moduleTemplate'),
      relativeUrl = this.getPath('framework.belongsTo.doRelativeBuild'),
      urlProp = relativeUrl ? 'relativeUrl' : 'url',
      ret = '',

      name = module.get('name'),
      stylesheets = module.get('stylesheets'),
      stylesheetsContent = stylesheets.getEach('content').join(''),
      styles = module.get('stylesheets').getEach(urlProp),
      scriptURL = module.getPath('scripts.firstObject.'+urlProp),
      stringURL = ''; // TODO add prefetched and inlined support

    if (!stylesheetsContent) styles = 'null';
    else styles = JSON.stringify(styles);

    try {
      ret = ejs.render(template, {
        name: name,
        styles: styles,
        scriptURL: scriptURL,
        stringURL: stringURL,
      });
    }
    catch (er) {
      BT.Logger.error("Problem compiling the module template: " + require('util').inspect(er));
      BT.Logger.error("ret: " + require('util').inspect(ret));
    }

    return ret;
  },

  moduleTemplate: function () {
    var pathlib = require('path'),
      fslib = require('fs'),
      template = fslib.readFileSync(pathlib.join(BT.btPath, "templates", "module.ejs"));

    return template.toString();
  }.property().cacheable(),

});
