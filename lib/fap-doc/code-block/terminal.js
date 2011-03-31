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
 */

var Terminal = function() { };

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
            '' +
            '</code></pre>\n' +
            '</div>\n';
  }
};
