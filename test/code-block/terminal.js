#!/usr/bin/env node
;

var c = require('../common');
var mod = require(c.paths.lib + '/code-block/terminal');
var color = require(c.paths.optparse).color.methods.color;


var tc = c.testCase(exports, "Terminal code block");



tc.childCase("Escape codes sexp", {
  "returns zero length sexp on empty string." : function() {
    var x = mod.term2sexp('');
    this.equal(x.length, 0);
  },
  "gives a one element sexp for a simple string" : function() {
    var x = mod.term2sexp('abc');
    this.equal(x.length, 1);
    this.equal(x[0][0], 'string');
  },
  "gives a one element sexp for a multiline string" : function() {
    var x = mod.term2sexp('abc\ndef');
    this.equal(x.length, 1);
    this.equal(x[0][0], 'string');
  },
  "works for a simple color alone" : function() {
    var x = mod.term2sexp(color('ohai', 'red'));
    this.equal(x.length, 1);
    this.equal(x[0][0], 'span');
    this.equal(x[0].length, 3);
    this.equal(x[0][1][0], 'styles');
    this.equal(x[0][1].length, 2);
    this.equal(x[0][1][1], 'red');
    this.equal(x[0][2], 'ohai');
  },
  "colorized empty string returns empty sexp" : function() {
    var x = mod.term2sexp(color('', 'red'));
    this.equal(0, x.length);
    // does not do this:
    // this.equal(_styleInspect(x[0][1]), '(red)');
    // this.equal('', x[0][2]);
  },
  "works for simple color at beginning" : function() {
    var x = mod.term2sexp(color('ohai', 'red')+' hey');
    this.equal(x.length, 2);
    this.equal(_styleInspect(x[0][1]), '(red)');
    this.equal(x[1][0], 'string');
    this.equal(x[1][1], ' hey');
  },
  "works for multiple color at end" : function() {
    var x = mod.term2sexp('oi ' + color('oh', 'bright', 'blue'));
    this.equal(x.length, 2);
    this.equal(x[0][0], 'string');
    this.equal(x[1][0], 'span');
    this.equal(_styleInspect(x[1][1]), '(bright,blue)' );
  },
  "works for multiple colors in middle" : function() {
    var x = mod.term2sexp("jib "+color('jab', 'bright', 'blue')+' job');
    this.equal(3, x.length);
    this.equal('string', x[0][0]);
    this.equal('jib ', x[0][1]);
    this.equal('string', x[2][0]);
    this.equal(' job', x[2][1]);
    this.equal('span', x[1][0]);
    this.equal('styles', x[1][1][0]);
    this.equal(3, x[1][1].length);
    this.equal('(bright,blue)', _styleInspect(x[1][1]));
  }
});


// test helper
function _styleInspect(style) {
  return '(' + style.slice(1).join(',') + ')';
}


tc.run();
