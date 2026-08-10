/*jshint node:true */
/*globals BT*/

/*
this contains the code to setup the BT_socket, which handles the channeling of messages from the BT to
the console of the app.
 */

BT.SocketIO = SC.Object.extend({

  httpServer: null,

  _io: null,

  _sockets: null, // to keep the sockets on

  _buffer: null,

  init: function () {
    if (!this.httpServer) throw new Error("BT.Socket#");

    var Server = require('socket.io').Server;
    var io = new Server(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this._io = io;
    this._sockets = [];
    this._buffer = [];

    var me = this;

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
    if (this._sockets.length === 0) {
      this._buffer.push(msg);
      return;
    }

    this._sockets.forEach(function (s) {
      if (s && s.connected) s.emit("btmsg", msg);
    });
  },

  broadcastBuffer: function () {
    this._buffer.forEach(function (b) {
      this._sockets.forEach(function (s) {
        if (s && s.connected) {
          s.emit("btmsg", b);
        }
        else {
          BT.Logger.debug('socket.io not connected');
        }
      });
    }, this);
    this._buffer = [];
  },

  destroy: function () {
    if (this._io) {
      this._io.close();
      this._io = null;
    }
    this._sockets = null;
    this._buffer = null;
    return sc_super();
  }
});