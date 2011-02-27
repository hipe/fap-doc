/**
 * This is a standin for a testing f/w that 'feels' right. till we
 * find one, this.
 *
 * it's becoming a rough attempt at duplicated a small subset of the
 * feel of ruby test-unit.
 *
 * features: groups of related assertions can be grouped in test functions
 * ("tests").  Groups of such tests can be grouped into test cases.
 * Individual assertion failures should not stop the whole test
 * suite from completing.  Application-level runtime errors should not
 * prevent the test suite from completing.
 *
 * Individual tests and test cases can be run in isolation with the use
 * of command-line options.
 *
 * wishlist: more than one testfile!, randomizer, coverage testing.
 *
 */

var assert = require('assert'),
       sys = require('sys'),
       optparse = require('../lib/fuckparse');

var Assertions = function(counts, caseName) {
  this.num = counts;
  this.caseName = caseName;
};

Assertions.prototype = {
  toString : function() {
    return 'napsuite Assertsion for '+this.caseName;
  },
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
    this.num.oks ++;
    this._dot && this._dot();
  },
  _failNotify : function() {
    this.num.fails ++;
    this._F && this._F();
  },
  ok : function(value, message) {
    this.num.asserts ++;
    if (!!value) { this._okNotify(); return; }
    this._failNotify();
    assert.ok(value, message);
  },
  equal : function(actual, expected, message) {
    this.num.asserts ++;
    if (actual == expected) { this._okNotify(); return; }
    this._failNotify();
    assert.equal(actual, expected, message);
  }
};
var NapCasesRunner = function(){
  this._fullStackOnAssertFails = false; // one day.. command line opts
  this._fullStackOnExceptions = true;
  this.cases = [];
};
NapCasesRunner.prototype = {
  toString : function() {
    return 'NapCasesRunner ' + this.cases.size + ' cases.';
  },
  addCase : function(testcase) {
    this.cases.push(testcase);
    return this;
  },
  run : function() {
    if (!this._beforeRunAll()) return; // should have printed errors
    for (var i = 0, j; i < this.cases.length; i++) {
      this.testcase = this.cases[i];
      this._beforeRunCase(this.testcase);
      for (j in this.testcase) {
        if (!j.match(/^test[ A-Z0-9]/)) continue;
        this._runWithCatch(j);
        this.num.tests ++;
      }
      this._afterRunCase();
    }
    this._afterRunAll();
  },
  _makeMatcher : function(which, arg) {
    sys.puts('(not yet implemented: '+which+': "'+arg+'")');
  },
  _runWithCatch : function(fname) {
    try {
      this.testcase[fname].apply(this.testcase);
    } catch( e ) {
      if (e.name != 'AssertionError') {
        this.testcase.assert._E(); // @fixme
        this.num.unexpectedException ++;
      }
      this.exceptionRecords.push([this.testcase, fname, e]);
    }
  },
  _beforeRunAll : function() {
    this.exceptionRecords = [];
    this.num = {
      oks : 0, tests : 0, fails : 0, asserts : 0, unexpectedExceptions: 0
    };
    if (!this._parseCommandLineOptions()) return false;
    this._startClock();
    return true;
  },
  _beforeRunCase : function(testcase) {
    this.testcase.assert = new Assertions(this.num, testcase.getCaseName());
    this._announceCase && this._announceCase();
    this._announceStarted && this._announceStarted();
  },
  _announceCase : function() {
    sys.puts("Loaded case "+this.testcase.caseName);
    // @todo: in ruby test-unit this says "loaded suite". what does it mean?
  },
  _announceStarted : function() {
    sys.puts("Started");
  },
  _afterRunCase : function() {
    this.testcase = null; // for now, sure why not
  },
  _afterRunAll : function() {
    this._stopClock();
    this._announceSummary && this._announceSummary();
    if (this.exceptionRecords.length > 0) this._displayExceptions();
  },
  _startClock : function() {
    this.t1 = new Date();
  },
  _stopClock : function() {
    this.elapsedMs = (new Date()).getTime() - this.t1.getTime();
    sys.puts("\nFinished in "+(1000.0 * this.elapsedMs)+" seconds.");
  },
  _announceSummary : function() {
    sys.puts(this.num.tests+" tests, "+this.num.asserts+' assertions, '+
      this.num.fails+' failures, '+this.num.unexpectedExceptions+' errors'
    );
  },
  _displayExceptions : function() {
    for (var i = 0; i < this.exceptionRecords.length; i ++) {
      var arr = this.exceptionRecords[i];
      if ('AssertionError' == arr[2].name) {
        this._onAssertionError.apply(this, arr);
      } else {
        this._onException.apply(this, arr);
      }
    }
  },
  _onAssertionError : function(testcase, meth, e) {
    var msg = '' + testcase.suiteName + "." + meth + ' assertion failed: ';
    msg += (e.message ? ('"'+e.message+'"') : e.toString());
    sys.puts("\n"+msg);
    if (this._fullStackOnAssertFails) {
      sys.puts(e.stack);
    } else {
      sys.puts(this._sillyStackSlice(e.stack));
    }
  },
  _onException : function(testcase, meth, e) {
    var msg = '' + testcase.caseName + "." + meth + ' threw exception: ' +
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

var NapCase = function(name) {
  this.caseName = name;
};
NapCase.prototype = {
  getCaseName : function() { return this.caseName; },
  toString : function() { return 'NapCase: '+this.caseName; },
  run : function() {
    var run = (new NapCasesRunner()).addCase(this);
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

exports.testCase = function(name) {
  return new NapCase(name);
};
