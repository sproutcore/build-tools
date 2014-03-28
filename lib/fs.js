/*
For fs we have a separate manager and class
 */


BT.FSRequest = BT.NodeJSRequest.extend({

  shouldSchedule: true,

  result: function(){
    sc_super();
    if(this.shouldSchedule) this.manager.ready(this);
  },

  unschedule: function(){ // very useful for watchers, can be called without managers supervision
    this.shouldSchedule = false;
    return this;
  },

  notify: function(target,method){
    var ret = sc_super();
    if(this.shouldSchedule) this.manager.schedule(this);
    return ret;
  },

  manager: null // keep a ref

});

BT.FSManager = SC.Object.create({

  init: function(){
    this._queue = [];
    this._inFlight = [];
    this._guessMaxOpen();
  },

  _guessMaxOpen: function(){
    var me = this;
    var exec = require('child_process').exec;
    exec('ulimit -n', function(err, stdout, stderr) {
      var m = 0, num = 0;
      if (err === null) {
        m = parseInt(stdout.trim(), 10);
        if (m > 0) {
          num = m / 16;
          me.maxOpen = (num >= 4)? num: 4;
        }
      }
      else {
        util.log('QFS: Error calculating maximum of simultaneous open files');
      }
    });
  },

  maxOpen: null,

  _queue: null,

  _inFlight: null,

  perform: function(method){
    var args = SC.A(arguments).slice(1);
    return BT.FSRequest.create({
      method: method
    });
  },

  schedule: function(req){
    this._queue.push(req);
    this.parseQueue();
  },

  ready: function(req){
    this._inFlight.removeObject(req);
    this.parseQueue();
  },

  parseQueue: function(){
    var task;
    if(this._queue.length > 0){
      if(this._inFlight.length < this.get('maxOpen')){
        t = this._queue.shift();
        this._inFlight.push(t);
        t.start();
      }
      else this.invokeLater('parseQueue');
    }
  }
});