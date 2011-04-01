exports.paths = require('./paths'); // centralized access for children

/**
 * Per the code-blocks metadata (and config) settings, turn codeblocks into
 * syntax-highlighted html, or whatever the metadata calls for.
 * Be sure to output html following whatever rules
 * the markdown ass processor requires to be happy.
 */
exports.process = function(doc) {
  if (!doc.metadata['code-blocks']) return doc;
  var cbm = new CodeBlocksManager(this, doc), hax = this;
  cbm.run(function(e){ if (e) hax._error(e, hax.__currentDataFilename); });
  return doc;
};

/**
 * Below is the implementaion specifics of this preprocessor. It's file private.
 *
 * This is a multi-faceted n-tierd abstraction layer.  One document has one
 * CodeBlocksManager.  For each code block on the page, one CodeBlock object is
 * constructed, whose purpose is to wrap up whatever syntax-highlighter-
 * specific and settings specific things.
 *
 */
var CodeBlocksManager = function(hax, doc) {
  this.__hax = hax;
  this.__doc = doc;
};

CodeBlocksManager.prototype = {
  run : function(f) {
    this.__f = f;
    if (!this._parseMetadata()) return false;
    if (!(/^(?: {4}|\t)/m).test(this.__doc.markdown)) {
      // shorcut: do no processing because doc has no codeblocks
      return f();
    }
    this._parseIntoLinesAndCodeBlocks();
    for (var i = 0; i < this.__codeBlocks.length; i++) {
      var cb = this.__codeBlocks[i];
      this.__chunks[cb.__chunkOffset] = cb.render();
    }
    this.__doc.markdown = this.__chunks.join('\n');
    return f(); // tell it your done
  },
  /**
   * @return { value : someVal, proximity : someInteger, found : bool }
   * `found` is a boolean indicating whether or not we found the property
   * defined anywhere.
   * `proximity` is a non-zero integer indicating the relative proximity
   * of the scope in which the property was associated with the codeblock.
   * (via code block index, via '*' index, or in site-wide configuration),
   * with lower numbers indicating it is earlier in the list.
   * (Might be used for comparative or other decisions about which sets
   * of properties are associated with which.)
   * Returns null if the property is not found anywhere.
   */
  propertyMeta : function(blockIdx, propertyName){
    var v, p;
    if (this.__blockMeta[blockIdx] &&
      undefined != this.__blockMeta[blockIdx][propertyName]) {
        v = this.__blockMeta[blockIdx][propertyName];
        p = 0;
    } else if (this.__blockMeta['*'] &&
      undefined != this.__blockMeta['*'][propertyName]) {
        v = this.__blockMeta['*'][propertyName];
        p = 1;
    } else if (undefined != this.__hax.__codeBlockOpts[propertyName]) {
      v = this.__hax.__codeBlockOpts[propertyName];
      p = 2;
    } else {
      return { found : false, proximity : 3 };
    }
    return { found: true, value : v, proximity : p };
  },
  _parseMetadata : function() {
    var cb = this.__doc.metadata['code-blocks'], jsonStruct, i;
    if (!cb) {
      jsonStruct = {};
    } else {
      try {
        var json = require('./util').untersifyJson(cb);
        jsonStruct = JSON.parse(json);
      } catch (e) {
        return this._error('failed to parse terse json string "' + cb +
          '" (expanded as: "'+json+'") "' + e.toString() + '"');
      }
    }
    var proper = {}, useKey, useValue, j;
    for (i in jsonStruct) {
      if (/^[0-9]+$/.test(i)) useKey = parseInt(i, 10);
      else if ('*' == i) useKey = '*';
      else return this._error('invalid key, expecting DIGIT or "*", not '+
        ' "'+i+"'");
      useValue = ('string' == typeof(jsonStruct[i])) ?
        { type : jsonStruct[i] } : jsonStruct[i];
      if ('object' != typeof(useValue))
        return this._error('invalid value: "' + i +'"');
      // we used to validate type here, but now we defer to the s.h.
      proper[i] = useValue;
    }
    this.__blockMeta = proper;
    return true;
  },
  _error : function(msg) {
    this.__f(msg); return false;
  },
  _parseIntoLinesAndCodeBlocks : function() {
    var lines = this.__doc.markdown.split('\n'), i = 0, match,
      currCodeBlockLines;
    this.__chunks = [];
    this.__codeBlocks = [];
    while (i < lines.length) {
      if ((match = (/^(?: {4}|\t)(.*)$/).exec(lines[i]))) {
        if (!currCodeBlockLines) currCodeBlockLines = [];
        currCodeBlockLines.push(match[1]);
      } else {
        if (currCodeBlockLines) {
          this._addCodeBlock(currCodeBlockLines);
          currCodeBlockLines = null;
        }
        this.__chunks.push(lines[i]);
      }
      i ++;
    }
    if (currCodeBlockLines) this._addCodeBlock(currCodeBlockLines);
  },
  _addCodeBlock : function(lines) {
    this.__codeBlocks.push(_CodeBlock.factory(
      this.__chunks.length, this.__codeBlocks.length, lines, this));
    this.__chunks.push(null); // the codeblock will write to this spot later
  }
};

/**
 * This is like an abstract base class for the differnent kinds of code blocks.
 */
var _CodeBlock = exports._CodeBlock = {
  /**
  * factory pattern to build out to the appropriate CodeBlock "subclass"
  */
  factory : function(chunkIdx, blockIdx, lines, cbm) {
    var o; // code block processor return value
    var claz = cbm.propertyMeta(blockIdx, 'class');
    var type = cbm.propertyMeta(blockIdx, 'type');

    if (claz.found && claz.proximity < type.proximity) {
      o = require('./code-block/css-styled').build(
        chunkIdx, blockIdx, lines, cbm, claz.value
      );
    } else if ('terminal' == type.value ) {
      o = require('./code-block/terminal').build(
        chunkIdx, blockIdx, lines, cbm, claz.value
      );
    } else if ('none' == type.value || undefined == type.value ) {
      // will be set below as the catch-all case
    } else {
      // for all other types, attempt to use Syntax Highlighter.  if it
      // is not valid, nullify the object and let it become the default below
      o = require('./code-block/syntax-highlighter').build(
        chunkIdx, blockIdx, lines, cbm
      );
      o.validate() || (o = null);
    }
    o || (o = new BrushlessCodeBlock(
      chunkIdx, blockIdx, lines, cbm
    ));
    return o;
  },
  proto : {
    // sub-prototypes should override if they want to run conditionally
    validate : function() { return true; },
    _codeBlockInit : function(chunkIdx, blockIdx, lines, codeBlockManager){
      this.__chunkOffset = chunkIdx;
      this.__blockOffset = blockIdx;
      this.__lines = lines;
      this.__cbm = codeBlockManager;
    },
    _renderPlain : function() {
      return '    '+this.__lines.join('\n    ');
    },
    _warning : function(msg) {
      // there appears to be no thingie for emitting warnings
      require('sys').puts(this.__cbm.__hax._silly('petrify hacks warning: ') +
        msg);
    },
    /**
     * This guy is provided as a service to subclasses but is not called
     * by default because it might be expensive or confusing if overused.
     * The idea is that the metadata for a specific codeblock is coming
     * from a stack of possibly four places, all merged down together, in
     * descending order of precedence:
     *   1) codeblock-index-specific settings in the metadata of the document
     *   2) '*' star-type metadata in the metadata of the document
     *   3) arguments that were passed to processCodeBlocks() (__codeBlockOpts)
     *         (these themselves may be a merge product of several calls!?)
     *   4) whatever hard-coded defaults we wanna add here.
     */
    _buildMeta : function() {
      var stack = [], x;
      if ((x = this.__cbm.__blockMeta[this.__blockOffset]))
        stack.unshift('object' == typeof(x) ? x : { type : x });
      if ((x = this.__cbm.__blockMeta['*']))
        stack.unshift('object' == typeof(x) ? x : { type : x });
      stack.unshift(this.__cbm.__hax.__codeBlockOpts);
        // always present, maybe empty
      if (this._hardCodedMetaDefaults && (x = this._hardCodedMetaDefaults()))
        stack.unshift(x);
      stack.unshift({}); // allocate the memory for our doo-hah
      return extend.apply(null, stack); // merge them all down atop each other
    }
  }
};

var extend = exports.extend = function(tgt) {
  for (var i = 1; i < arguments.length; i++) {
    var j, src = arguments[i];
    for (j in src) tgt[j] = src[j];
  }
  return tgt;
};

/**
 * brushless codeblock is the default, do-nothing brush that is used
 * for the unspecified or error-condition handling of code blocks.
 */
var BrushlessCodeBlock = function() {
  this._codeBlockInit.apply(this, arguments);
};

BrushlessCodeBlock.prototype = extend({}, _CodeBlock.proto, {
  toString : function() { return 'BrushlessCodeBlock'; },

  // for 'none' for now we let daring fireball render it however
  // note that we use 4 spaces instead of any tab the user may have used.
  render : _CodeBlock.proto._renderPlain
});
