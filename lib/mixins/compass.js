
BT.CompassMixin = {

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
      { fn: 'handleTransition', regex: /([^\r\n;]+)@include\s+transition(-.+)?\((.+?)\);/ },
      { fn: 'handleBorderRadius', regex: /([^\r\n;]+)@include\s+border(-.+)?-radius\((.+?)\);/ },
      { fn: 'handleBoxShadow', regex: /([^\r\n;]+)@include\s+box-shadow\((.+?)\);/ },
      { fn: 'handleBackground', regex: /([^\r\n;]+)@include\s+background(-.+?)?\((.+?)\);/}
    ];
    var ret = [], i, numlines = lines.length, j, numincludes = includes.length;
    var curline, curinclude, match, replaced;

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
        replaced = false;
        for (j = 0; j < numincludes; j += 1) {
          curinclude = includes[j];
          match = curinclude.regex.exec(curline);
          if (match) {
            ret.push(this[curinclude.fn].call(this, match));
            replaced = true;
            j = numincludes; // skip the rest
          }
        }
        if (!replaced) {
          //SC.Logger.log("not replaced line: " + curline);
          ret.push(curline); // if it is an unknown include, leave it in, and let sass handle it
        }
      }
    }
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
    var basis = "transition" + (m[2] || "") + ": " + m[3] + ";";
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
      moz:                "-moz-border-radius",
      webkitTopLeft:      "-webkit-border-top-left-radius",
      webkitTopRight:     "-webkit-border-top-right-radius",
      webkitBottomLeft:   "-webkit-border-bottom-left-radius",
      webkitBottomRight:  "-webkit-border-bottom-right-radius",
      webkit:             "-webkit-border-radius",
      baseTopRight:       "border-top-right-radius",
      baseTopLeft:        "border-top-left-radius",
      baseBottomLeft:     "border-bottom-left-radius",
      baseBottomRight:    "border-bottom-right-radius",
      base:               "border-radius"
    };

    var sides = {
      "-top":    ['TopLeft', 'TopRight'],
      "-bottom": ['BottomLeft', 'BottomRight'],
      "-left":   ['TopLeft', 'BottomLeft'],
      "-right":  ['TopRight', 'BottomRight'],
      "none": [""]
    };
    // m[1] contains the indentation
    // m[2] contains the side type (ie top)
    // m[3] contains the part between ()

    var ret = [];
    var indent = m[1];
    var borderSide = m[2] || "none"; // can be empty
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

  //@include background-image(linear-gradient(top, #EEEEEE, #C0C0C0));
//background-image: -webkit-linear-gradient(top, #eeeeee, #c0c0c0);
  // background-image: -moz-linear-gradient(top, #eeeeee, #c0c0c0);
  // background-image: -o-linear-gradient(top, #eeeeee, #c0c0c0);
  // background-image: -ms-linear-gradient(top, #eeeeee, #c0c0c0);
  // background-image: linear-gradient(top, #eeeeee, #c0c0c0);

  handleBackground: function (m) {
    //m[1] contains indentation
    //m[2] contains "-image" when background-image
    //m[3] contains the part between ()

    var ret = [];
    var basis = "background" + (m[2] || "") + ": " + m[3] + ";";
    //SC.Logger.log("basis in handleBackground: " + basis);
    SC.Logger.log("handleBackground: %@, %@, %@".fmt(m[1], m[2], m[3]));
    ["-webkit-", "-moz-", "-o-", "-ms-", ""].forEach(function (t) {
      ret.push(m[1] + t + basis);
    });
    return ret.join("\n");
  },

};
