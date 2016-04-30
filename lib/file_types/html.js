/*jshint node:true */
/*globals BT*/

BT.HTMLFile = BT.File.extend({
  extension: "html",
  contentType: 'text/html',
  isResource: true,

  parseContent: function (opts) {
    // apply sc_static
    var raw = this.get('rawContent');
    if (!raw) {
      // a file can be empty, or is about to be deleted from the system
      return "";
    }
    var str = raw.toString(); // rawContent is a buffer, htmlfile is always a string
    return this.handleStatic(str, opts);
  }
});