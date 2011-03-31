#!/usr/bin/env node
;

var c = require('../common');

var t;
var build = function() {
  if (!t) t = require(c.paths.lib + '/code-block/terminal');
  return t.build.call(t, arguments);
};

c.testCase(exports, "Terminal code block", {
  "processes no lines of code with an empty-assed tagset." : function () {
    var term = build(null, null, []);
    var out = term.render();
    this.assert.match(out, new RegExp(
      '^<div class="console">\n' +
      '  <pre><code></code></pre>\n'+
      '</div>\n$'
    ));
  }
}).run();
