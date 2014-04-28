## Intro/Important Notes

This repository has been emptied to make place for a completely new build of the SproutCore Nodejs Buildtools.
If you are searching for the last version of garcon, please check https://github.com/mauritslamers/build-tools-1

This is the first architectural layout and other bits and pieces for the new SproutCore Buildtools.
At the moment most things are in flux, so these buildtools are only partially useable.

See here for more information on what has been implemented and what is in progress: https://github.com/sproutcore/build-tools/wiki/Abbot-features

## Installation/Setup

Create a new blank project, or cd into an existing one:

    sproutcore init MyProject
    cd my_project

Then, download a basic `package.json` file that you can edit.

    curl "https://raw.githubusercontent.com/mauritslamers/getting-started/newbt/package.json" > package.json

Edit this file for your specific project. You will want to change the name, description, and repository/bug URLs; and optionally the author, license, keywords and homepage attributes.

Now run the following commands:

    npm install
    mkdir frameworks
    cd frameworks
    git clone git@github.com:sproutcore/sproutcore.git
    cd sproutcore
    git checkout team/mauritslamers/newbt

Create the following file named `sc_config` in the root level of your directory:

    sc_require('apps/my_project/sc_config');

    var my_project = BT.AppBuilder.create({
      path: 'apps/my_project'
    });

    BT.serverConfig = {
      host: "localhost",
      port: 8080,
      localOnly: true
    };

Now, create the following file named `sc_config` in the `apps/my_project` directory:

    BT.MyProject = BT.AppBuilder.create({
      path: dirname()
    });

You should now be ready to run the server. From the top directory of your project run:

    ./node_modules/sproutcore/bin/sproutcore

_**Note:** You will be prompted to install X11 if you are on a Mac because Sproutcore uses the cairo library for slicing. You must install it to continue and then rerun this command. The prompt should provide a link to a page with more information, but you can currently get it from http://xquartz.macosforge.org/landing/_

Once installed, visit [http://localhost:8080/](http://localhost:8080/) and click the link to load your app!

The new build tools automatically watch for changes, so just start editing your files and refresh the page to see your changes!

Please join us on [#sproutcore on IRC](http://sproutcore.com/community/#tab=irc) or post a message to the [mailing list](http://groups.google.com/group/sproutcore/topics?gvc=2) if you run into any issues!
