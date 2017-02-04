/*jshint node:true */
/*globals SC, BT*/

SC.LOGGER_LOG_TRACE = "TRACE: ";
SC.LOGGER_LEVEL_TRACE = 'trace';

SC.Logger._LOG_FALLBACK_PREFIX_MAPPING.trace = SC.LOGGER_LOG_TRACE;
SC.Logger._LOG_LEVEL_MAPPING.trace = 5;

SC.Logger.mixin({

  trace: function(message, optionalFormatArgs) {
    SC.Logger._handleMessage(SC.LOGGER_LEVEL_TRACE, YES, message, arguments);
  },

  traceGroup: function(message, optionalFormatArgs) {
    SC.Logger._handleGroup(SC.LOGGER_LEVEL_TRACE, message, arguments);
  },
  traceGroupEnd: function() {
    SC.Logger._handleGroupEnd(SC.LOGGER_LEVEL_TRACE);
  },

  logFile: null,

  _outputMessage: function(type, timestampStr, indentation, message, originalArguments) {
    var reporter = this.get('reporter'),
      logFile = this.get('logFile'),
      output,
      shouldIndent = !reporter.group;

    output = timestampStr ? timestampStr : "";
    if (shouldIndent) output += this._indentation(indentation);
    message = type.toUpperCase() + ': ' + message;
    output += message;

    if (logFile) {
      var fslib = require('fs');
      var timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      fslib.appendFileSync(logFile, timestamp+' - '+output+"\n");
    }
    else {
      console.log(output);
    }

    if (BT.socketManager) {
      BT.socketManager.broadcast(JSON.stringify({
        type: type,
        message: 'BuildTools: '+output
      }));
    }
  }

});

BT.Logger = SC.Logger;
