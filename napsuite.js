/**
 * This is a standin for a testing f/w that 'feels' right. till we
 * find one, this.
 *
 * wishlist: colors, formatting options for error output.
 *
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
  _F : function() {
    sys.print('F');
  },
  _okNotify : function() {
    this.counts.numOk ++;
    this._dot && this._dot();
  },
  _failNotify : function() {
    this.counts.numFails ++;
    this._F && this._F();
  },
  ok : function(value, message) {
    this.counts.numAssertions += 1;
    if (!!value) { this._okNotify(); return; }
    this._failNotify();
    assert.ok(value, message);
  },
  equal : function(actual, expected, message) {
    this.counts.numAssertions += 1;
    if (actual == expected) { this._okNotify(); return; }
    this._failNotify();
    assert.equal(actual, expected, message);
  }
};

var NapSuite = function(name) {
  this.suiteName = name;
};

NapSuite.prototype = {
  run : function() {
    this._beforeRun();
    var i;
    for (i in this) {
      if (!i.match(/^test\b./)) continue;
      this._runWithCatch(i);
      this.numTests += 1;
    }
    this._afterRun();
  },
  _runWithCatch : function(i) {
    try {
      this[i].apply(this);
    } catch( e ) {
      this.exceptions.push([i, e]);
    }
  },
  _beforeRun : function() {
    this.assert = new Assertions(this);
    this._announceSuite && this._announceSuite();
    this._announceStarted && this._announceStarted();
    this.numOk = 0;
    this.numAssertions = 0;
    this.numTests = 0;
    this.numFails = 0;
    this.exceptions = [];
    // this._fullstack oneday maybe a commandline option
    this._startClock();
  },
  _afterRun : function() {
    this._stopClock();
    this._announceSummary && this._announceSummary();
    if (this.exceptions.length > 0) this._displayExceptions();
  },
  test : function(name, f) {
    this["test "+name] = f;
  },
  ok : function() {
    this.assert.ok.apply(this.assert, arguments);
  },
  equal : function() {
    this.assert.equal.apply(this.assert. arguments);
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
  },
  _displayExceptions : function() {
    for (var i = 0; i < this.exceptions.length; i ++) {
      var arr = this.exceptions[i];
      var meth = arr[0], e = arr[1];
      var msg = '' + this.suiteName + "." + meth + ' assertion failed: ';
      msg += (e.message ? ('"'+e.message+'"') : e.toString());
      sys.puts("\n"+msg);
      if (this._fullstack) {
        sys.puts(e.stack);
      } else {
        sys.puts(this._sillyStackSlice(e.stack));
      }
    }
  },
  _sillyStackSlice : function(st) {
    return st.split("\n").slice(2,3).join("\n");
  }
};

exports.suite = function(name) {
  return new NapSuite(name);
};
