/**
 * This is a standin for a testing f/w that 'feels' right. till we
 * find one, this.
 *
 * objectives: individual test cases can be wrapped in functions.
 * test cases can be grouped into test suites (test units?)
 *
 * individual assertion failures should not stop the whole test
 * suite from completing.
 *
 */

var assert = require('assert'),
       sys = require('sys'),
       optparse = require('../lib/fuckparse');

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

var NapSuitesRunner = function(){
  this.suites = [];
};
NapSuitesRunner.prototype = {
  addSuite : function(suite) {
    this.suites.push(suite);
    return this;
  },
  run : function() {
    if (!this._beforeRunAll()) return; // should have printed errors
    for (var i = 0, j; i < this.suites.length; i++) {
      this.suite = this.suites[i];
      this._beforeRunSuite();
      for (j in this.suite) {
        if (!j.match(/^test[ A-Z0-9]/)) continue;
        this._runWithCatch(j);
        this.numTests += 1;
      }
      this._afterRunSuite();
    }
    this._afterRunAll();
  },
  _makeMatcher : function(which, arg) {
    sys.puts('(not yet implemented: '+which+': "'+arg+'")');
  },
  _runWithCatch : function(fname) {
    try {
      this.suite[fname].apply(this.suite);
    } catch( e ) {
      if (e.name != 'AssertionError') {
        this.suite.assert._E(); // @fixme
        this.numErrors ++;
      }
      this.exceptions.push([this.suite, fname, e]);
    }
  },
  _beforeRunAll : function() {
    this.numOk = 0;
    this.numTests = 0;
    this.numFails = 0;
    this.numErrors = 0;
    this.numAssertions = 0;
    this.exceptions = [];
    this._fullStackOnAssertFails = false; // one day.. command line opts
    this._fullStackOnExceptions = true;
    if (!this._parseCommandLineOptions()) return false;
    this._startClock();
    return true;
  },
  _beforeRunSuite : function() {
    this.suite.assert = new Assertions(this.suite);
    this._announceSuite && this._announceSuite();
    this._announceStarted && this._announceStarted();
  },
  _announceSuite : function() {
    sys.puts("Loaded suite "+this.suite.suiteName);
  },
  _announceStarted : function() {
    sys.puts("Started");
  },
  _afterRunSuite : function() {
    this.suite = null; // for now, sure why not
  },
  _afterRunAll : function() {
    this._stopClock();
    this._announceSummary && this._announceSummary();
    if (this.exceptions.length > 0) this._displayExceptions();
  },
  _startClock : function() {
    this.t1 = new Date();
  },
  _stopClock : function() {
    this.elapsedMs = (new Date()).getTime() - this.t1.getTime();
    sys.puts("\nFinished in "+(1000.0 * this.elapsedMs)+" seconds.");
  },
  _announceSummary : function() {
    sys.puts(this.numTests+" tests, "+this.numAssertions+' assertions, '+
      this.numFails+' failures, '+this.numErrors+' errors'
    );
  },
  _displayExceptions : function() {
    for (var i = 0; i < this.exceptions.length; i ++) {
      var arr = this.exceptions[i];
      if ('AssertionError' == arr[2].name) {
        this._onAssertionError.apply(this, arr);
      } else {
        this._onException.apply(this, arr);
      }
    }
  },
  _onAssertionError : function(suite, meth, e) {
    var msg = '' + suite.suiteName + "." + meth + ' assertion failed: ';
    msg += (e.message ? ('"'+e.message+'"') : e.toString());
    sys.puts("\n"+msg);
    if (this._fullStackOnAssertFails) {
      sys.puts(e.stack);
    } else {
      sys.puts(this._sillyStackSlice(e.stack));
    }
  },
  _onException : function(suite, meth, e) {
    var msg = '' + suite.suiteName + "." + meth + ' threw exception: ' +
      e.toString();
    sys.puts("\n"+msg);
    if (this._fullStackOnExceptions) {
      sys.puts(e.stack);
    } else {
      sys.puts(this._sillyStackSlice(e.stack));
    }
  },
  _sillyStackSlice : function(st) {
    return st.split("\n").slice(2,3).join("\n");
  },
  _parseCommandLineOptions : function() {
    // @todo loosen this up one day when we figure out what we are doing
    var parser = optparse.build(function(o){
      o.on('-n NAME', '--name=NAME', 'Runs tests matching NAME.',
                                     '(patterns may be used)');
      o.on('-t TC', '--testcase=TESTCASE',
                              'Runs tests in TestCases matching TESTCASE.',
                              '(patterns may be used)');
    });
    var req = parser.parse(process.argv);
    if (undefined == req) return true; // no options were passed, keep going
    if (false == req) return false; // final output was put, exit
    if (req.values.name) this._makeMatcher('test', req.values.name);
    if (req.values.testcase) this._makeMatcher('case', req.values.testcase);
    return true; // we prepared the things, now please run the tests.
  }
};
NapSuite.prototype = {
  run : function() {
    var run = (new NapSuitesRunner()).addSuite(this);
    run.run();
  },
  /**
  * experimental safer uglier higher level test case adder.
  * you either should use this or should not use this.  This
  * is guaranteed to be future proof, i think.
  */
  test : function(name, f) {
    this["test "+name] = f;
  }
};

exports.suite = function(name) {
  return new NapSuite(name);
};
