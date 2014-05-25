/*jshint node:true */
/*globals BT*/

BT.TemplateFile = BT.File.extend({
  extension: "ejs",
  contentType: 'text/html',
  isTemplate: true
});