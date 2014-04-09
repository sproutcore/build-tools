
BT.CSSFile = BT.File.extend({
  extension: "css",
  isStylesheet: true,
  contentType: 'text/css',

  // this async gsub works as follows:
  // first all matches are made and prepared
  // the non-matching material is put in a sparse array,
  // which has openings for the new material to be put in
  // the matchers are given an individual callback function
  // closing over the index of the return value
  // the report function then pushes the result into the right
  // spot, and when everything is done, the main callback is called
  // with the result

  //this.gsub(     r.data,INCLUDE,this.replacer,this,         function(result){
  //gsub: function(source,regex,  matcher,      matchertarget,callback,callbacktarget){
  gsub: function (source, regex) {
    var result = [];
    var result_index, match;
    var matchercalls = [];
    var count = 0;
    var me = this;

    // var report_creator = function(match,index){
    //   var reporter = function(newdata){
    //     //tools.log('matcher reporting in with data: ' + newdata);
    //     //tools.log('original data on result array: ' + result[index]);
    //     result[index] = newdata;
    //     count += 1;

    //     if(count >= matchercalls.length){
    //       //tools.log('matcher calls done for ' + me._file.get('path'));
    //       callback.call(callbacktarget,result.join(""));
    //     }
    //   };

    //   return function(){
    //     //tools.log('calling matcher...');
    //     matcher.call(matchertarget,SC.copy(match),reporter);
    //   };
    // };

    while (source.length > 0) {
      match = regex.exec(source);
      if (match) {
        result.push(source.slice(0, match.index));
        result.push(this.replacer(match));
        //result_index = result.push("_placeholder_"); // place holder
        //matchercalls.push(report_creator(match,result_index-1));
        source = source.slice(match.index + match[0].length); // strip the match from source
      }
      else {
        result.push(source);
        source = "";
      }
    }
    return result.join("");
    //tools.log('gsub: num matchercalls: ' + matchercalls.length);
    //if(matchercalls.length === 0) callback.call(callbacktarget,result.join(""));
    //else matchercalls.forEach(function(m){ m(); });
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
    //tools.log('getSliceParams: incoming: ' + str);

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
    //tools.log('getSliceParams: outgoing: ' + tools.inspect(ret));
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
    var pathlib = require('path');
    //tools.log('creating slice with opts: ' + tools.inspect(opts));
    var slice;
    var filename = opts.x2 ? opts.filename.slice(0, opts.filename.length - 4) + "@2x.png": opts.filename;
    var optfiles = framework.findResourceFor(filename);
    //tools.log('optional matches: ' + optfiles.getEach('path'));
    var ourdir = pathlib.dirname(this.get('path'));
    var files = optfiles.filter(function (f) {
      //tools.log("trying to join ourdir " + ourdir + " and filename " + filename);
      //tools.log('so searching for: ' + tools.path.join(ourdir,filename));
      if (f.get('path') === pathlib.join(ourdir, filename)) return true;
    });
    if (!files || files.length === 0) {
      SC.Logger.log('filename not found for slice! ' + filename);
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
    //tools.log('handle_slices: opts: ' + tools.inspect(opts));

    var fill, fill_w, fill_h, skip, slices, output = [], me = this;
    var slicedef;
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

    if(fill_w === 0){
      slices.top.right = opts.right;
      slices.middle.right = opts.right;
      slices.bottom.right = opts.right;
    }
    else {
      slices.top.width = fill_w;
      slices.middle.width = fill_w;
      slices.bottom.width = fill_w;
    }

    if(fill_h === 0){
      slices.left.bottom = opts.bottom;
      slices.middle.bottom = opts.bottom;
      slices.right.bottom = opts.bottom;
    }
    else {
      slices.left.height = fill_h;
      slices.middle.height = fill_h;
      slices.right.height = fill_h;
    }

    var includedSlices = ['top_left','left','bottom_left','top','middle','bottom','top_right','right','bottom_right'].filter(function(s){
      return shouldIncludeSlice(s);
    });

    var repcount = 0;
    var numIncludedSlices = includedSlices.length;

    //tools.log('numIncludedSlices: ' + numIncludedSlices);
    if(numIncludedSlices === 0){
      callback("");
      return;
    }

    var adjustSlices = function(slicename, slices){
      if(slicename === 'left') slices[slicename].bottom = opts.bottom;
      if(slicename === 'top') slices[slicename].right = opts.right;
      if(slicename === 'middle'){
        slices[slicename].bottom = opts.bottom;
        slices[slicename].right = opts.right;
      }
      if(slicename === 'bottom') slices[slicename].right = opts.right;
      if(slicename === 'right') slices[slicename].bottom = opts.bottom;
      return slices;
    };

    // var report = function(data){
    //   output.push(data);
    //   repcount += 1;
    //   //tools.log('slice reporting in: ' + repcount);
    //   if(repcount >= numIncludedSlices) callback(output.join("\n"));
    // };

    //tools.log("included slices for file " + this._file.get('path') + ": " + includedSlices);
    //tools.log("we should also skip " + skip);
    includedSlices.forEach(function(slicename){
      var layout;
      var cssname = slicename.replace("_","-");
      // add special case treatment

      // the next bit might need another place... in the original it comes after generating the slice

      var ret = "& > .%@ {\n%@\n position:absolute;\n%@}\n"; // order: slicename,dataurl,slicelayout
      if(!skip.contains(cssname)){
        var slice = me.handle_slice(slices[slicename]);
        if(!slice){
          slices = adjustSlices(slicename,slices);
          layout = sliceLayout(slices[slicename]);
          //report(ret.fmt(cssname,'',layout));
          output.push(ret.fmt(cssname,'',layout));
          return;
        }
        var dataurl = this.slice_image(slice,slice.file.get('content'),slicename);
        var bg = "background-image: url(\"%@\"); \n background-position: %@px %@px;".fmt(dataurl,slice.offset_x, slice.offset_y);
        slices = adjustSlices(slicename,slices);
        layout = sliceLayout(slices[slicename]);
        output.push(ret.fmt(cssname,bg,layout));
      }
      else { // this layout stuff can also go to the reporter function...
        slices = adjustSlices(slicename,slices);
        layout = sliceLayout(slices[slicename]);
        //report(ret.fmt(cssname,'',layout));
        output.push(ret.fmt(cssname,'',layout));
      }
    }, this);
    return output.join("\n");
  },

  replacer: function(match){
    var slice,opts;
    var me = this;
    var m = match[0];
    // the first item is a string, the rest are space separated  items prepended by a $

    opts = this._getSliceParams(m);
    if(m.indexOf("slices") >= 0){ // slice or slices,
      // handle_slices
      //tools.log('handle_slices match: ' + m);
      //tools.log('opts for handle_slices: ' + tools.inspect(opts));
      //this.handle_slices(opts,callback);
      return this.handle_slices(opts);
    }
    else { //slice
      // handle_slice
      // tools.log('handle_slice match: ' + m);
      //tools.log('opts for handle_slice: ' + tools.inspect(opts));
      slice = this.handle_slice(opts);
      if (!slice) return "";

      var dataurl = me.slice_image.call(me,slice,slice.file.get('content'));
      var cssret = 'background-image: url("%@");\n'.fmt(dataurl);
      if(slice.repeat) cssret += 'background-repeat: ' + slice.repeat + ";\n";
      //callback(cssret);
      return cssret;
    }
  },

  slice_rect: function(slice,imageWidth,imageHeight){
    var rect = {};
    var left = slice.left, top = slice.top, bottom = slice.bottom, right = slice.right,
        width = slice.width, height = slice.height;

    //tools.log("slice_rect: left: %@, top: %@, bottom: %@, right: %@, width: %@, height: %@".fmt(left,top,bottom,right,width,height));
    //tools.log('imageWidth: %@, imageHeight: %@'.fmt(imageWidth,imageHeight));

    if(left !== undefined){
      rect.left = left;
      if(right !== undefined){
        rect.width = imageWidth - right - left;
      }
      else {
        if(width !== undefined) rect.width = width;
        else rect.width = imageWidth - left;
      }
      //rect.width = (right !== undefined)? imageWidth - right - left: (width !== undefined)? width : imageWidth - left;
    }
    else {
      if(right !== undefined){
        if(width !== undefined) {
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
    if(top !== undefined){
      rect.top = top;
      if(bottom !== undefined){
        rect.height = imageHeight - bottom - top;
      }
      else {
        if(height !== undefined) rect.height = height;
        else rect.height = imageHeight - top;
      }
      //rect.height = (bottom !== undefined)? imageHeight - bottom - top: (height !== undefined)? height: imageHeight - top;
    }
    else {
      if (bottom !== undefined){
        if(height !== undefined){
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
    if(rect.left === 0 && rect.top === 0 && rect.width === imageWidth && rect.height === imageHeight){
      return null;
    }
    return rect;
  },

  slice_image: function(slice,filebuffer,cssname){
    var rect, canvas,ctx,ret, Canvas = require('canvas');
    var img = new Canvas.Image();
    img.src = filebuffer;
    //tools.log(slice.filename + ': image size after loading: w: %@, h: %@'.fmt(img.width,img.height));
    var mustSlice = (slice.left !== 0 || slice.right !== 0 || slice.top !== 0 || slice.bottom !== 0);

    var t = new Canvas(10,10);
    //tools.log("canvas is " + t.getContext.toString());
    var l = t.getContext.call(t,'2d');

    if(!filebuffer) {
      tools.log('no filebuffer found for ' + slice.file.get('path'));
      return;
    }

    var f = slice.proportion;
    if(mustSlice || slice.x2){
      if(!img.complete) throw new Error("could not load file: " + slice.file.get('path'));
      if(mustSlice){
        //tools.log('mustSlice for slice ' + slice.file.get('path'));
        rect = this.slice_rect(slice, img.width / f, img.height / f);
        if(rect){
          //if(cssname) tools.log(cssname + ' rect for file ' +  slice.file.get('path') + ' is: ' + tools.inspect(rect));
          //slice["canvas"] = gm(canvas).crop(rect["width"] * f, rect["height"] * f, rect["left"] * f, rect["top"] * f);
          // crop(w,h,x,y)
          if(rect.width && rect.height){ // only draw on canvas with width and height being not zero
            //tools.log('creating new canvas with size: ' + rect.width*f + " and " + rect.height*f);
            slice.canvas = new Canvas(rect.width*f,rect.height*f);
            //slice.canvas = new Canvas(img.width,img.height);
            ctx = slice.canvas.getContext("2d");
            //ctx.drawImage(img,0,0,img.width,img.height,rect.left*f,rect.top*f,rect.width*f,rect.height*f);
            ctx.drawImage(img,rect.left*f,rect.top*f,rect.width*f,rect.height*f,0,0,rect.width*f,rect.height*f);
            return slice.canvas.toDataURL(); // return data url to paste
          }
        }
      }
    }
    slice.canvas = new Canvas(img.width,img.height);
    ctx = slice.canvas.getContext("2d");
    ctx.drawImage(img,0,0,img.width,img.height);
    return slice.canvas.toDataURL(); // return data url to paste
  },

  // apply the slicing to the content and return the result
  applySlicing: function(filecontent){
    var INCLUDE = /@include\s+slices?\([\s\S]+?\);/;
    var BETWEENPARENS = /\(.* \)/;
    return this.gsub(filecontent,INCLUDE);
  },

  parseContent: function () {
    var raw = this.get('rawContent');
    var sass = require('node-sass');
    var curPath = require('path').dirname(this.get('path'));
    if (!raw) {
      //SC.Logger.log("how can a known file have no rawContent?? " + this.get('path'));
      return " ";
    }
    var r = raw.toString();

    //slicing first:
    if (this.get('isThemeDefinition')) {
      //tools.log('file: ' + this._file.get('path') + " is theme def");
      r = "";
    }

    r = this.applySlicing(r);

    // perhaps find the _theme.css file in the framework file list of the current directory
    // for now, plain sass parsing
    try {
      var ret = sass.renderSync({ data: r, includePaths: [curPath] });
    }
    catch (e){
      SC.Logger.log("error when parsing sass in " + this.get('path'));
      throw e;
    }
    return ret
    //return raw.toString();
  }
});

