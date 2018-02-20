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

BT.SWFFile = BT.ImageFile.extend({
  extension: "swf",
  contentType: "application/x-shockwave-flash",
  isResource: true
});

BT.WOFFFile = BT.ImageFile.extend({
  extension: 'woff',
  contentType: 'application/octet-stream',
  isResource: true
});

BT.WOFF2File = BT.ImageFile.extend({
  extension: 'woff2',
  contentType: 'application/octet-stream',
  isResource: true
});

BT.TTFFile = BT.ImageFile.extend({
  extension: 'ttf',
  contentType: 'application/octet-stream',
  isResource: true
});

BT.OTFFile = BT.ImageFile.extend({
  extension: 'otf',
  contentType: 'application/x-font-opentype',
  isResource: true
});

BT.EOTFile = BT.ImageFile.extend({
  extension: 'eot',
  contentType: 'application/vnd.ms-fontobject',
  isResource: true
});

BT.SVGFile = BT.ImageFile.extend({
  extension: 'svg',
  contentType: 'image/svg+xml',
  isResource: true
});

BT.ICOFile = BT.ImageFile.extend({
  extension: 'ico',
  contentType: 'image/x-icon',
  isResource: true
});
