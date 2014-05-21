/*jshint node:true */
/*globals BT*/

BT.AppCacheFile = BT.ScriptFile.extend({

  extension: "appcache",
  isAppCache: true,
  contentType: 'text/cache-manifest',
  relativePath: 'manifest.appcache',

  app: null,

  rawContent: function () {
    var app = this.get('app'),
      frameworks = app._allFws,
      html5ManifestOptions = app.html5ManifestOptions || {},
      ret = "CACHE MANIFEST\n\n";

    app.get('buildFiles').forEach(function(file) {
      ret += file.get('url')+"\n";

      var resourceDeps = file.get('resourceDependencies'),
        addedDeps = {};
      (resourceDeps || []).forEach(function(dep) {
        var url = dep.url;
        if (!addedDeps[url]) {
          ret += url+"\n";
          addedDeps[url] = true;
        }
      }, this);
    }, this);

    var entries = html5ManifestOptions.entries,
      caches = html5ManifestOptions.caches,
      networks = html5ManifestOptions.networks,
      fallbacks = html5ManifestOptions.fallbacks;

    if (entries) {
      ret += "\n";
      
      entries.forEach(function(entrie) {
        ret += entrie+"\n";
      }, this);
    }

    if (caches) {
      ret += "\nCACHE:\n";
      
      caches.forEach(function(cache) {
        ret += cache+"\n";
      }, this);
    }

    if (!networks) networks = ['*'];
    ret += "\nNETWORK:\n";
    
    networks.forEach(function(network) {
      ret += network+"\n";
    }, this);

    if (fallbacks) {
      ret += "\nFALLBACK:\n";
      
      fallbacks.forEach(function(fallback) {
        ret += fallback+"\n";
      }, this);
    }

    return ret;
  }.property(),

});
