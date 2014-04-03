BT._resolveReference = function(ref,context){
//  1. "sproutcore": depending on the context this is either an app, a framework or a module in the root of the project
//  2. "sproutcore:desktop": this is the subframework desktop inside the sproutcore framework
//  3. "sproutcore/lib/index.html": this is a reference to the file lib/index.html inside the sproutcore framework
//  4. "http://my.host.ext": a url, is taken literally
  //context is one of "app","framework","module"
  var prefix, p, pathlib = require('path');
  if(context === "app"){
    prefix = "apps";
  } else if(context === "framework"){
    prefix = "frameworks";
  } else if(context === "module"){
    prefix = "modules";
  }
  if(ref.indexOf("http") > -1){
    return ref; // don't do anything
  }
  if(ref.indexOf(":") > -1){
    p = ref.replace(/\:/g,"/frameworks/");
    return pathlib.join(prefix,p);
  }
  return pathlib.join(prefix,ref);
};


BT.addApp = function(ref){
  // add a ref
  //
  var app;
  if(SC.typeOf(ref) === SC.T_STRING){
    app = BT.AppBuilder.create({
      path: 'apps/' + ref
    });
  }
  else {
    app = ref;
  }
  BT.projectManager.addApp(app);
};

BT.addFramework = function(fw){
  BT.projectManager.addFramework(fw);
};
