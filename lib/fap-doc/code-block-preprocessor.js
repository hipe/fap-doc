/**
 * per the code-blocks metadata settings, turn codeblocks into
 * syntax-highlighted html.  Be sure to output html following whatever rules
 * the markdown ass processor requires to be happy.
 */
exports.process = function(doc) {
  if (!doc.metadata['code-blocks']) return doc;
  var cbm = new CodeBlocksManager(doc), hax = this;
  cbm.run(function(e){ if (e) hax._error(e, hax.__currentFilename); });
  return doc;
};

var CodeBlocksManager = function(doc) {
  this.__doc = doc;
};

CodeBlocksManager.prototype = {
  run : function(f) {
    var cb = this.__doc.metadata['code-blocks'];
    try {
      this.__codeBlocks = JSON.parse(cb);
    } catch (e) {
      return f('failed to parse json string "' + cb +
        '" - "' + e.toString() + '"');
    }
    // go daddy
  }
};
