## Intro/Important Notes

This repository has been emptied to make place for a completely new build of the SproutCore Nodejs Buildtools.
If you are searching for the last version of garcon, please check https://github.com/mauritslamers/build-tools-1

This is the first architectural layout and other bits and pieces for the new SproutCore Buildtools.
At the moment most things are in flux, so these buildtools are only partially useable.

See here for more information on what has been implemented and what is in progress: https://github.com/sproutcore/build-tools/wiki/Abbot-features

## Installation/Setup

There are three ways to get started. You can,

1. Clone the getting started project

        git clone git://github.com/mauritslamers/getting-started.git
        git checkout newbt

2. `cd` into an existing sproutcore project

        cd my_existing_sc_project

3. Or, you can also create a new project for testing if you have the existing Ruby build tools installed:

        sproutcore init MyProject
        cd my_project

### package.json

If it doesn't already exist, download a template `package.json` file into your project's root directory and edit it.

    curl "https://raw.githubusercontent.com/mauritslamers/getting-started/newbt/package.json" > package.json

You will want to change the name, description, and repository/bug URLs; and optionally the author, license, keywords and homepage attributes.

### Installing the new build tools and Sproutcore

Run the following commands to install the build tools using the node package manager:

    npm install

### Create a build tools configuration file

Create the following file named `sc_config` in the root level of your directory if it doesn't exist so that the build tools know how to build your project:

    var my_project = BT.AppBuilder.create({
      path: 'apps/my_project'
    });

    BT.serverConfig = {
      host: "localhost",
      port: 8080,
      localOnly: true
    };

### Run the server

You should now be ready to run the server. From the top directory of your project run:

    ./node_modules/sproutcore/bin/sproutcore serve

Now visit [http://localhost:8080/](http://localhost:8080/) and click the link to load your app!

The new build tools automatically watch for changes, so just start editing your files and refresh the page to see your changes!

Please join us on [#sproutcore on IRC](http://sproutcore.com/community/#tab=irc) or post a message to the [mailing list](http://groups.google.com/group/sproutcore/topics?gvc=2) if you run into any issues!

On Windows:

Use only a 32 bit NodeJS (for now). For the rest, the steps on Windows are essentially the same,
except that the command to start the buildtools is:

    node node_modules\sproutcore\bin\sproutcore

It is important that you use forward slashes as path separators in the config files!
The buildtools will convert them for you where necessary, but that doesn't work the other way around.

You might run into a problem where running ```npm install``` in the getting-started folder
immediately returns an error. This is caused by the way git has been installed on your system,
where %PROGRAMFILES%\git\cmd is put into the path, but not %PROGRAMFILES%\git\bin.
NPM uses child processes which cannot execute .cmd files, so you will have to see whether it
is indeed in your path by typing:

    echo %PATH%

If ```C:\Program Files\git\bin``` is not in your path, you can put it in by doing

    set PATH=%PROGRAMFILES%\git\bin;%PATH%






