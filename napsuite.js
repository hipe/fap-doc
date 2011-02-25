/**
 * This is a standin for a testing f/w that 'feels' right. till we
 * find one, this.
 */

var assert = require('assert'),
       sys = require('sys');

var Assertions = function(suite) {
  this.counts = suite;
};

Assertions.prototype = {
  _dot : function() {
    sys.print('.');
  },
  _okNotify : function() {
    this.counts.numOk ++;
    this._dot && this._dot();
  },
  ok : function(value, message) {
    this.counts.numAssertions += 1;
    if (!!value) { this._okNotify(); return; }
    this._failNotify();
    assert(value, message);
  }
};

var NapSuite = function(name) {
  this.suiteName = name;
};

NapSuite.prototype = {
  run : function() {
    this.assert = new Assertions(this);
    this._announceSuite && this._announceSuite();
    this._announceStarted && this._announceStarted();
    this.numOk = 0;
    this.numAssertions = 0;
    this.numTests = 0;
    this._startClock();
    var i;
    for (i in this) {
      if (!i.match(/^test\b/)) continue;
      this[i].apply(this);
      this.numTests += 1;
    }
    this._stopClock();
    this._announceSummary && this._announceSummary();
  },
  test : function(name, f) {
    this["test "+name] = f;
  },
  _announceSuite : function() {
    sys.puts("Loaded suite "+this.suiteName);
  },
  _announceStarted : function() {
    sys.puts("Started");
  },
  _startClock : function() {
    this.t1 = new Date();
  },
  _stopClock : function() {
    this.elapsedMs = (new Date()).getTime() - this.t1.getTime();
    sys.puts("\nFinished in "+(this.elapsedMs * 1000)+" seconds.");
  },
  _announceSummary : function() {
    sys.puts(this.numTests+" tests, "+this.numAssertions+' assertions');
  }
};

exports.suite = function(name) {
  return new NapSuite(name);
};
