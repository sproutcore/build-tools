/*jshint node:true */
/*globals BT*/

BT.AppCacheFile = BT.File.extend({

  extension: "appcache",
  isAppCache: true,
  contentType: 'text/cache-manifest',

  relativePath: function () {
    var app = this.get('app');
    return app.get('html5ManifestFileName');
  }.property().cacheable(),

  app: null,

  // The cache manifest should always have the same URL
  urlTemplate: function () {
    if (BT.runMode === BT.RM_DEBUG) {
      return "/%{appName}/%{frameworkName}/%{relativePath}";
    }
    else {
      return "/static/%{frameworkName}/%{language}/%{relativePath}";
    }
  }.property().cacheable(),

  rawContent: function () {
    var app = this.get('app'),
      //frameworks = app._allFws,
      html5ManifestOptions = app.html5ManifestOptions || {},
      //files = app.get('files'),
      addedDeps = {},
      ret = "CACHE MANIFEST\n\n";

    app.get('buildFiles').forEach(function (file) {
      ret += file.get('url') + "\n";

      var resourceDeps = file.get('resourceDependencies');
      resourceDeps.forEach(function (dep) {
        var url = dep.get('url');
        if (!addedDeps[url]) {
          ret += url + "\n";
          addedDeps[url] = true;
        }
      }, this);
    }, this);

    var entries = html5ManifestOptions.entries,
      caches = html5ManifestOptions.caches,
      networks = html5ManifestOptions.networks,
      fallbacks = html5ManifestOptions.fallbacks;

    if (entries && entries.length) {
      ret += "\n";

      entries.forEach(function (entry) {
        ret += entry + "\n";
      }, this);
    }

    if (caches && caches.length) {
      ret += "\nCACHE:\n";

      caches.forEach(function (cache) {
        ret += cache + "\n";
      }, this);
    }

    if (!networks) networks = ['*'];
    ret += "\nNETWORK:\n";

    networks.forEach(function (network) {
      ret += network + "\n";
    }, this);

    if (fallbacks && fallbacks.length) {
      ret += "\nFALLBACK:\n";

      fallbacks.forEach(function (fallback) {
        ret += fallback + "\n";
      }, this);
    }

    return ret;
  }.property(),

});
