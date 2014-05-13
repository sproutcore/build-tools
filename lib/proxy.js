BT.Proxy = SC.Object.extend({
  port: null,
  host: null,
  proxyPrefix: null,
  prefix: null,

  init: function () {
    if (!this.host || !this.prefix) {
      throw new Error("Proxy configuration invalid!");
    }
  },

  process: function(origReq, origResp){
    var prefix = this.prefix;
    var path = require('url').parse(origReq.url).pathname;
    var proxyReq;
    SC.Logger.log("proxying " + path);
    //var me = this;

    var target = "http://" + (this.port? this.host + ":" + this.port: this.host);
    var newpath = this.proxyPrefix? path.replace(prefix + "/",this.proxyPrefix): path;

    if(path.substr(0,prefix.length) === prefix){
      SC.Logger.log("proxying %@ to %@%@".fmt(path,target,newpath));
      if(this.proxyPrefix){
        path = path.replace(prefix + "/", this.proxyPrefix);
      }

      proxyReq = require('http').request({
          host: this.host,
          port: this.port,
          path: path,
          method: origReq.method,
          headers: origReq.headers
          //agent: false
        },
        function(proxyres){
          SC.Logger.log("proxyReq callback");
          origResp.writeHead(proxyres.statusCode, proxyres.headers);
          proxyres.on('data', function(chunk){
            origResp.write(chunk);
          });
          proxyres.on('end',function(){
            origResp.end();
          });
        }
      );

      // attach data
      origReq.on('data', function(chunk){
        proxyReq.write(chunk);
      });

      origReq.on('end', function(){
        proxyReq.end();
      });

      proxyReq.on('error', function(err){
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
    // proxyReq.end();
      return true; // proxied
    }
    return false; // not for us
  }
});