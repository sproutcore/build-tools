SproutCore - Build Tools
=======

SproutCore is a platform for building native look-and-feel applications on the web. This Node JS library includes a copy of the SproutCore JavaScript framework as well as a Node JS-based build system called BT.

BT is a build system for creating static web content. You can supply BT with a collection of JavaScript, HTML, CSS and image files and it will combine the files into a bundle that are optimized for efficient, cached deliver directly from your server or using a CDN.

Some of the benefits of using BT versus assembling your own content include:

* **Easy maintenance.**  Organize your source content in a way that is useful for you without impacting performance on loaded apps.

* **Automatically versioned URLs.** Serve content with long expiration dates while BT handles the cache invalidation for you.

* **Dependency management.**  Divide your code into frameworks; load 3rd party libraries. BT will make sure everything loads in the correct order.

* **Built-in support for:**

  * **Slicing.** Automatically slices your images and includes them as data urls.
 
  * **SASS and Compass.** Automatically parses your Compass CSS code.

  * **Traceur compiler.** Compiles ES6 down to regular Javascript (ES5) that runs in your browser.
  
* **Written in SproutCore.** Written in SproutCore to make customization easier.

* **Packing and minifing.**  Combines JavaScript and CSS into single files to minimize the number of resources you download for each page.
  
Although BT is intended primarily for building Web applications that use the SproutCore JavaScript framework, you can also use it to efficiently build any kind of static web content, even if SproutCore is not involved.

## Install BT 

### Normal installation
The default way of installing the BT is through npm. If you are new to SproutCore, install it with

```npm install -g sproutcore```

If you are updating from the old build tools (Abbot), and you have those installed globally, you might run into a name collision on
the sproutcore command if you install the new BT globally. If you want to remove Abbot, first remove it with 

`gem uninstall sproutcore`

and then install the new BT through

`npm install -g sproutcore`

If you don't want to uninstall Abbot, it is best to install the BT locally to the project. If it is a new project, create a 
folder, then go inside it and run 

`npm install sproutcore`.

To generate the project, run 

`node_modules/sproutcore/bin/sproutcore init [projectname] .`

### Developing on BT
If you want to be able to tinker with the BT itself, you can install the BT as a git repo.
Create the project folder, then create a node_modules folder inside it.
Go into this folder and 

1. Clone BT repository

        git clone https://github.com/sproutcore/build-tools.git

2. install BT from that new directory 

        npm install

You can then go back to the project folder and init a new project by the same command as given above.

#####On Windows:

Make sure that you have Git installed and that the PATH contains `C:\Program Files\Git\bin` before `C:\Program Files\Git\cmd`. NPM cannot install the sproutcore dependencies correctly from git repositories if git.exe cannot be found in the PATH.


## Run the server

You should now be ready to run the server. From the top directory of your project run:

    path-to-the-build-tools/bin/sproutcore serve

Now visit [http://localhost:4020/](http://localhost:4020/) and click the link to load your app!

The new BT automatically watch for changes, so just start editing your files and refresh the page to see your changes!

Please join us on [#sproutcore on IRC](http://sproutcore.com/community/#tab=irc) or post a message to the [mailing list](http://groups.google.com/group/sproutcore/topics?gvc=2) if you run into any issues!

#####On Windows:

Use only a 32 bit NodeJS (for now). For the rest, the steps on Windows are essentially the same,
except that the command to start the buildtools is:

    node path-to-the-build-tools\bin\sproutcore serve

It is important that you use forward slashes as path separators in the config files!
The buildtools will convert them for you where necessary, but that doesn't work the other way around.

You might run into a problem where running `npm install` in the getting-started folder
immediately returns an error. This is caused by the way git has been installed on your system,
where `%PROGRAMFILES%\git\cmd` is put into the path, but not `%PROGRAMFILES%\git\bin`.
NPM uses child processes which cannot execute .cmd files, so you will have to see whether it
is indeed in your path by typing:

    echo %PATH%

If ```C:\Program Files\git\bin``` is not in your path, you can put it in by doing

    set PATH=%PROGRAMFILES%\git\bin;%PATH%


## Using generators 

As is explained below, the BT expects a certain project layout. Because it can be tedious to create this by hand every time you start a project, the BT contain generators to generate the project layout or parts of it.

`sproutcore init [project-name]` creates a new project for you, including configuration files, and a single app having the same name as the project.

`sproutcore gen app [appname]` will create an app in the current project and will add a loading instruction to the project configuration.


## How BT server works


When you run the command `sproutcore serve`, BT will execute the project sc_config file in the root of your project directory.


Here is how your project directory should looks like:
```
├── project/
│   ├── apps/
│   │   ├── app1/
│   │   │   ├── sc_config (app)
│   ├── frameworks/
│   │   ├── rich-text-editor/
│   │   │   ├── sc_config (framework)
│   │   ├── sproutcore/
│   │   │   ├── sc_config (framework)
│   ├── sc_config (project)
│   ├── theme/
│   │   ├── your-theme/
│   │   │   ├── sc_config (theme)
```

You can choose to have an sc_config inside your app directory, or you can define your app inside the project sc_config. In the first case you will need to use `sc_require()` in the project sc_config to make BT aware of your app.

The app 'sc_config' files should contains the configuration of your apps:
    
    // Here is an example of an app configuration
    var app1 = BT.AppBuilder.create({
      name: 'app1',
      title: 'App 1', 
      path: 'apps/app1',
      frameworks: [
        'rich-text-editor'
      ],
    });


*You can see all the available parameters in the [appbuilder.js](https://github.com/sproutcore/build-tools/blob/master/lib/appbuilder.js) file.*

    
BT will execute these files, and so, create your apps and load all their dependencies. The dependencies of an app are frameworks and modules which should both be in the frameworks directory. For each of these dependencies BT will execute their sc_config and register them as `BT.Framework`.

  
    BT.addFramework(BT.Framework.extend({
      ref: "rich-text-editor"
    }));
    
*You can see all the available parameters in the [framework.js](https://github.com/sproutcore/build-tools/blob/master/lib/framework.js) file.*

Note that if you do not have sproutcore in your frameworks directory, BT will use its own.

BT is now ready to start its server. By default, it listen on localhost on port 4020. If you want to change theses parameters, you have to set a `BT.serverConfig` variable in your project 'sc_config':

    sc_require('apps/app1/sc_config');

    BT.serverConfig = {
      host: "localhost",
      port: 4020,
      localOnly: true
    };



## How BT will build your apps

To build your app, you will have to run the following command `sproutcore build [appName]`. BT will go throw the same process as if you wanted to start its server, but instead of serving the files of your app, it will save them into a build directory at the root of your project. 


