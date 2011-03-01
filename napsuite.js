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
 *   @todo: decide if we should crap out of a test on assert failure.
 *   @todo: rename to naptest!? napunit!?
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
  this._noticeOnEmptyMatch = true;
  this._matchers = {};
  this.cases = [];
};
NapCasesRunner.prototype = {
  color : optparse.Color.methods.color,
  notice : function(str) { return this.color(str, 'yellow'); },
  toString : function() {
    return 'NapCasesRunner ' + this.cases.size + ' cases.';
  },
  addCase : function(testcase) {
    this.cases.push(testcase);
    return this;
  },
  run : function() {
    if (!this._beforeRunAll()) return; // should have printed errors
    for (var i = 0; i < this.cases.length; i++)
      this._runCase(this.cases[i]);
    this._afterRunAll();
  },
  _runCase : function(caze, asChild) {
    var i;
    this.testcase = caze;
    if (!this._matchers['case'] ||
      this._match('case', this.testcase.getCaseName())
    ) {
      this._beforeRunCase(asChild);
      for (i in this.testcase) {
        var md = i.match(/^test(?=[ _A-Z0-9])[ _]?(.+)$/);
        if (!md) continue;
        if (this._matchers.test && ! this._match('test', md[1])) continue;
        this._runTestWithCatch(i);
        this.num.tests ++;
      }
      this._afterRunCase();
    }
    if (caze._children) {
      for (i = 0; i < caze._children.length; i++) {
        this._runCase(caze._children[i], true);
      }
    }
  },
  _match : function(w, str) {
    var i;
    if (this._matchers[w].regexps) {
      for (i=this._matchers[w].regexps.length; i--;) {
        if (this._matchers[w].regexps[i].test(str)) return true;
      }
    }
    if (this._matchers[w].literals) {
      for (i=this._matchers[w].literals.length; i--;) {
        if (this._matchers[w].literals[i] == str) return true;
      }
    }
    return false;
  },
  puts : sys.puts,
  _makeMatchers : function(w, args) { // w is 'test' or 'case'
    if (!this._matchers[w]) this._matchers[w] = {};
    var md, i, arg;
    for (i=0; i<args.length; i++) {
      arg = args[i];
      if ((md = (/^\/(.+)\/([a-z]*)$/).exec(arg))) {
        if (md[2].length && 'i' != md[2]) {
          this.puts(
          "Can't make matcher with \""+md[0]+
          "\": invalid flag(s) \""+md[2]+"\".");
          this.puts("(The only regexp flag "+
          "that makes sense to in this context is 'i'.)");
          return false;
        }
        if (!this._matchers[w].regexps) this._matchers[w].regexps = [];
        this._matchers[w].regexps.push(new RegExp(md[1], md[2]));
      } else {
        if (!this._matchers[w].literals) this._matchers[w].literals = [];
        this._matchers[w].literals.push(arg);
      }
    }
    return true;
  },
  _inspectMatchers : function() {
    var toks = [];
    if (this._matchers['case'])
      toks.push('cases matching '+this._inspectMatcher('case'));
    if (this._matchers['test'])
      toks.push('tests matching '+this._inspectMatcher('test'));
    return toks.join(' with ');
  },
  _inspectMatcher : function(w) {
    var r = this._matchers[w].regexps, l = this._matchers[w].literals, a = [];
    (r && a.push(optparse.oxfordComma(r, ' or ')));
    (l && a.push(optparse.oxfordComma(l,' or ', optparse.oxfordComma.quote)));
    return a.join(' or ');
  },
  _runTestWithCatch : function(fname) {
    try {
      this.testcase[fname].apply(this.testcase);
    } catch( e ) {
      if (e.name != 'AssertionError') {
        this.testcase.assert._E(); // @fixme
        this.num.unexpectedExceptions ++;
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
  _beforeRunCase : function(asChild) {
    this.testcase.assert = new Assertions(this.num,
      this.testcase.getCaseName());
    if (!asChild) {
      this._announceCase && this._announceCase();
      this._announceStarted && this._announceStarted();
    }
  },
  _announceCase : function() {
    this.puts("Loaded case "+(this.testcase.getCaseName() || '[no name]'));
    // @todo: in ruby test-unit this says "loaded suite". what does it mean?
  },
  _announceStarted : function() {
    this.puts("Started");
  },
  _afterRunCase : function() {
    this.testcase = null;
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
    this.puts("\nFinished in "+(1000.0 * this.elapsedMs)+" seconds.");
  },
  _announceSummary : function() {
    this.puts(this.num.tests+" tests, "+this.num.asserts+' assertions, '+
      this.num.fails+' failures, '+this.num.unexpectedExceptions+' errors'
    );
    if (0==this.num.tests && (this._matchers['case']||this._matchers.test) &&
      this._noticeOnEmptyMatch) this.puts(
        "("+this.notice('notice:')+" found no "+this._inspectMatchers()+'.)');
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
    var msg = testcase.getCaseName() + "." + meth + ' assertion failed: ';
    msg += (e.message ? ('"'+e.message+'"') : e.toString());
    this.puts("\n"+msg);
    if (this._fullStackOnAssertFails) {
      this.puts(e.stack);
    } else {
      this.puts(this._sillyStackSlice(e.stack));
    }
  },
  _onException : function(testcase, meth, e) {
    var msg = '' + testcase.caseName + "." + meth + ' threw exception: ' +
      e.toString();
    this.puts("\n"+msg);
    if (this._fullStackOnExceptions) {
      this.puts(e.stack);
    } else {
      this.puts(this._sillyStackSlice(e.stack));
    }
  },
  _sillyStackSlice : function(st) {
    return st.split("\n").slice(2,3).join("\n");
  },
  _parseCommandLineOptions : function() {
    // @todo loosen this up one day when we figure out what we are doing
    var parser = optparse.build(function(o){
      o.on('-n NAME', '--name=NAME', 'Runs tests matching NAME.',
                                     '(/Patterns/ may be used.)', {list:1});
      o.on('-t TC', '--testcase=TESTCASE',
                              'Runs tests in TestCases matching TESTCASE.',
                              '(/Patterns/ may be used.)', {list:1});
    });
    var req = parser.parse(process.argv);
    if (undefined == req) return true; // no options were passed, keep going
    if (false == req) return false; // final output was put, exit
    if (req.values.name &&
      !this._makeMatchers('test', req.values.name)) return false;
    if (req.values.testcase &&
      !this._makeMatchers('case', req.values.testcase)) return false;
    return true; // we prepared the things, now please run the tests.
  }
};

var NapCase = function(name) {
  this.caseName = name;
};
NapCase.globalRunEnabled = true;
NapCase.prototype = {
  _isNapCase : true,
  toString : function() {
    var s = 'NapCase: ' + (this.caseName || '[no name]');
    if (this._children) s += ', ' + (this._children.length) + ' children';
    return s;
  },
  getCaseName : function() {
    return this.caseName;
  },
  run : function() {
    if (NapCase.globalRunEnabled) {
      var run = (new NapCasesRunner()).addCase(this);
      run.run();
    }
  },
  childCase : function(strOrObj) {
    if ('string' == typeof(strOrObj)) {
      testcase = new NapCase(strOrObj);
      arguments[1] && arguments[1](testcase);
    } else if ('object' == typeof(strOrObj)) {
      testcase = strOrObj;
      if (arguments.size > 1)
        throw new TypeError("when passing object, cannot pass second arg.");
    } else {
      throw new TypeError("bad type for first arg: "+typeof(strOrObj));
    }
    if (!this._children) this._children = [];
    this._children.push(testcase);
    return testcase;
  },
  /**
  * experimental safer uglier higher level test case adder.
  * you either should use this or should not use this.  This
  * is guaranteed to be future proof, i think.
  */
  test : function(name, f) {
    this["test "+name] = f;
  },
  globalRunEnable : function() {
    NapCase.globalRunEnabled = true;
    return this;
  },
  globalRunDisable : function() {
    NapCase.globalRunEnabled = false;
    return this;
  }
};

exports.testCase = function() {
  var i, caze;
  if (arguments.length >= 2) {
    caze = arguments[0];
    caze.caseName = arguments[1];
    for (i in NapCase.prototype) { caze[i] = NapCase.prototype[i]; }
  } else {
    caze = new NapCase(arguments[0]);
  }
  return caze;
};
