/*jshint node:true*/
/*globals BT */

/*
The idea here is that the installation of sproutcore also installs the "main" version of sproutcore.
This makes sense if we also want to provide a specific installation method for additional external
frameworks in either the projects frameworks folder, or the global frameworks folder.

It would have been great to use npm in some way to provide this installation, as it is already installed
and it supports so many different formats already. However the actual things we need is very little
so, it is probably just as easy to do it ourselves...
what we need to do is to check out a git repo, then copy everything except the .git files into either the
global folder, or the project folder


notes:
- rimraf => rm -rf
- mkdirp


 */

BT.Installer = SC.Object.extend({
  // run a specific installation
  //
  gitUrl: null, // the git url to install

  gitBranch: null, // the git branch name to check out, if else than master

  silent: null, // to disable any console logs

  frameworkName: null, // to override the destination framework name

  notifyTarget: null,

  notifyMethod: null,

  notifyArgs: null,

  notify: function (target, method) {
    this.notifyTarget = target;
    this.notifyMethod = method;
    this.notifyArgs = SC.A(arguments).slice(2);
    return this;
  },

  ready: function () { // call notifier
    var target = this.notifyTarget,
        method = this.notifyMethod,
        args = this.notifyArgs;

    args.unshift({ ok: true });
    if (SC.typeOf(this.notifyTarget) === SC.T_FUNCTION) {
      this.notifyTarget.apply(window, args);
    }
    else {
      if (SC.typeOf(method) === SC.T_STRING) {
        method = target[method];
      }
      target.method.apply(target, args);
    }
  },

  to: function (directory) {
    if (!directory) {
      throw new Error("BT.Installer: no destination given");
    }
    this.destination = directory;
    return this;
  },

  isGitUrl: function (url) { // taken from npm
    switch (url.protocol) {
      case "git:":
      case "git+http:":
      case "git+https:":
      case "git+rsync:":
      case "git+ftp:":
      case "git+ssh:":
        return true;
    }
  },

  start: function () {
    //actions to be performed:
    //- check validity of url
    //- checkout of git repo, in temp folder of system by name + this.installId
    //- copy the contents of the git repo, but without .git files to destination
    //- remove the git repo from the temp folder
    //
    var urllib = require('url');
    var url = urllib.parse(this.gitUrl);
    if (!this.isGitUrl(url)) {
      throw new Error("BT.Installer: the url you have is not a valid git url");
    }
    this.gitCheckOut(url);
  },

  gitCheckOut: function (url) {
    var pathlib = require('path');
    var tmpFolder = require('os').tmpdir();
    var me = this;
    var baseName = pathlib.basename(url.pathname);
    var folderName;
    if (this.frameworkName) {
      folderName = this.frameworkName; // override
    }
    else {
      folderName = baseName.replace(".git", ""); // remove .git
      if (url.hash) folderName += url.hash.replace("#", "_"); // sproutcore#1.4.5 becomes sproutcore_1.4.5
    }
    var tmpPath = pathlib.join(tmpFolder, "sproutcoreBT_" + this.installId, folderName);
    var cmd = "git clone %@ %@".fmt(url.href, tmpPath);
    if (this.gitBranch) cmd += " -b %@".fmt(this.gitBranch);
    if (!this.silent) SC.Logger.log("Checking out %@ into %@".fmt(url.href, tmpPath));
    // we don't do BT.AsyncWrapper because for some reason it causes errors with child_process.exec
    require('child_process').exec(cmd, function (error, stdout, stderr) {
      if (error) {
        SC.Logger.log("error when checking out: " + require('util').inspect(error));
      }
      else {
        me.gitCheckOutDidFinish.call(me, { ok: true }, stdout, stderr, url, tmpPath, folderName);
      }
    });
    // BT.AsyncWrapper.from('child_process')
    //   .perform('exec', cmd)
    //   .notify(this, this.gitCheckOutDidFinish, url, tmpPath)
    //   .start();
  },

  gitCheckOutDidFinish: function (result, stdout, stderr, url, tmpPath, folderName) {
    //SC.Logger.log("BT.Installer.gitCheckOutDidFinish: " + require('util').inspect(arguments));
    var pathlib = require('path');
    if (SC.ok(result)) {
      // we're checked out, so now copy the files into the target
      if (!this.silent) SC.Logger.log("Checkout complete...");
      var dest = pathlib.join(this.destination, folderName);
      if (!this.silent) SC.Logger.log("Copying into %@".fmt(dest));
      this.installFramework(tmpPath, dest);
      // if this finishes and doesn't crash, we are done copying :)
      // remove the tmp dir
      require('rimraf').sync(tmpPath);
      if (!this.silent) SC.Logger.log("Done copying. Don't forget to configure the new framework.");
    }
    else {
      SC.Logger.log("There was an error checking out the repository: \n" + stderr);
    }
  },

  installFramework: function (from, to) {
    var pathlib = require('path');
    var fslib = require('fs');
    // use code from the scanner, but adjust it a bit
    var copyDir = function (dir, target) {
      var fileList = fslib.readdirSync(dir);
      fileList.forEach(function (fn) {
        var p = pathlib.join(dir, fn);
        var t = pathlib.join(target, fn);
        if (fn === ".git") return; // don't copy .git
        var stat = fslib.statSync(p);
        if (stat.isFile()) {
          //copy file
          //SC.Logger.log("copying %@ to %@".fmt(p, t));
          fslib.writeFileSync(t, fslib.readFileSync(p));
          //after copy, immediately delete the original
          fslib.unlinkSync(p);
        }
        else if (stat.isDirectory()) {
          //allDirs.push(p); // store full path for dir, for watchers
          //ret = ret.concat(scanDir(p));
          try {
            fslib.mkdirSync(t); // if it doesn't exist yet
          }
          catch (e) {
            if (e.code !== "EEXIST") throw e; // filter EEXIST, because that is not a problem
          }
          copyDir(p, t);
        }
      });
    };

    try {
      fslib.mkdirSync(to);
    }
    catch (er) {
      if (er.code !== "EEXIST") throw er; // only throw if other error than that the dir exists
    }

    copyDir(from, to);
  },

  send: function () {
    this.start.apply(this, arguments);
  },

  init: function () {
    this.installId = new Date().getTime();
  }

});

BT.Installer.byGit = function (giturl) {
  return BT.Installer.create({ gitUrl : giturl });
};

BT.startInstall = function (giturl, opts) {
  var pathlib = require('path');
  var dest = opts.isGlobal ? pathlib.join(BT.btPath, "frameworks") : pathlib.join(BT.projectPath, "frameworks");
  if (opts.isGlobal) { // make sure the global frameworks dir exists
    BT.mkdir(BT.btPath, "frameworks");
  }
  else {
    BT.mkdir(BT.projectPath, "frameworks");
  }
  if (opts.destination) { // if given an override, override the destination
    dest = opts.destination;
  }
  BT.Installer.create({
    gitUrl: giturl,
    gitBranch: opts.branch,
    silent: opts.isSilent,
    frameworkName: opts.frameworkName
  }).to(dest).notify(BT, BT._installDidFinish).start();
};

BT._installDidFinish = function () {
  //SC.Logger.log("BT._installDidFinish: " + require('util').inspect(arguments));
};