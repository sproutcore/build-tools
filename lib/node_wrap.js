/*globals BT*/

/*

Purpose of this is that you can simply do:
BT.NodeJSRequest.from('fs').perform('readFile','path/to/file').notify(this,this.hasChanged).start();

 */


BT.AsyncWrapper = SC.Object.extend({

  target: null,

  method: null,

  args: null,

  notifyTarget: null,

  notifyMethod: null,

  notifyArgs: null,

  isSync: false,

  returnValue: null,

  start: function () {
    var me = this;
    var t = this.target;
    var m = t[this.method];
    var cb = function (err, result) {
      if (err) {
        var util = require('util');
        SC.Logger.error("error found when executing BT.AsyncWrapper");
        SC.Logger.error("method: " + me.method);
        SC.Logger.error("error: " + util.inspect(err));
      }
      if (me.method === "exec") {
        SC.Logger.info("stdout: " + result);
      }
      SC.RunLoop.begin();
      me.result.apply(me, arguments);
      SC.RunLoop.end();
    };
    var newArgs;
    var ret;
    if (this.isSync) {
      newArgs = this.args;
      try {
        ret = m.apply(t, newArgs);
        this.returnValue = ret;
        cb(null, ret);
      }
      catch (e) {
        cb(e, ret);
      }
    }
    else {
      newArgs = this.args ? this.args.concat(cb) : [cb];
      this.returnValue = m.apply(t, newArgs);
    }
    return this;
  },

  send: function () { // convenience method for people too much used to SC.Request
    this.start.apply(this, arguments);
  },

  result: function () {
    var resultArgs = SC.A(arguments);
    var t = this.get('notifyTarget');
    var m = this.get('notifyMethod');
    var err = resultArgs[0];
    var retArgs = resultArgs.slice(1);
    var ret = resultArgs[0] ? [{ isError: true, err: err }].concat(retArgs) : retArgs;
    var newargs = ret.concat(this.notifyArgs);
    if (SC.typeOf(m) === SC.T_FUNCTION) {
      m.apply(t, newargs);
    }
    else if (SC.typeOf(m) === SC.T_STRING) {
      t[m].apply(t, newargs);
    }
    if (this.shouldSchedule) BT.AsyncManager.ready(this);
  },

  sync: function () {
    this.isSync = true;
    return this;
  },

  notify: function (target, method) {
    this.notifyTarget = target;
    this.notifyMethod = method;
    this.notifyArgs = SC.A(arguments).slice(2);
    if (this.shouldSchedule) BT.AsyncManager.schedule(this);
    return this;
  },

  perform: function (m) {
    this.method = m;
    this.args = SC.A(arguments).slice(1);
    return this;
  },

  shouldSchedule: true,

  unschedule: function () { // very useful for watchers, can be called without managers supervision
    this.shouldSchedule = false;
    return this;
  }

});

BT.AsyncWrapper.from = function (modname) {
  return BT.AsyncWrapper.create({
    target: require(modname)
  });
};


BT.FSRequest = BT.AsyncWrapper.extend({
  target: require('fs')
});

BT.AsyncManager = SC.Object.create({

  init: function () {
    this._queue = [];
    this._inFlight = [];
    if (require('os').platform() !== "win32") this._guessMaxOpen();
  },

  _guessMaxOpen: function () {
    var me = this;
    var exec = require('child_process').exec;
    exec('ulimit -n', function (err, stdout, stderr) {
      var m = 0, num = 0;
      if (err === null) {
        m = parseInt(stdout.trim(), 10);
        if (m > 0) {
          num = m / 2;
          me.maxOpen = (num >= 4) ? num: 4;
          //SC.Logger.info("number of max files: " + me.maxOpen);
        }
      }
      else {
        SC.Logger.error('BT.AsyncManager: Error calculating maximum of simultaneous open files');
      }
    });
  },

  maxOpen: 128,

  _queue: null,

  _inFlight: null,

  perform: function (target, method) {
    var args = SC.A(arguments).slice(2);
    return BT.AsyncWrapper.create({
      target: require(target),
      method: method,
      args: args
    });
  },

  schedule: function (req) {
    //SC.Logger.info("in flight %@, removing req: %@".fmt(this._inFlight.length, req.args));
    this._queue.push(req);
    this.parseQueue();
  },

  ready: function (req) {
    SC.Logger.info("in flight %@, removing req: %@".fmt(this._inFlight.length, req.args));
    this._inFlight.removeObject(req);
    this.parseQueue();
  },

  parseQueue: function () {
    var task;
    if (this._queue.length > 0) {
      if (this._inFlight.length < this.get('maxOpen')) {
        task = this._queue.shift();
        this._inFlight.push(task);
        task.start();
      }
      else this.invokeLater('parseQueue');
    }
  }
});
