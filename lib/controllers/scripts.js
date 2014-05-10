/*jshint node:true */
/*globals BT */

BT.FrameworkScriptsController = SC.ArrayController.extend({

  framework: null,  // have a link to the framework

  // depends on a content binding
  //
  // orderBy: 'order',
  orderBy: function () {
    return 'order ASC';
  }.property('@each.rawContent'), // have to do it this way in order for the automatic sorting to work.

  filesDidChange: false,

  finishedLoading: function () {
    var ret = this.every(function (f) {
      if (f.get('rawContent') !== null) return true;
    });
    return ret;
    // need to watch rawContent, because content doesn't seem to work.
  }.property('@each.rawContent').cacheable(),

  filesHaveChanged: function () {
    var ret = this.get('propertyRevision');
    //SC.Logger.log("script file has changed..." + ret);

    //return true;
    //return this.get('propertyRevision'); // to make it
    return ret;
  }.property('@each.rawContent'),

  dependenciesDidChange: function () {
    if (!this.get('finishedLoading')) return;
    var fw = this.get('framework');
    if (!fw) return;
    //SC.Logger.log("dependenciesDidChange for framework: " + this.getPath('framework.name'));
    // get all deps
    var deps = {};
    var pathlib = require('path');
    var fwpath = this.get('framework').get('path');
    var corejs = pathlib.join(fwpath, "core.js");
    var mainjs = pathlib.join(fwpath, "main.js");

    this.forEach(function (f) {
      deps[f.get('path')] = f.get('dependencies');
    });
    if (this.getPath('framework.ref') === "sproutcore:jquery") {
      //SC.Logger.log("content of deps: %@".fmt(require('util').inspect(deps)));
    }
    // trouble with sort order, check whether files are actually taken by name / path
    // and the sorting works...
    // now sort
    var filenames = Object.keys(deps).sort();
    var beginWithFiles = filenames.filter(function (f) {
      return f.search(/strings.js/) >= 0;
    });
    if (filenames.contains(corejs)) beginWithFiles = beginWithFiles.concat(corejs);

    var endWithFiles = filenames.contains(mainjs) ? [mainjs] : [];
    var sortedFiles = this.sortFilesByRequirements(filenames, beginWithFiles, endWithFiles, deps);
    this.forEach(function (f) {
      f.set('order', sortedFiles.indexOf(f.get('path')));
    });
    // this.set('orderBy', 'order'); // doesn't pick it up automatically...
    // this.set('filesDidChange', true);
    // this.filesDidChange = false;  // trick to always fire
  }.observes('*@each.dependencies', 'finishedLoading'),

  // scriptSorter: function () {
  //   var me = this;
  //   var files = [];
  //   var sortOrder = {};

  //   var filenames = Object.keys(sortOrder).sort();
  //   var sortedFiles = sortFilesByRequirements(filenames,['core.js'],['main.js'],sortOrder);
  //   sortedFiles.forEach(function(s){
  //     var originalIndex = sortOrder[s]? sortOrder[s].index: -1;
  //     if(originalIndex >= 0) this.push(files[sortOrder[s].index]);
  //   },this);
  // },

  /**
    Test:

      var files = ['bootstrap.js', 'core.js', 'main.js', 'panes/pane.js', 'system/binding.js', 'system/error.js', 'system/object.js', 'views/view.js'],
          beginWithFiles = ['core.js'],
          endWithFiles = ['main.js'];
      var dependencies = {
        'panes/pane.js': ['views/'],
        'system/binding.js': ['system/object.js'],
        'system/error.js': ['views/'],
        'views/view.js': ['system/object']
      }
      var sortedFiles = sortFilesByRequirements(files, beginWithFiles, endWithFiles, dependencies);

    Verify that sortedFiles has the order [core, object, views, pane, binding, error].

    @param {Array} beginWithFiles - a list of files to lead off with, in the order that you want them.
    @param {Array} files - an alphabetical list of all files.
    @param {Array} endWithFiles - a list of files to end with, in the order that you want them.
    @param {Hash} dependencies - a hash of file paths with arrays of required paths. Required paths may be files
           or folders; files may omit their file extensions; folders must end with '/'. Files with no dependencies
           may be omitted from the hash.
  */
  sortFilesByRequirements: function (files, beginWithFiles, endWithFiles, dependencies) {
    // The sorted file list.
    var ret = [];
    var fwpath = this.getPath('framework.path');
    // A stack of files that are currently being processed. (Used for circular dependency detection.)
    var currentlyProcessingFiles = [];

    /*
      The recursive sort function.
      - If passed a folder path (ends in '/'), recurses all matching files.
      - If passed a file name (not a file; '.js' appended if needed), and if file hasn't already been handled
        (i.e. is in ret), recurses its dependencies and adds to ret.
      - the parent parameter describes the file where fileOrFolder is being requested in
    */
    var recurser = function (fileOrFolder, parent) {
      var i, len;

      // Handle folders.
      if (fileOrFolder.slice(-1) === '/') {
        // Scan all files, recursing any matches.
        var folderLen = fileOrFolder.length;

        for (i = 0, len = files.length; i < len; i++) {
          if (files[i].substr(0, folderLen) === fileOrFolder) {
            recurser(files[i], parent);
          }
        }
      }
      // For files, check if it's been handled; if not, recurse its dependencies.
      else {
        // Append file extension if needed. (Would be great to deprecate this.)
        // TODO: Generalize this. We won't always be dealing with .js files.
        if (fileOrFolder.slice(-3) !== '.js') fileOrFolder += '.js';

        // If the file hasn't been processed yet...
        if (!ret.contains(fileOrFolder)) {
          // Check for circularity and error out if found.
          if (currentlyProcessingFiles.contains(fileOrFolder)) {
            SC.Logger.errorGroup('BuildTools encountered a circular dependency.');
            SC.Logger.log("BuildTools encountered a circular dependency.");
            SC.Logger.log('The file %@ was required via sc_require(), while already being processed:'.fmt(fileOrFolder));
            currentlyProcessingFiles.forEach(function (file) { SC.Logger.log('  %@ =>'.fmt(file)); });
            SC.Logger.log('  %@'.fmt(fileOrFolder));
            SC.Logger.log('You must fix this before proceeding.'.fmt(fileOrFolder));
            throw SC.Logger.errorGroupEnd(); // returns undefined. Could be better?
            //throw new Error(" oops...");
          }

          // Get the file's dependencies.
          var theseDependencies = dependencies[fileOrFolder] || SC.EMPTY_ARRAY;
              //i, len;
          // Mark file as in progress (for circular dependency check).
          currentlyProcessingFiles.push(fileOrFolder);
          // Recurse each one.
          for (i = 0, len = theseDependencies.length; i < len; i++) {
            recurser(theseDependencies[i], fileOrFolder);
          }
          // Un-mark file as in progress.
          currentlyProcessingFiles.pop();
          // Add to the list.
          ret.push(fileOrFolder);
        }
      }
    };

    // First we process beginWithFiles.
    var i, len;

    for (i = 0, len = beginWithFiles.length; i < len; i++) {
      recurser(beginWithFiles[i]);
    }

    // Next we process the middle files. (We have to remove endWithFiles from them to be sure that they're not processed
    // until the end; we remove beginWithFiles just for consistency and maybe a speed boost.)
    var middleFiles = files.slice().removeObjects(beginWithFiles).removeObjects(endWithFiles);
    for (i = 0, len = middleFiles.length; i < len; i++) {
      recurser(middleFiles[i]);
    }

    // Finally we process endWithFiles.
    for (i = 0, len = endWithFiles.length; i < len; i++) {
      recurser(endWithFiles[i]);
    }

    return ret;
  }
});