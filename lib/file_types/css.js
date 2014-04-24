/*globals BT */

/*
In this class there are quite a few handle* functions which in the end might be
better joined in some way, as each processes the entire text, as it most likely would improve
performance. The gsub route as taken by the slicing (also in this class) was tried at first for the
handleTheme approach, and turned out to slow performance hugely.
Converting the slicing to the line by line approach might increase the performance quite a bit still.
 */

BT.CSSFile = BT.File.extend({

  extension: "css",
  isStylesheet: true,
  contentType: 'text/css',

  handleStatic: function (css) {
    // replace sc_static or static_url with the actual url
    var scstaticRegex = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+?)['\"]\\s*\\)");
    //match[3] contains the filename
    //
    var staticFound = css.search(scstaticRegex) >= 0;
    if (!staticFound) return css; // not found, don't do a thing

    var fw = this.get('framework');
    var lines = css.split("\n");
    var ret = [];
    lines.forEach(function (line) {
      var match, fn, opts, f;
      // scan for every line if it contains scstatic
      match = scstaticRegex.exec(line);
      if (match) {
        fn = match[3];
        // now search for fn in the current fw
        opts = fw.findResourceFor(fn);
        if (opts.length === 0) {
          SC.Logger.log("BT.CssFile#handleStatic: found no files for %@ in file %@".fmt(match[0], this.get('path')));
          ret.push(line);
          return;
        }
        // still running?
        f = opts[0];
        if (opts.length > 1) {
          SC.Logger.log("BT.CssFile#handleStatic: found multiple files for %@ in file %@, taking the first (%@)".fmt(match[0], this.get('path'), f.get('path')));
        }
        // now we have a match, we need an url
        ret.push(line.replace(scstaticRegex, 'url("%@")'.fmt(f.get('relativeUrl'))));
      }
      else {
        ret.push(line);
      }
    }, this);
  },

  handleTheme: function (css) {
    var atTheme = /@theme\([\s\S]+?\)/;
    var dollarTheme = /\$theme\./;
    var lines, ret = [], theme, theme_layer, layer, insideComment;

    var atThemeFound = css.search(atTheme) >= 0;
    var dollarThemeFound = css.search(dollarTheme) >= 0;

    if (!atThemeFound && !dollarThemeFound) return css; // don't parse

    lines = css.split("\n");
    ret = [];
    //TODO: next line now only works for themeClasses...
    theme = this.getPath('framework.name'); // basic theme:
    //SC.Logger.log('basic theme is: ' + theme);
    theme_layer = [theme];
    layer = 1;

    lines.forEach(function (line, linenumber) {
      var tmptheme, at_theme, param;
      var open_comment_pos = line.indexOf("/*");
      var close_comment_pos = line.indexOf("*/");
      var open_comment = open_comment_pos >= 0;
      var close_comment = close_comment_pos >= 0;
      if (open_comment && !close_comment) insideComment = true;
      if (close_comment && !open_comment) insideComment = false;
      if (insideComment) { // only pass over if inside comment
        ret.push(line);
        return;
      }
      if (atThemeFound) { // only run when there is an atTheme found in the file
        at_theme = line.search(atTheme);
        if (at_theme >= 0 && (at_theme < open_comment_pos || at_theme > close_comment_pos)) { // don't parse inside comments
          param = line.match(/\([\s\S]+?\)/);
          if (!param) {
            line += "/* you need to add a parameter when using @theme */";
            ret.push(line);
            SC.Logger.log('@theme found without a parameter in file: ' + this.file.get('path') + " at line: " + linenumber);
            return;
          }
          else param = param[0].substr(1, param[0].length - 2);
          theme_layer.push(param);
          tmptheme = theme_layer.join(".");
          tmptheme = tmptheme[0] === "." ? tmptheme : "." + tmptheme;
          tmptheme = "$theme: \"" + tmptheme + "\";";
          //SC.Logger.log('replacing attheme line, original: ' + line);
          //line = line.replace(atTheme, tmptheme);
          line = tmptheme;
          //SC.Logger.log('replacing attheme line, replacement: ' + line);
          layer += 1;
        }
        if (line.indexOf("{") >= 0) layer += 1;
        if (line.indexOf("}") >= 0) {
          layer -= 1;
          if (theme_layer[layer]) {
            theme_layer.pop();
            tmptheme = theme_layer.join(".");
            tmptheme = tmptheme[0] === "." ? tmptheme: "." + tmptheme;
            //SC.Logger.log("Inserting theme " + tmptheme);
            line = line.replace("}", "$theme: \"" + tmptheme + "\";");
          }
        }
      }
      // replace $theme by #{$theme} if it is followed by ".", "[" or "#"
      line = line.replace(/\$theme([\.\[#\s])/g, "#{$theme}$1");
      ret.push(line);
    }, this);
    return ret.join("\n");
  },



  // function to handle all the mixins compass adds
  // @include transform(translateZ(0px));
  // =>
  // -moz-transform: translateZ(0px);
  // -ms-transform: translateZ(0px);
  // -webkit-transform: translateZ(0px);
  // transform: translateZ(0px);
  // so @include transform(translateZ(0px))
  //
  // handleIncludeTransform: function (css) {
  //   var includeTransformRegEx = /([^\r\n;]*)@include\s+transform\((.+)\);/;
  //   return this.gsub(css, includeTransformRegEx, function (m) {
  //     // m[1] contains the indentation
  //     // m[2] contains the part between ()
  //     SC.Logger.log("match for transform: " + m[2]);
  //     var ret = [];
  //     var basis = "transform: " + m[2] + ";";
  //     ["-moz-", "-ms-", "-webkit-", ""].forEach(function (t) {
  //       ret.push(m[1] + t + basis);
  //     });

  //     return ret.join("\n");
  //   });
  // },

  handleTransform: function (m) {
    // m[1] contains the indentation
    // m[2] contains the part between ()
    //SC.Logger.log("match for transform: " + m[2]);
    var ret = [];
    var basis = "transform: " + m[2] + ";";
    ["-moz-", "-ms-", "-webkit-", ""].forEach(function (t) {
      ret.push(m[1] + t + basis);
    });

    return ret.join("\n");
  },

//@include transition-duration(0.5s);
//line: 356:         @include transition-property(opacity);
//line: 357:         @include transition-timing-function(ease);
//  -moz-transition-duration: 0.5s;
  // -o-transition-duration: 0.5s;
  // -webkit-transition-duration: 0.5s;
  // transition-duration: 0.5s;
  // -moz-transition-property: opacity;
  // -o-transition-property: opacity;
  // -webkit-transition-property: opacity;
  // transition-property: opacity;
  // -moz-transition-timing-function: ease;
  // -o-transition-timing-function: ease;
  // -webkit-transition-timing-function: ease;
  // transition-timing-function: ease;
  // handleIncludeTransition: function (css) {
  //   var includeTransitionRegex = /([^\r\n;]+)@include\s+transition-(.+)\((.+?)\);/;

  //   return this.gsub(css, includeTransitionRegex, function (m) {
  //     // m[1] contains the indentation
  //     // m[2] contains the transition type (ie timing)
  //     // m[3] contains the part between ()
  //     //SC.Logger.log("match: " + SC.inspect(m[1]));

  //     //SC.Logger.log("match: " + m[2]);

  //     var ret = [];
  //     var basis = "transition-" + m[2] + ": " + m[3] + ";";
  //     ["-moz-", "-o-", "-webkit-", ""].forEach(function (t) {
  //       ret.push(m[1] + t + basis);
  //     });
  //     return ret.join("\n");
  //   });
  // },

  handleTransition: function (m) {
    // m[1] contains the indentation
    // m[2] contains the transition type (ie timing)
    // m[3] contains the part between ()
    //SC.Logger.log("match: " + SC.inspect(m[1]));

    //SC.Logger.log("match: " + m[2]);

    var ret = [];
    var basis = "transition-" + m[2] + ": " + m[3] + ";";
    ["-moz-", "-o-", "-webkit-", ""].forEach(function (t) {
      ret.push(m[1] + t + basis);
    });
    return ret.join("\n");
  },

  // handle border-top-radius
  // => @include border-top-radius(4px);
  //   -moz-border-radius-topleft: 4px;
  // -webkit-border-top-left-radius: 4px;
  // border-top-left-radius: 4px;
  // -moz-border-radius-topright: 4px;
  // -webkit-border-top-right-radius: 4px;
  // border-top-right-radius: 4px;
  //
  //=> @include border-bottom-radius(4px);
  //  -moz-border-radius-bottomleft: 4px;
  // -webkit-border-bottom-left-radius: 4px;
  // border-bottom-left-radius: 4px;
  // -moz-border-radius-bottomright: 4px;
  // -webkit-border-bottom-right-radius: 4px;
  // border-bottom-right-radius: 4px;
  //
  // => @include border-left-radius(4px);
  //   -moz-border-radius-topleft: 4px;
  // -webkit-border-top-left-radius: 4px;
  // border-top-left-radius: 4px;
  // -moz-border-radius-bottomleft: 4px;
  // -webkit-border-bottom-left-radius: 4px;
  // border-bottom-left-radius: 4px;
  //
  // => @include border-right-radius(4px);
  //  -moz-border-radius-topright: 4px;
  // -webkit-border-top-right-radius: 4px;
  // border-top-right-radius: 4px;
  // -moz-border-radius-bottomright: 4px;
  // -webkit-border-bottom-right-radius: 4px;
  // border-bottom-right-radius: 4px;
  //
  //
  // handleBorderRadius: function (css) {
  //   var includeBorderRadiusRegex = /([^\r\n;]+)@include\s+border-(.+)-radius\((.+?)\);/;
  //   var names = { // in a hash, because it makes it easier to look things up by loop
  //     mozTopLeft:         "-moz-border-radius-topleft",
  //     mozTopRight:        "-moz-border-radius-topright",
  //     mozBottomLeft:      "-moz-border-radius-bottomleft",
  //     mozBottomRight:     "-moz-border-radius-bottomright",
  //     webkitTopLeft:      "-webkit-border-top-left-radius",
  //     webkitTopRight:     "-webkit-border-top-right-radius",
  //     webkitBottomLeft:   "-webkit-border-bottom-left-radius",
  //     webkitBottomRight:  "-webkit-border-bottom-right-radius",
  //     baseTopRight:       "border-top-right-radius",
  //     baseTopLeft:        "border-top-left-radius",
  //     baseBottomLeft:     "border-bottom-left-radius",
  //     baseBottomRight:    "border-bottom-right-radius"
  //   };

  //   var sides = {
  //     top:    ['TopLeft', 'TopRight'],
  //     bottom: ['BottomLeft', 'BottomRight'],
  //     left:   ['TopLeft', 'BottomLeft'],
  //     right:  ['TopRight', 'BottomRight']
  //   };

  //   return this.gsub(css, includeBorderRadiusRegex, function (m) {
  //     // m[1] contains the indentation
  //     // m[2] contains the side type (ie top)
  //     // m[3] contains the part between ()

  //     var ret = [];
  //     var indent = m[1];
  //     var borderSide = m[2];
  //     var value = m[3];
  //     var sidesToInclude = sides[borderSide];
  //     if (!sidesToInclude) {
  //       SC.Logger.log("css.js: unknown border radius type in " + this.get('path'));
  //       return m[0]; // return the original to leave it in
  //     }

  //     sidesToInclude.forEach(function (side) {
  //       ["moz", "webkit", "base"].forEach(function (b) {
  //         ret.push(indent + names[b + side] + ":" + value + ";");
  //       });
  //     });
  //     return ret.join("\n");
  //   });
  // },

  handleBorderRadius: function (m) {
    //var includeBorderRadiusRegex = /([^\r\n;]+)@include\s+border-(.+)-radius\((.+?)\);/;
    var names = { // in a hash, because it makes it easier to look things up by loop
      mozTopLeft:         "-moz-border-radius-topleft",
      mozTopRight:        "-moz-border-radius-topright",
      mozBottomLeft:      "-moz-border-radius-bottomleft",
      mozBottomRight:     "-moz-border-radius-bottomright",
      webkitTopLeft:      "-webkit-border-top-left-radius",
      webkitTopRight:     "-webkit-border-top-right-radius",
      webkitBottomLeft:   "-webkit-border-bottom-left-radius",
      webkitBottomRight:  "-webkit-border-bottom-right-radius",
      baseTopRight:       "border-top-right-radius",
      baseTopLeft:        "border-top-left-radius",
      baseBottomLeft:     "border-bottom-left-radius",
      baseBottomRight:    "border-bottom-right-radius"
    };

    var sides = {
      top:    ['TopLeft', 'TopRight'],
      bottom: ['BottomLeft', 'BottomRight'],
      left:   ['TopLeft', 'BottomLeft'],
      right:  ['TopRight', 'BottomRight']
    };
    // m[1] contains the indentation
    // m[2] contains the side type (ie top)
    // m[3] contains the part between ()

    var ret = [];
    var indent = m[1];
    var borderSide = m[2];
    var value = m[3];
    var sidesToInclude = sides[borderSide];
    if (!sidesToInclude) {
      SC.Logger.log("css.js: unknown border radius type in " + this.get('path'));
      return m[0]; // return the original to leave it in
    }

    sidesToInclude.forEach(function (side) {
      ["moz", "webkit", "base"].forEach(function (b) {
        ret.push(indent + names[b + side] + ":" + value + ";");
      });
    });
    return ret.join("\n");
  },

  // @include box-shadow(rgba(0,0,0,0.3) 0 0 2px);
  //  -moz-box-shadow: rgba(0, 0, 0, 0.3) 0 0 2px;
  // -webkit-box-shadow: rgba(0, 0, 0, 0.3) 0 0 2px;
  // box-shadow: rgba(0, 0, 0, 0.3) 0 0 2px;
  // handleBoxShadow: function (css) {
  //   var includeBoxShadowRegex = /([^\r\n;]+)@include\s+box-shadow\((.+?)\);/;

  //   return this.gsub(css, includeBoxShadowRegex, function (m) {
  //     // m[1] contains the indentation
  //     // m[2] contains the part between ()

  //     var ret = [];
  //     var basis = "box-shadow: " + m[2] + ";";
  //     ["-moz-", "-webkit-", ""].forEach(function (t) {
  //       ret.push(m[1] + t + basis);
  //     });
  //     return ret.join("\n");
  //   });
  // },

  handleBoxShadow: function (m) {
    // m[1] contains the indentation
    // m[2] contains the part between ()

    var ret = [];
    var basis = "box-shadow: " + m[2] + ";";
    ["-moz-", "-webkit-", ""].forEach(function (t) {
      ret.push(m[1] + t + basis);
    });
    return ret.join("\n");
  },


  // handleCompass: function (css) {
  //   var ret = this.handleIncludeTransform(css);
  //   ret = this.handleIncludeTransition(ret);
  //   ret = this.handleBorderRadius(ret);
  //   ret = this.handleBoxShadow(ret);
  //   return ret;
  // },
  // different approach as the upper one takes +18 seconds startup time
  handleCompass: function (css) {
    var lines = css.split("\n");
    var includes = [
      { fn: 'handleTransform', regex: /([^\r\n;]*)@include\s+transform\((.+)\);/ },
      { fn: 'handleTransition', regex: /([^\r\n;]+)@include\s+transition-(.+)\((.+?)\);/ },
      { fn: 'handleBorderRadius', regex: /([^\r\n;]+)@include\s+border-(.+)-radius\((.+?)\);/ },
      { fn: 'handleBoxShadow', regex: /([^\r\n;]+)@include\s+box-shadow\((.+?)\);/ }
    ];
    var ret = [], i, numlines = lines.length, j, numincludes = includes.length;
    var curline, curinclude, match;

    // var includeBoxShadowRegex = /([^\r\n;]+)@include\s+box-shadow\((.+?)\);/;
    // var includeBorderRadiusRegex = /([^\r\n;]+)@include\s+border-(.+)-radius\((.+?)\);/;
    // var includeTransitionRegex = /([^\r\n;]+)@include\s+transition-(.+)\((.+?)\);/;
    // var includeTransformRegEx = /([^\r\n;]*)@include\s+transform\((.+)\);/;

    for (i = 0; i < numlines; i += 1) {
      curline = lines[i];
      if (curline.indexOf('@include') === -1) {
        ret.push(curline);
      }
      else {
        for (j = 0; j < numincludes; j += 1) {
          curinclude = includes[j];
          match = curinclude.regex.exec(curline);
          if (match) {
            ret.push(this[curinclude.fn].call(this, match));
            j = numincludes; // skip the rest
          }
        }
      }
    }
    return ret.join("\n");
  },


  gsub: function (source, regex, method, target) {
    var result = [], match;
    var matcher;
    if (regex.global) throw "Gsub doesn't work correctly with global regexes...";
    if (SC.typeOf(method) === SC.T_FUNCTION) {
      matcher = method;
    }
    else if (SC.typeOf(method) === SC.T_STRING) {
      if (!target) {
        target = this;
      }
      matcher = this[method];
    }

    while (source.length > 0) {
      match = regex.exec(source);
      if (match) {
        result.push(source.slice(0, match.index));
        if (target) {
          result.push(matcher.call(target, match));
        } else {
          result.push(matcher(match)); // function
        }
        source = source.slice(match.index + match[0].length); // strip the match from source
      }
      else {
        result.push(source);
        source = "";
      }
    }
    return result.join("");
  },

  _getSliceParams: function (str) { // string is entire match
    var work;
    var INDBLQUOTES = /".*"/;
    var INSNGQUOTES = /'.*'/;
    var INNOQUOTES = /\([\s\S]+?[,|\)]/; // no quotes is either (filename, or (filename)
    // filename
    var fn = INDBLQUOTES.exec(str) || INSNGQUOTES.exec(str) || INNOQUOTES.exec(str);
    if (!fn) throw new Error("slice found without filename: string is: " + str);

    var ret = {
      filename: fn[0].substr(1, fn[0].length - 2)
    };

    work = str.replace(/\n/g, ""); // get rid of newlines
    work.split(",").forEach(function (part, i, parts) {
      var p = part.trim(); // get rid of spaces
      if (p[0] !== '$') return; // not a param?
      var isEnd = i === parts.length - 1; // is this the last part?
      var colonpos = p.indexOf(':');
      var propname = p.slice(1, colonpos); // slice off the $
      // take the part after the colon, remove
      var value = isEnd ? p.slice(colonpos + 1, p.length - 2).trim(): p.slice(colonpos + 1, p.length).trim();
      var notIntProp = ['fill', 'skip', 'repeat'];
      ret[propname] = notIntProp.contains(propname) ? value: parseInt(value, 10);
    });
    return ret;
  },

  normalize_rectangle: function (rect) {
    if (rect.left === undefined && rect.right === undefined) rect.left = 0;
    if (rect.width === undefined) {
      if (rect.left === undefined) rect.left = 0;
      if (rect.right === undefined) rect.right = 0;
    }
    if (rect.top === undefined && rect.bottom === undefined) rect.top = 0;
    if (rect.height === undefined) {
      if (rect.top === undefined) rect.top = 0;
      if (rect.bottom === undefined) rect.bottom = 0;
    }
    return rect;
  },

  create_slice: function (opts) {
    var framework = this.get('framework');
    //var util = require('util');
    var pathlib = require('path');
    //SC.Logger.log('creating slice in fw ' + framework.get('name') + ' with opts: ' + SC.inspect(opts));
    var slice;
    var filename = opts.x2 ? opts.filename.slice(0, opts.filename.length - 4) + "@2x.png": opts.filename;
    var optfiles = framework.findResourceFor(filename, pathlib.dirname(this.get('path')));
    //SC.Logger.log('optional matches: ' + optfiles.getEach('path'));
    var ourdir = pathlib.dirname(this.get('path'));
    var files = optfiles.filter(function (f) {
      //SC.Logger.log("trying to join ourdir " + ourdir + " and filename " + filename);
      //SC.Logger.log('so searching for: ' + pathlib.join(ourdir,filename));
      if (f.get('path') === pathlib.join(ourdir, filename)) return true;
    });
    if (!files || files.length === 0) {
      SC.Logger.log('filename not found for slice! ' + filename);
      SC.Logger.log("filename referenced in " + this.get('path'));
      SC.Logger.log("filename part of framework: " + framework.get('name'));
      return;
    }
    opts.file = files[0];
    opts.proportion = opts.x2 ? 2: 1;
    opts = this.normalize_rectangle(opts);
    slice = SC.merge(opts, {
      min_offset_x: opts.offset_x,
      min_offset_y: opts.offset_y,
      max_offset_x: opts.offset_x,
      max_offset_y: opts.offset_y,
      imaged_offset_x: 0,
      imaged_offset_y: 0
    }); // left out the caching here on purpose... if things are too slow to regenerate, it can always be added again
    return slice;
  },

  handle_slice: function (slice) {
    // slice is an object with slice parameters
    var offset;
    if (!slice.offset) {
      slice.offset_x = 0;
      slice.offset_y = 0;
    }
    else {
      offset = slice.offset.trim().split(/\s+/); // split on one or more spaces, tabs
      slice.offset_x = offset[0];
      slice.offset_y = offset[1];
    }
    slice.repeat = slice.repeat ? slice.repeat: 'no-repeat';
    return this.create_slice(slice);
  },

  handle_slices: function (opts) {
    //SC.Logger.log('handle_slices: opts: ' + SC.inspect(opts));

    var fill, fill_w, fill_h, skip, slices, output = [], me = this;
    var shouldIncludeSlice = function (s) {
      if (s.width === undefined || s.width === null) return true;
      if (s.height === undefined || s.width === null) return true;
      if (s.width === 0) return false;
      if (s.height === 0) return false;
      return true;
    };

    var sliceLayout = function (s) {
      var layoutprops = ['left', 'top', 'right', 'bottom'];
      var out = [];
      if (s.right === undefined || s.left === undefined) layoutprops.push('width');
      if (s.bottom === undefined || s.top === undefined) layoutprops.push('height');
      layoutprops.forEach(function (p) {
        if (s[p] !== undefined) out.push("  %@: %@px;\n".fmt(p, s[p]));
      });
      return out.join("");
    };

    if (opts.top === undefined) opts.top = 0;
    if (opts.left === undefined) opts.left = 0;
    if (opts.bottom === undefined) opts.bottom = 0;
    if (opts.right === undefined) opts.right = 0;

    fill = opts.fill || "1 0";
    fill = fill.trim().split(/\s+/);
    fill_w = parseInt(fill[0], 10);
    fill_h = parseInt(fill[1], 10);

    skip = opts.skip ? opts.skip.split(/\s+/): [];
    slices = {
      top_left: { left: 0, top: 0, width: opts.left, height: opts.top,
        sprite_anchor: opts["top-left-anchor"],
        sprite_padding: opts["top-left-padding"],
        offset: opts["top-left-offset"],
        filename: opts.filename
      },
      left: { left: 0, top: opts.top, width: opts.left,
        sprite_anchor: opts["left-anchor"],
        sprite_padding: opts["left-padding"],
        offset: opts["left-offset"],
        filename: opts.filename,
        repeat: fill_h === 0 ? undefined : "repeat-y"
      },
      bottom_left: { left: 0, bottom: 0, width: opts.left, height: opts.bottom,
        sprite_anchor: opts["bottom-left-anchor"],
        sprite_padding: opts["bottom-left-padding"],
        offset: opts["bottom-left-offset"],
        filename: opts.filename
      },
      top: { left: opts.left, top: 0, height: opts.top,
        sprite_anchor: opts["top-anchor"],
        sprite_padding: opts["top-padding"],
        offset: opts["top-offset"],
        filename: opts.filename,
        repeat: fill_w === 0 ? undefined : "repeat-x"
      },
      middle: { left: opts.left, top: opts.top,
        sprite_anchor: opts["middle-anchor"],
        sprite_padding: opts["middle-padding"],
        offset: opts["middle-offset"],
        filename: opts.filename,
        repeat: fill_h !== 0 ? (fill_w !== 0 ? "repeat" : "repeat-y") : (fill_w !== 0 ? "repeat-x" : undefined)
      },
      bottom: { left: opts.left, bottom: 0, height: opts.bottom,
        sprite_anchor: opts["bottom-anchor"],
        sprite_padding: opts["bottom-padding"],
        offset: opts["bottom-offset"],
        filename: opts.filename,
        repeat: fill_w === 0 ? undefined : "repeat-x"
      },
      top_right: { right: 0, top: 0, width: opts.right, height: opts.top,
        sprite_anchor: opts["top-right-anchor"],
        sprite_padding: opts["top-right-padding"],
        offset: opts["top-right-offset"],
        filename: opts.filename
      },
      right: { right: 0, top: opts.top, width: opts.right,
        sprite_anchor: opts["right-anchor"],
        sprite_padding: opts["right-padding"],
        offset: opts["right-offset"],
        filename: opts.filename,
        repeat: fill_h === 0 ? undefined : "repeat-y"
      },
      bottom_right: { right: 0, bottom: 0, width: opts.right, height: opts.bottom,
        sprite_anchor: opts["bottom-right-anchor"],
        sprite_padding: opts["bottom-right-padding"],
        offset: opts["bottom-right-offset"],
        filename: opts.filename
      }
    };

    if (fill_w === 0) {
      slices.top.right = opts.right;
      slices.middle.right = opts.right;
      slices.bottom.right = opts.right;
    }
    else {
      slices.top.width = fill_w;
      slices.middle.width = fill_w;
      slices.bottom.width = fill_w;
    }

    if (fill_h === 0) {
      slices.left.bottom = opts.bottom;
      slices.middle.bottom = opts.bottom;
      slices.right.bottom = opts.bottom;
    }
    else {
      slices.left.height = fill_h;
      slices.middle.height = fill_h;
      slices.right.height = fill_h;
    }

    var includedSlices = [ 'top_left', 'left',
      'bottom_left', 'top',
      'middle', 'bottom',
      'top_right', 'right', 'bottom_right']
      .filter(function (s) {
        return shouldIncludeSlice(s);
      }
    );

    var numIncludedSlices = includedSlices.length;

    if (numIncludedSlices === 0) {
      return;
    }

    var adjustSlices = function (slicename, slices) {
      if (slicename === 'left') slices[slicename].bottom = opts.bottom;
      if (slicename === 'top') slices[slicename].right = opts.right;
      if (slicename === 'middle') {
        slices[slicename].bottom = opts.bottom;
        slices[slicename].right = opts.right;
      }
      if (slicename === 'bottom') slices[slicename].right = opts.right;
      if (slicename === 'right') slices[slicename].bottom = opts.bottom;
      return slices;
    };

    includedSlices.forEach(function (slicename) {
      var layout;
      var cssname = slicename.replace("_", "-");
      // add special case treatment

      // the next bit might need another place... in the original it comes after generating the slice

      var ret = "& > .%@ {\n%@\n position:absolute;\n%@}\n"; // order: slicename,dataurl,slicelayout
      if (!skip.contains(cssname)) {
        var slice = me.handle_slice(slices[slicename]);
        if (!slice) {
          slices = adjustSlices(slicename, slices);
          layout = sliceLayout(slices[slicename]);
          output.push(ret.fmt(cssname, '', layout));
          return;
        }
        var dataurl = this.slice_image(slice, slice.file.get('content'), slicename);
        var bg = "background-image: url(\"%@\"); \n background-position: %@px %@px;".fmt(dataurl, slice.offset_x, slice.offset_y);
        slices = adjustSlices(slicename, slices);
        layout = sliceLayout(slices[slicename]);
        output.push(ret.fmt(cssname, bg, layout));
      }
      else { // this layout stuff can also go to the reporter function...
        slices = adjustSlices(slicename, slices);
        layout = sliceLayout(slices[slicename]);
        output.push(ret.fmt(cssname, '', layout));
      }
    }, this);
    return output.join("\n");
  },

  replacer: function (match) {
    var slice, opts;
    var me = this;
    var m = match[0];
    // the first item is a string, the rest are space separated  items prepended by a $

    opts = this._getSliceParams(m);
    if (m.indexOf("slices") >= 0) { // slice or slices,
      return this.handle_slices(opts);
    }
    else { //slice
      //SC.Logger.log('opts for handle_slice: ' + SC.inspect(opts));
      slice = this.handle_slice(opts);
      if (!slice) return "";

      var dataurl = me.slice_image.call(me, slice, slice.file.get('content'));
      var cssret = 'background-image: url("%@");\n'.fmt(dataurl);
      if (slice.repeat) cssret += 'background-repeat: ' + slice.repeat + ";\n";
      //callback(cssret);
      return cssret;
    }
  },

  slice_rect: function (slice, imageWidth, imageHeight) {
    var rect = {};
    var left = slice.left, top = slice.top, bottom = slice.bottom, right = slice.right,
        width = slice.width, height = slice.height;

    //SC.Logger.log("slice_rect: left: %@, top: %@, bottom: %@, right: %@, width: %@, height: %@".fmt(left,top,bottom,right,width,height));
    //SC.Logger.log('imageWidth: %@, imageHeight: %@'.fmt(imageWidth,imageHeight));

    if (left !== undefined) {
      rect.left = left;
      if (right !== undefined) {
        rect.width = imageWidth - right - left;
      }
      else {
        if (width !== undefined) rect.width = width;
        else rect.width = imageWidth - left;
      }
      //rect.width = (right !== undefined)? imageWidth - right - left: (width !== undefined)? width : imageWidth - left;
    }
    else {
      if (right !== undefined) {
        if (width !== undefined) {
          rect.left = imageWidth - width - right;
          rect.width = width;
        }
        else {
          rect.left = imageWidth - right;
          rect.width = right;
        }
      }
      else {
        rect.left = 0;
        rect.width = imageWidth;
      }
    }
    if (top !== undefined) {
      rect.top = top;
      if (bottom !== undefined) {
        rect.height = imageHeight - bottom - top;
      }
      else {
        if (height !== undefined) rect.height = height;
        else rect.height = imageHeight - top;
      }
      //rect.height = (bottom !== undefined)? imageHeight - bottom - top: (height !== undefined)? height: imageHeight - top;
    }
    else {
      if (bottom !== undefined) {
        if (height !== undefined) {
          rect.top = imageHeight - height - bottom;
          rect.height = height;
        }
        else {
          rect.top = imageHeight - bottom;
          rect.height = bottom;
        }
      }
      else {
        rect.top = 0;
        rect.height = imageHeight;
      }
    }
    if (rect.left === 0 && rect.top === 0 && rect.width === imageWidth && rect.height === imageHeight) {
      return null;
    }
    return rect;
  },

  slice_image: function (slice, filebuffer, cssname) {
    var rect, ctx, Canvas = require('canvas');
    var img = new Canvas.Image();
    img.src = filebuffer;
    //SC.Logger.log(slice.filename + ': image size after loading: w: %@, h: %@'.fmt(img.width,img.height));
    var mustSlice = (slice.left !== 0 || slice.right !== 0 || slice.top !== 0 || slice.bottom !== 0);

    //var t = new Canvas(10,10);
    //SC.Logger.log("canvas is " + t.getContext.toString());
    //var l = t.getContext.call(t,'2d');

    if (!filebuffer) {
      SC.Logger.log('no filebuffer found for ' + slice.file.get('path'));
      return;
    }

    var f = slice.proportion;
    if (mustSlice || slice.x2) {
      if (!img.complete) throw new Error("could not load file: " + slice.file.get('path'));
      if (mustSlice) {
        //SC.Logger.log('mustSlice for slice ' + slice.file.get('path'));
        rect = this.slice_rect(slice, img.width / f, img.height / f);
        if (rect) {
          //if(cssname) SC.Logger.log(cssname + ' rect for file ' +  slice.file.get('path') + ' is: ' + SC.inspect(rect));
          //slice["canvas"] = gm(canvas).crop(rect["width"] * f, rect["height"] * f, rect["left"] * f, rect["top"] * f);
          // crop(w,h,x,y)
          if (rect.width && rect.height) { // only draw on canvas with width and height being not zero
            //SC.Logger.log('creating new canvas with size: ' + rect.width*f + " and " + rect.height*f);
            slice.canvas = new Canvas(rect.width * f, rect.height * f);
            //slice.canvas = new Canvas(img.width,img.height);
            ctx = slice.canvas.getContext("2d");
            //ctx.drawImage(img,0,0,img.width,img.height,rect.left*f,rect.top*f,rect.width*f,rect.height*f);
            ctx.drawImage(img,
                  rect.left * f, rect.top * f,
                  rect.width * f, rect.height * f,
                  0, 0,
                  rect.width * f, rect.height * f);
            return slice.canvas.toDataURL(); // return data url to paste
          }
        }
      }
    }
    slice.canvas = new Canvas(img.width, img.height);
    ctx = slice.canvas.getContext("2d");
    // in abbot the background is actually pink in debug mode to make slicing errors jump out
    // not sure exactly how to do this here, as we are creating a canvas the same size as the slice...
    ctx.drawImage(img, 0, 0, img.width, img.height);
    return slice.canvas.toDataURL(); // return data url to paste
  },

  // apply the slicing to the content and return the result
  applySlicing: function (filecontent) {
    var INCLUDE = /@include\s+slices?\([\s\S]+?\);/;
    //var BETWEENPARENS = /\(.* \)/; //left in in case we'd need this regex somewhere
    return this.gsub(filecontent, INCLUDE, 'replacer');
  },

  isThemeDefinition: function () {
    return this.get('path').indexOf("_theme.css") > -1;
  }.property('path').cacheable(),

  parseContent: function () {
    var raw = this.get('rawContent');
    var sass = require('node-sass');
    var ret;
    var curPath = require('path').dirname(this.get('path'));
    if (!raw) {
      //SC.Logger.log("how can a known file have no rawContent?? " + this.get('path'));
      return " ";
    }
    if (this.get('isThemeDefinition')) {
      this.set('content', "");
      return;
    }
    var r = raw.toString();

    var themeDef = this.findThemeDef(), themeDefContents;
    if (themeDef) {
      // prepend, but strip all comments from _theme.css
      themeDefContents = themeDef.get('rawContent').toString().replace(/\/\*[\s\S]+\*\//g, "");
      r = [themeDefContents, r].join("\n");
    } // if not found, take the current theme name from the fw and prepend it
    else {
      // only works for theme classes, but usually any other framework will have
      // a _theme.css. Perhaps change for frameworks.theme...
      r = '$theme: ".' + this.getPath('framework.name') + '";\n' + r;
    }

    //SC.Benchmark.start('static_url');
    r = this.handleStatic(r);
    //SC.Benchmark.end('static_url');
    //SC.Benchmark.start('slicing');
    r = this.applySlicing(r);
    //SC.Benchmark.end('slicing');
    //SC.Benchmark.start('handleTheme');
    r = this.handleTheme(r);
    //SC.Benchmark.end('handleTheme');
    r = r.replace(/@import[\s\S]?['"].+?['"];/g, ""); // replace import "compass/css3";
    //SC.Benchmark.start('compass');
    r = this.handleCompass(r);
    //SC.Benchmark.end('compass');
    // perhaps find the _theme.css file in the framework file list of the current directory
    // for now, plain sass parsing
    try {
      //SC.Benchmark.start('sass');
      ret = sass.renderSync({ data: r, includePaths: [curPath] });
      //SC.Benchmark.end('sass');
    }
    catch (e) {
      SC.Logger.log("error when parsing sass in " + this.get('path'));
      //SC.Logger.log("content of error: "+ SC.inspect(e));
      var regex = /string\:([0-9]+)/;
      var match = regex.exec(e);
      var line = parseInt(match[1], 10);
      SC.Logger.log("line in error (%@)".fmt(line));
      var start = line < 10 ? 0 : line - 10;
      var lines = r.split('\n');
      for (var i = 0; i < 20; i += 1) {
        SC.Logger.log("line: %@: %@".fmt(start + i, lines[start + i]));
      }
      //SC.Logger.log(r.split("\n")[line]);
      // SC.Logger.log("content: " + r);
      //
      throw e;
    }

    return ret;
  },

  findThemeDef: function () {
    var p = this.get('path');
    var pathlib = require('path');
    var pDir = pathlib.dirname(p);
    // we are searching for _theme.css with the same pDir, or with some others...
    var frameworkDir = this.getPath('framework.path');
    var frameworkFiles = this.getPath('framework.files');
    var workdir = pDir;
    var themeDef, found = false;

    while (!found) {
      themeDef = frameworkFiles.findProperty('path', pathlib.join(workdir, "_theme.css"));
      if (themeDef) found = true;
      else workdir = pathlib.dirname(workdir);
      if (workdir === frameworkDir) found = true;
    }

    return themeDef;
    // var themeDefDir = pathlib.join(pDir,"_theme.css");


    // var themeDef = fw.get('files').findProperty('path',themeDefDir);

  },
});

