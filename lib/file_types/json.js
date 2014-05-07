/*jshint node:true */
/*globals BT*/

BT.JSONFile = BT.File.extend({
  extension: "json",
  contentType: 'application/json',
  isResource: true
});
