/*jshint node:true */
/*globals BT*/

/*
this contains the code to setup the BT_socket, which handles the channeling of messages from the BT to
the console of the app.
 */

BT.SocketIO = SC.Object.extend({

  httpServer: null,

  _sockets: null, // to keep the sockets on

  init: function () {
    if (!this.httpServer) throw new Error("BT.Socket#");
    var io = require('socket.io')(this.httpServer);
    var s = this._sockets;
    if (!s) s = this._sockets = [];
    io.on('connection', function (socket) {
      BT.Logger.debug('socket.io connection detected from client');
      s.push(socket);
      socket.on('disconnect', function () {
        BT.Logger.debug('socket.io disconnection detected from client');
        s[s.indexOf(socket)] = null;
      });
    });
  },

  broadcast: function (msg) {
    this._sockets.forEach(function (s) {
      if (s) s.emit("btmsg", msg);
    });
  }
});