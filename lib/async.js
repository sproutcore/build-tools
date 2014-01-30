var SC = require('sc-runtime');

// a small async tool for sc-runtime, where the normal node callback nesting is
// wrapped in an SC.Request notify-like function
//
// How to execute:
//
// call async.exec with the function to be called as first parameter, and the arguments to this function
// as remainder, but do not add the callback function.
// async will assume the callback is the last parameter, and will add one itself.
// then use the notify function to give it a target and method to call, as well as any other parameters you want the
// notify function to have.
// The first argument the notify function will have is the result wrapped in an object, which can be
// checked with SC.ok()
//
//
// var async = require('./async');
// var fs = require('fs');
// async.exec(fs.readFile,'myfile.js').notify(target,method)
//

var Async = module.exports = SC.Object.extend({
  fn: null,
  args: null,
  notify: function(){
    var args = SC.A(arguments);
    var newargs;

    var target = args[0];
    var method = args[1];
    if(SC.typeOf(target) === SC.T_FUNCTION){ // there is no target, just a function, so
      method = args[0];
      target = {}; // empty object, or should we do SC as target?
      newargs = args.slice(1);
    }
    else {
      newargs = args.slice(2);
    }
    this.args.push(this._createCallback(target,method,newargs));
    this.fn.apply(target,this.args);
  },

  _createCallback: function(target, method, args){
    return function(err,result){
      SC.Runloop.begin();
      var ret = {
        error: err,
        result: result
      };

      if(SC.typeOf(method) === SC.T_FUNCTION){
        args.unshift(ret); // add the result as first parameter
        method.apply(target,args);
      }
      else {
        if(SC.instanceOf(target, SC.Statechart)){
          target.sendEvent(method,ret,args);
        }
        else{
          args.unshift(ret); // add the result as first parameter
          target[method].apply(target,args);
        }
      }
      SC.Runloop.end();
    };
  }
});

Async.exec = function(){
  var args = SC.A(arguments);
  if(SC.typeOf(args[0]) === 'function'){
    throw new Error("Async.exec expects a function as first parameter");
  }
  return Async.create({
    fn: args[0],
    args: args.slice(1) // the rest of the arguments
  });
};