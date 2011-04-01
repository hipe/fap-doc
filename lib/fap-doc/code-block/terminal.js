exports.build = function() {
  var t = new Terminal();
  t.terminalInit.apply(t, arguments);
  return t;
};

/**
 * Code block processor for output from terminals that may have ascii color
 * codes in them.  If the string is found to have color-codes in it,
 * do whatever whatever to make it have html ass span tags up in the bitch.
 *
 * This interprets a subset of the spec described at
 *   http://en.wikipedia.org/wiki/ANSI_escape_code
 */

var Terminal = function() { };


/*
 * Items below are exported not because this API needs them,
 * but in anticipation of the tremendous service to the community
 * they will certainly provide by being available.
 */

exports.unmap = { // obviously not exhaustive
  1:'bright',5:'blink',31:'red',32:'green',33:'yellow',34:'blue',35:'purple',
  36:'cyan',37:'white'
};


exports.regexp = /^(.*?)\u001b\[(\d+(?:;\d+)*)m/;

/**
 * with `str` being a string with possibly ansi escape sequences in it,
 * @return [Array] a sexp structure whose elements are of the form:
 *   ['string', string]  or ['span', STYLES, string]
 *   STYLE ::= ['style', num | DESC ... ]
 *    DESC ::= 'red' | 'green' | 'bright' ...
 */
exports.term2sexp = function(str) {
  var sexp = [], stack = [];
  function span(str) {
    if (!stack.length) return ['string', str];
    return ['span', ['styles'].concat(stack), str];
  }
  function match() { // like so just for debuggin
    var r = exports.regexp.exec(str);
    debugger; debugger;
    return r;
  }
  while ((md = match())) {
    if (md[1].length) sexp.push(span(md[1]));
    nums = md[2].split(';');
    for (var i = 0; i < nums.length; i++) {
      var num = nums[i];
      if ('0' == num) {
        stack = []; // note we are disregarding w/e was on stack, ok i think
      } else {
        stack.push( exports.unmap[num] || num );
      }
    }
    str = str.substr(md[0].length);
  }
  if (str.length) sexp.push(span(str));
  return sexp;
};


Terminal.prototype = {
  toString : function() { return 'code-block.Terminal'; },
  terminalInit : function(chunkIdx, blockIdx, lines, cbm, claz) {
    this.__chunkOffset = chunkIdx;
    this.__blockOffset = blockIdx;
    this.__lines = lines;
    this.__cbm = cbm;
    this.__cssClassStr = claz || 'console';
  },
  render : function() {
    return  '<div class="' + this.__cssClassStr + '">\n' +
            '  <pre><code>' +
            this._buildHtmlString() +
            '</code></pre>\n' +
            '</div>\n';
  },
  _buildHtmlString : function() {
    return this._sexpToHtml(exports.term2sexp(this.__lines));
  },
  _sexpToHtml : function() {
    return 'HAHA NOT';
  }
};
