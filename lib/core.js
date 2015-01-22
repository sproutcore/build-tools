/*globals BT*/

BT = SC.Object.create({
  VERSION: "0.0.1",

  runningTime: function () {
    var seconds = (Date.now() - BT.startTime) / 1000,
      minutes = Math.floor(seconds / 60);

    seconds = Math.floor(seconds % 60);
    return "%@ minutes %@ secs".fmt(minutes, seconds);
  }.property(),

});