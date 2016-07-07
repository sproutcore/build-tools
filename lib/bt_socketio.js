/*jshint node:true */
/*globals BT*/

/*
this contains the code to setup the BT_socket, which handles the channeling of messages from the BT to
the console of the app.
 */

BT.SocketIO = SC.Object.extend({

  httpServer: null,

  _sockets: null, // to keep the sockets on

  _buffer: null,

  init: function () {
    if (!this.httpServer) throw new Error("BT.Socket#");
    var io = require('socket.io')(this.httpServer);
    var me = this;
    if (!this._sockets) this._sockets = [];
    io.on('connection', function (socket) {
      BT.Logger.debug('socket.io connection detected from client');
      me._sockets.push(socket);
      me.broadcastBuffer();
      socket.on('disconnect', function () {
        BT.Logger.debug('socket.io disconnection detected from client');
        me._sockets = me._sockets.filter(function (sock) {
          return sock !== socket;
        });
      });
    });
  },

  broadcast: function (msg) {
    var received = false;
    this._sockets.forEach(function (s) {
      if (s) {
        s.emit("btmsg", msg);
        received = true;
      }
    });
    if (!received) {
      var b = this._buffer;
      if (!b) b = this._buffer = [];
      b.push(msg);
    }
  },

  broadcastBuffer: function () {
    this._buffer.forEach(function (b) {
      this._sockets.forEach(function (s) {
        s.emit("btmsg", b);
      });
    }, this);
    this._buffer = [];
  }
});