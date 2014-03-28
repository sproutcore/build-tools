/*

Purpose of this is that you can simply do:
BT.NodeJSRequest.from('fs').perform('readFile','path/to/file').notify(this,this.hasChanged).start();

 */


BT.NodeJSRequest = SC.Object.extend({

  target: null,

  method: null,

  args: null,

  notifyTarget: null,

  notifyMethod: null,

  notifyArgs: null,

  start: function(){
    var me = this;
    var t = this.target;
    var m = t[this.method];
    var cb = function(err,result){
      SC.RunLoop.begin();
      me.result.call(me,err,result);
      SC.RunLoop.end();
    };
    var newArgs = this.args.concat(cb);
    m.apply(BT.fs,newArgs);
    return this;
  },

  send: function(){ // convenience method for people too much used to SC.Request
    this.start.apply(this,arguments);
  },

  result: function(err,result){
    var t = this.get('notifyTarget');
    var m = this.get('notifyMethod');
    var ret = err? { error: true, err: err }: result;
    var newargs = [ret].concat(this.notifyArgs);
    if(SC.typeOf(m) === SC.T_FUNCTION){
      m.apply(t,newargs);
    }
    else if(SC.typeOf(m) === SC.T_STRING){
      t[m].apply(t,newargs);
    }
  },

  notify: function(target,method){
    this.notifyTarget = target;
    this.notifyMethod = method;
    this.notifyArgs = SC.A(arguments).slice(2);
    return this;
  },

  perform: function(m){
    this.method = m;
    this.args = SC.A(arguments).slice(1);
    return this;
  }

});

BT.NodeJSRequest.from = function(modname){
  return BT.NodeJSRequest.create({
    target: require(modname)
  });
};