var SC = require('sc-runtime');

// the project config is essentially identical to


var Project = SC.Object.extend({
  path: null,

  server: null, // anchor point for the server config
  frameworks: null, // anchor point for the frameworks config
  plugins: null, // anchor point for plugin information
  apps: null, // anchor point for apps configuration
  deploy: null, // anchor point for deploy configuration

  projectConfig: function(){
    var ret = {
      server: this.get('server'),
      frameworks: this.get('frameworks'),
      plugins: this.get('plugins'),
      apps: this.get('apps'),
      deploy: this.get('deploy')
    };
    return JSON.stringify(ret); // indentation?
  }.property(),

  init: function(){
    // init should run autoDetect
    this.autoDetect();
  },

  autoDetect: function(){
    // autoDetect should scan the current project folder for the following:
    // - a file named sc_config.json
    // - a folder called apps.
    //   - If it exists,
    //     - scan the subfolders,
    //     - look for sc_config.json in the root of every subfolder
    //       - if it exists, load it
    //       - if it doesn't exist, take the default config (which is essentially a "normal" app object)
    // - a folder called modules
    //   - If it exists,
    //     - scan the subfolders,
    //     - look for sc_config.json in the root of every subfolder
    //       - if it exists, load it
    //       - if it doesn't exist, take the default config (which is essentially a "normal" framework object)
    //
    // Not sure this should be loaded automatically. The idea is that apps detection should be greedy, but frameworks not.
    // we should be able to retrieve a framework based on the reference: ie: we create the framework and from the reference
    // (name) the framework should be able to either load itself, or add dependencies
    // - a folder called frameworks.
    //   - if it exists:
    //     - scan the subfolders,
    //     - look for sc_config in the root of every subfolder
    //       - if it exists, load it
    //       - if it doesn't exist, take the default config (which is essentially a "normal" framework object)
    //
    //  If no sc_config.json can be found, and no apps folder can be found, and no frameworks folder can be found
    //  throw error, as not in a SC project root
    //
  }
});