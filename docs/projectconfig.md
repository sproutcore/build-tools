# Configuration Files

## Main concept

The buildtools use SC classes to generate functionality on the level of the project, app and framework.
In order to make the configuration match nicely with both SC as well as make the configuration as consistent as possible throughout, the configuration should be very similar to the way default properties of SC classes are overriden, namely through hashes in the create statement.

The buildtools can then do something like this:

```var fw = Framework.create(fwconfig,globalconfig,appconfig)```, where
  - fwconfig is the internal configuration file of the framework itself
  - globalconfig is the framework configuration found in the frameworks section of the project configuration file
  - appconfig is the configuration found in the frameworks section of the app where this framework is being added to

which will allow a default configuration in the framework itself, additional configuration on project level, as well as app-specific overrides.
As will be shown later, every framework can and will have multiple object instances, in order to allow app specific overrides as well as to prevent app specific overrides leaking into other apps.

The example project config file contained in this directory is very complex in order to show all the possible overrides. Configuration files found inside apps or frameworks should have the same syntax as the corresponding parts in the project config.
In a real project, the project configuration file can most likely be very small, or even non-existent as the buildtools will try to autodetect the project configuration as much as possible.

## Project configuration file sections

There are different sections in the project config.

### Server
The server section in the configuration contains all the settings intended to be used by the development server.
It is a hash containing essentially three items: proxies, port and allowFromAll

#### Proxies
When developing a SproutCore app, you might want to use images or other data that should not be included in the app itself. To make the development easier, the buildtools development server can proxy requests to a different server. A proxy configuration contains:

  1. prefix: the first part of the url the server should match against. "/images" will trigger this proxy for all urls starting with "/images"
  2. host: to which host should the proxy forward the request
  3. port: on which port should the proxy forward the request
  4. proxyPrefix: How should the proxy change the url of the forwarded request. If empty it will forward the request as is, if not empty it will replace the prefix given at 1. with the string in this setting.

#### Other settings

  1. port: on which port should the devserver run. Default is 4020
  2. allowFromAll: if true: allow requests from other computers than localhost.

### Plugins

The plugins section is to configure included plugins or additional plugins inside the project for all apps and all frameworks.
It is a hash of which the key is the name of the plugin to be used, and the value is a hash containing

  1. type: which is the type of file targeted by this plugin (scripts, stylesheets or resources)
  2. extension: which file extension this plugin should be acting on?
  3. node_module: (optional) which node module should be required?

If you do not define a node_module value, the buildtools assume that the name of the plugin is the module to require();

### Apps and Frameworks
The apps and frameworks sections are hashes in which the key is the name of the app or framework (if a subframework is intended, a syntax like "sproutcore:desktop" as name), and the value a hash with properties.
If this hash does not contain a key named path, and the autodetection did not pick up any configuration declaring this name (which can also be like "sproutcore:desktop"), it is assumed the key is equal to a folder name in apps/ or frameworks/. Property values in these hashes will override configurations found inside these apps or frameworks. More about the specifics for app and framework configurations in their respective chapters.

### deploy
The deploy section can contain settings which overrides all other configurations, but only in case of a build (or save).

## Framework configuration file fields

  - name: The name section contains the name of the framework (optional). The name can either be set in the configuration, or it is derived from the path. If set, complex notation can be used: "sproutcore:desktop".
  - path: The path section contains the relative path of the framework. This can be either set, or computed from the name.
  - combineScripts: set to true if scripts of this framework should be combined into one file (default: true)
  - combineStylesheets: set to true if stylesheets of this framework should be combined into one file (default: true)
  - minifyScripts: set to true if scripts of this framework should be minified (default: false)
  - minifyStylesheets: set to true if stylesheets of this framework should be minified (default: false)
  - stylesheetProcessor: which processor should be used for the stylesheets in this framework
  - watchForChanges: set to true if the current framework should be watched for changes

(should the following get its own class?)

  - isModule: set to true if the current framework should be treated like a module (default: false)
  - shouldPreload: set to true if the current module (isModule needs to be true) should be packed together with the main package (default: false)

## Application configuration file fields

  - name: contains the name of the application. If left empty, the buildtools will get the folder name from the path
  - path: contains the path of the application
  - theme: which theme the app uses
  - buildLanguage: tells the build tools which language should be built (deprecate?)
  - htmlHead: can be either a string or array containing additional tags to be included in the main html
  - htmlBody: if set this will be used as loading page
  - urlPrefix: if set, all urls generated for this application will be prefixed with this url. For example:
    "" will cause a relative build, "/" will make the urls absolute.

As an app itself is very much like a framework with extras, an app will automatically add itself as last framework.
The following configuration fields can be used to configure that framework.

  - combineScripts: set to true if scripts of this framework should be combined into one file (default: true)
  - combineStylesheets: set to true if stylesheets of this framework should be combined into one file (default: true)
  - minifyScripts: set to true if scripts of this framework should be minified (default: false)
  - minifyStylesheets: set to true if stylesheets of this framework should be minified (default: false)