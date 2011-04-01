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
 *
 * This is implemented with a two-pass rendering strategy, whose intention
 * is to insulate the specifics of the input format (terminal output with
 * colors) from the specifics of the output format (html), should we want
 * to re-use code from either side of it.
 *
 * The intermediate structure is called a 'sexp', which means S-expression.
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

var _w;
function window() {
  if (!_w) {
    var paths = require('./../paths');
    var jsdom = require(paths.jsdom).jsdom;
    _w = jsdom('', jsdom.defaultLevel,
      { parser : require(paths.htmlparser) }
    ).createWindow();
  }
  return _w;
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
    var ts = this._buildEmptyTagset();
    var addHere = ts.getElementsByTagName("code")[0];
    var sexp = exports.term2sexp(this.__lines.join('\n'));
    for (var i = 0; i < sexp.length; i++) {
      this['_' + sexp[i][0] + 'ToHtml'](sexp[i], addHere);
    }
    return this._jsdomWtf(ts.outerHTML);
  },
  _stringToHtml : function(sexp, toHere) {
    var tn = this._document().createTextNode(sexp[1]);
    toHere.appendChild(tn);
  },
  _spanToHtml : function(sexp, toHere) {
    var spn = this._document().createElement('span');
    spn.setAttribute('class', sexp[1].slice(1).join(' '));
    var txt = this._document().createTextNode(sexp[2]);
    spn.appendChild(txt);
    toHere.appendChild(spn);
  },
  // jsdom, really.  wtf?
  _jsdomWtf : function(str) {
    return str.replace(/\r\n/g, '\n');
  },
  _buildEmptyTagset : function() {
    // <div class="{__cssClassStr}"><pre><code></code></pre></div>
    var doc = this._document();
    var el = doc.createElement('div');
    var el2 = doc.createElement('pre');
    el2.appendChild(doc.createElement('code'));
    el.appendChild(el2);
    el.setAttribute('class', this.__cssClassStr);
    return el;
  },
  _document : function() {
    return _w ? _w.document : window().document;
  }
};
