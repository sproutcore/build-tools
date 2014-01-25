# Configuration Files

## Main concept

The main concept behind the configuration is that the initialization of the objects should be like this:

```var fw = Framework.create(fwconfig,globalconfig,appconfig)```, where
  - fwconfig is the internal configuration file of the framework itself
  - globalconfig is the global configuration found in the project
  - appconfig is the configuration found in the app where this framework is being added to

This should work similarly for apps and modules.
The example project config file is very big to show all options. Configuration files found inside apps or frameworks should have
the same syntax as the corresponding parts in the project config.

## Project file parts

There are different lemmas to the project config, each for their specific target

### Server
The server lemma in the configuration contains all the settings intended to be used by the development server.
It contains essentially three items: proxies, port and allowFromAll

#### Proxies
A proxy configuration contains:

  1. prefix: the first part of the url the server should match against. "/images" will trigger this proxy for all urls starting with "/images"
  2. host: to which host should the proxy forward the request
  3. port: on which port should the proxy forward the request
  4. proxyPrefix: How should the proxy change the url of the forwarded request. If empty it will forward the request as is, if not empty it will replace the prefix given at 1. with the string in this setting.

#### Other settings

  1. port: on which port should the devserver run. Default is 4020
  2. allowFromAll: if true: allow requests from other computers than localhost.

### plugins

The plugins lemma is to configure included plugins or additional plugins inside the project for all apps and all frameworks.

### Apps and Frameworks
The apps and frameworks lemmas are hashes in which the key is the name of the app or framework, and the value a hash with properties.
If this hash does not contain a key named path, and the autodetection did not pick up any configuration declaring this name, it is assumed the key is equal to a folder name in apps/ or frameworks/. Property values in these hashes will override configurations found inside these apps or frameworks. More about the specifics for app and framework configurations in their respective chapters.

### deploy
The deploy lemma can contain settings which overrides all other configurations, but only in case of a build (or save).