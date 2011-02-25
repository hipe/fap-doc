/**
 * This is a standin for a testing f/w that 'feels' right. till we
 * find one, this.
 *
 * wishlist: colors, formatting options for error output.
 * @todo: refactor to make a runner context
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
  _E : function() {
    sys.print('E');
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
      if (!i.match(/^test[ A-Z0-9]/)) continue;
      this._runWithCatch(i);
      this.numTests += 1;
    }
    this._afterRun();
  },
  _runWithCatch : function(i) {
    try {
      this[i].apply(this);
    } catch( e ) {
      if (e.name != 'AssertionError') {
        this.assert._E();
        this.numErrors ++;
      }
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
    this.numErrors = 0;
    this.exceptions = [];
    // this._fullstackOnAssertFails oneday maybe a commandline option
    this._fullstackOnExceptions = true;
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
    sys.puts(this.numTests+" tests, "+this.numAssertions+' assertions, '+
      this.numFails+' failures, '+this.numErrors+' errors'
    );
  },
  _displayExceptions : function() {
    for (var i = 0; i < this.exceptions.length; i ++) {
      var arr = this.exceptions[i];
      if ('AssertionError' == arr[1].name) {
        this._onAssertionError.apply(this, arr);
      } else {
        this._onException.apply(this, arr);
      }
    }
  },
  _onAssertionError : function(meth, e) {
    var msg = '' + this.suiteName + "." + meth + ' assertion failed: ';
    msg += (e.message ? ('"'+e.message+'"') : e.toString());
    sys.puts("\n"+msg);
    if (this._fullstackOnAssertFails) {
      sys.puts(e.stack);
    } else {
      sys.puts(this._sillyStackSlice(e.stack));
    }
  },
  _onException : function(meth, e) {
    var msg = '' + this.suiteName + "." + meth + ' threw exception: ' +
      e.toString();
    sys.puts("\n"+msg);
    if (this._fullstackOnExceptions) {
      sys.puts(e.stack);
    } else {
      sys.puts(this._sillyStackSlice(e.stack));
    }
  },
  _sillyStackSlice : function(st) {
    return st.split("\n").slice(2,3).join("\n");
  }
};

exports.suite = function(name) {
  return new NapSuite(name);
};
