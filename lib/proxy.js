/*globals BT, require*/

BT.Proxy = SC.Object.extend({
  port: null,
  host: null,
  proxyPrefix: null,
  prefix: null,
  inTransit: 0,

  init: function () {
    if (!this.host || !this.prefix) {
      throw new Error("Proxy configuration invalid!");
    }
    //normalize the prefixes, by forcing a closing /
    if (this.prefix.lastIndexOf("/") !== this.prefix.length - 1) {
      this.prefix += "/";
    }
    if (this.proxyPrefix && this.proxyPrefix.lastIndexOf("/") !== this.proxyPrefix.length -1) {
      this.proxyPrefix += "/";
    }
  },

  process: function (origReq, origResp) {
    var prefix = this.prefix;
    var url = origReq.url;
    var path = require('url').parse(url).pathname;
    var proxyReq;
    BT.Logger.trace("proxying " + url);
    var me = this;

    this.inTransit += 1;
    var target = "http://" + (this.port ? this.host + ":" + this.port : this.host);
    var newpath = this.proxyPrefix ? path.replace(prefix, this.proxyPrefix) : path;

    var pathToCheck = path.substr(0, prefix.length);
    BT.Logger.trace("prefix: " + prefix + ", pathToCheck: " + pathToCheck);

    if (pathToCheck === prefix) {
      BT.Logger.trace("proxying %@ to %@%@".fmt(path, target, newpath));

      var util = require('util');
      BT.Logger.debug('origHeaders: ' + util.inspect(origReq.headers));

      if (origReq.headers.host) origReq.headers.host = "";

      if (this.proxyPrefix) {
        url = url.replace(prefix, this.proxyPrefix);
        BT.Logger.trace("sending url: " + url);
      }
      proxyReq = require('http').request({
          hostname: this.host,
          port: this.port,
          path: url,
          method: origReq.method,
          headers: origReq.headers
          //agent: false
        },
        function (proxyres) {
          var data = "";
          //BT.Logger.trace("proxyReq: " + require('util').inspect(proxyReq));
          BT.Logger.trace("proxyres status " + proxyres.statusCode);
          proxyres.on('data', function (chunk) {
            data += chunk;
          });
          proxyres.on('end', function () {
            origResp.writeHead(proxyres.statusCode, proxyres.headers);
            origResp.write(data);
            origResp.end();
            me.inTransit -= 1;
            BT.Logger.trace("Finishing proxy req, still in transit: " + me.inTransit);
          });
        }
      );

      // attach data
      origReq.on('data', function (chunk) {
        proxyReq.write(chunk);
      });

      origReq.on('end', function () {
        proxyReq.end();
      });

      proxyReq.on('error', function (err) {
        //tools.util.puts('ERROR: "' + err.message + '" for proxy request on ' + me.host + ':' + me.port);
        origResp.writeHead(404);
        origResp.write(origReq.url + " was not found in the project files or at one of the proxies.");
        origResp.end();
      });


      // origReq.headers.host = this.host;
      // origReq.headers['content-length'] = bodyLength;
      // origReq.headers['X-Forwarded-Host'] = request.headers.host + ':' + this.server.port;
      // if (this.port !== 80) request.headers.host += ':' + this.port;

    //tools.util.log('proxy request: ' + tools.util.inspect(proxyRequest));
    // tools.log('sending proxy request...');
      //proxyReq.end();
      return true; // proxied
    }
    return false; // not for us
  }
});