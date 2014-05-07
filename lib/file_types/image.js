/*jshint node:true */
/*globals BT*/

BT.ImageFile = BT.File.extend({
  // default contentHash is calculated as utf8 encoding, which doesn't make sense
  // for binary files.
  contentHash: function () {
    var crypto = require('crypto');
    return crypto.createHash('sha1').update(this.get('content')).digest('hex');
  }.property('content').cacheable()
});

BT.PNGFile = BT.ImageFile.extend({
  extension: "png",
  contentType: 'image/png',
  isResource: true
});

BT.JPGFile = BT.ImageFile.extend({
  extension: "png",
  contentType: 'image/jpg',
  isResource: true
});

BT.GIFFile = BT.ImageFile.extend({
  extension: "gif",
  contentType: 'image/gif',
  isResource: true
});

