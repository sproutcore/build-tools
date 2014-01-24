Configuration File concepts

The main concept behind the configuration is that the initialization of the objects should be like this:

var fw = Framework.create(fwconfig,globalconfig,appconfig), where
  - fwconfig is the internal configuration file of the framework itself
  - globalconfig is the global configuration found in the project
  - appconfig is the configuration found in the app where this framework is being added to

This should work similarly for apps and modules.
The example project config file is very big to show all options, the framework configuration should be similar to the
