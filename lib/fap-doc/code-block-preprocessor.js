var path = require('path'),
  paths = require('./paths');

/**
 * Per the code-blocks metadata (and config) settings, turn codeblocks into
 * syntax-highlighted html.  Be sure to output html following whatever rules
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
  _parseMetadata : function() {
    var cb = this.__doc.metadata['code-blocks'], jsonStruct, i;
    if (!cb) {
      jsonStruct = {};
    } else {
      try {
        jsonStruct = JSON.parse(require('./util').untersifyJson(cb));
      } catch (e) {
        return this._error('failed to parse json string "' + cb +
          '" - "' + e.toString() + '"');
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
    this.__codeBlocks.push(_CodeBlock.build(
      this.__chunks.length, this.__codeBlocks.length, lines, this));
    this.__chunks.push(null); // the codeblock will write to this spot later
  }
};

/**
 * This is like an abstract base class for the differnent kinds of code blocks.
 */
var _CodeBlock = {
  /**
  * factory pattern to build out to the appropriate CodeBlock "subclass"
  */
  build : function(chunkIdx, blockIdx, lines, cbm) {
    // it's temping to do it here but we don't merge down a meta structure yet,
    // we let the code block object do it if desired.
    var type = (cbm.__blockMeta[blockIdx] && cbm.__blockMeta[blockIdx].type) ?
      cbm.__blockMeta[blockIdx].type :
      (cbm.__blockMeta['*'] && cbm.__blockMeta['*'].type ?
        cbm.__blockMeta[blockIdx].type :
        (cbm.__hax.__codeBlockOpts.type ?
          cbm.__hax.__codeBlockOpts.type : 'none')
      );
    var codeBlock;
    switch (type) {
      case 'github' :
        codeBlock = new GithubbyCodeBlock(chunkIdx, blockIdx, lines, cbm);
        break;
      case 'none' :
        // will be set below as the catch-all case
        break;
      default :
        // for all other types, attempt to use Syntax Highlighter.  if it
        // is not valid, nullify the object and let it become the default below
        codeBlock = new SyntaxHighlighterCodeBlock(
          chunkIdx, blockIdx, lines, cbm);
        codeBlock.validate() || (codeBlock = null);
    }
    codeBlock || (codeBlock = new BrushlessCodeBlock(
      chunkIdx, blockIdx, lines, cbm
    ));
    return codeBlock;
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

var extend = function(tgt) {
  for (var i = 1; i < arguments.length; i++) {
    var j, src = arguments[i];
    for (j in src) tgt[j] = src[j];
  }
  return tgt;
};

var BrushlessCodeBlock = function() {
  this._codeBlockInit.apply(this, arguments);
};

BrushlessCodeBlock.prototype = extend({}, _CodeBlock.proto, {
  toString : function() { return 'BrushlessCodeBlock'; },

  // for 'none' for now we let daring fireball render it however
  // note that we use 4 spaces instead of any tab the user may have used.
  render : _CodeBlock.proto._renderPlain
});


var GithubbyCodeBlock = function() {
  this._codeBlockInit.apply(this, arguments);
  this.__meta = this._buildMeta();
};

GithubbyCodeBlock.prototype = extend({}, _CodeBlock.proto, {
  toString : function() { return 'GithubbyCodeBlock'; },
  render : function() {
    // get whatever it would be that daring fireball returns
    // and wrap it in your own whodily hah
    var a = ['githubby'];
    if (this.__meta['class-name']) { a.push(this.__meta['class-name']); }
    var wmd = require('wmd'), me = this;
    var doc = wmd('    '+this.__lines.join('\n    '), {// re-add the four spaces
      preprocessors: [ wmd.preprocessors.underscores ],
      postprocessors: [ function(doc) {
        // we could use jsDom but that's a bit overkill innit
        doc.html = '<div class="' + a.join(' ') + '">' + doc.html + '</div>';
      }]
    });
    return doc.toString();
  }
});

var SyntaxHighlighterCodeBlock = function() {
  this._shInit.apply(this, arguments);
};

SyntaxHighlighterCodeBlock.prototype = extend({}, _CodeBlock.proto, {
  toString : function() { return 'js CodeBlock'; },
  _shInit : function() {
    this.__valid = false; // sure why not
    this._codeBlockInit.apply(this, arguments);
    this.__meta = this._buildMeta();
    if (this.__cbm.__hax.__syntaxHighlighterAdapter) {
      this.__adapter = this.__cbm.__hax.__syntaxHighlighterAdapter;
    } else {
      this.__errors = [];
      var sh = (new SyntaxHighlighterAdapter()).init();
      this.__adapter = this.__cbm.__hax.__syntaxHighlighterAdapter =
        (sh.validateTo(this.__errors)) ? sh : 'error';
    }
  },
  _hardCodedMetaDefaults : function() { return this.__hardCodedMetaDefaults; },
  /**
   * Of the available options attotw (auto-links, class-name, collapse,
   *   first-line, gutter, highlight, html-script, smart-tabs, tab-size,
   *   toolbar), some are not relevant here with Syntax Highlighter on the
   * backend (collapse (?), toolbar)
   * At the time of this writing these defaults are as-yet undefined!
   * We may decide that gutter is yes, e.g. If you know what you want, specify
   * it in build.js or the other two places!
   */
  __hardCodedMetaDefaults : { gutter : false, toolbar : false },
  validate : function() {
    if (this.__errors && this.__errors.length) {
      while (this.__errors.length)
        this.__cbm._error(this.__errors.shift());
      return false;
    }
    // errors occured loading it, but we already reported it before.
    if ('error' == this.__adapter) return false;
    return (this.__valid = this._validateBrushAndTheme());
  },
  /**
   * If we can't deduce what brush (as opposed to theme) the user wants,
   * then we can't do syntax highlighting, then there is no reason to deal with
   * themes etc., and at that point you might as well have daring fireball /
   * github style code block.  However, loading the correct theme (as opposed
   * to brush) is not mission critical, and as such, in the case of errors
   * there we will emit a @warning and default to something bland.
   */
  _validateBrushAndTheme : function() {
    if (!(this.__brush =
        this.__adapter.deduceBrush(this.__meta.type))) {
      return this.__cbm._error('unable to deduce brush from '+
        ' "'+this.__meta.type+'"');
    }
    var me = this;
    var tries = [
      function() { return me.__meta.theme; },
      function() { return me.__cbm.__hax.__codeBlockOpts.theme; },
      function() { return me.__adapter.defaultTheme(); }
    ];
    var corrections = [
      null,
      function(x) { me.__cbm.__hax.__codeBlockOpts.defaultTheme = x; },
      null
    ];
    var tryTheme, cleanTheme, last = tries.length - 2, correctThese = [];
    for (var i = 0; i <= last; i ++ ) {
      if ((tryTheme = tries[i]())) {
        if ((cleanTheme = this.__adapter.deduceTheme(tryTheme))) {
          break;
        } else {
          this._warning('unable to deduce theme from "' + tryTheme + '"'
            + ' - using default.');
          if (corrections[i]) correctThese.push(i);
        }
      }
    }
    if (!cleanTheme) cleanTheme = tries[tries.length-1]();
    // this is how we avoid repeated errors on config settings (either client
    // provided or hard coded here)
    while (correctThese.length) corrections[correctThese.shift()](cleanTheme);
    this.__theme = cleanTheme;
    return true;
  },
  render : function() {
    if (!this.__valid) return this._renderPlain();
      // shouldn't ever hit but just in case
    this.__cbm.__hax.requireStylesheet(
      this.__adapter.themePath(this.__theme),
      'syntax-highlighter/' + this.__theme,
      this.__cbm.__hax.__currentDataFilename
    );
    // we sloppily use __meta which might have extraneous keys
    var opts = extend({}, this.__meta);
    // as a convenience, first-line implies gutter
    if (opts['first-line']) opts.gutter = true;
    return this.__adapter.render(
      this.__brush, this.__lines.join("\n"), opts
    );
  }
});


/**
 * This adapter is an experimental attempt at insulating from the
 * CodeBlock prototype any vendor-specific whodily-hahs in the yadda yadda.
 * And it might prove useful if we ever want to talk to Syntax Highlighter
 * in some adapter-ified (that is, insulated) way not related to code blocks.
 */

var SyntaxHighlighterAdapter = function() { };

SyntaxHighlighterAdapter.prototype = {
  init : function() {
    this.__root = paths.syntaxhighlighter;
    this.__stylesPath = this.__root + '/styles';
    this.__scriptsPath = this.__root + '/scripts';
    // it is probably coincidence that the one brush name that has an
    // irregular shortname is also probably what we will most often use
    this.__brushes = { js : 'shBrushJScript.js' };
    return this; // w/e shorthand construction in one line
  },
  /**
   * if we keep our wits about ourselves, this object should be constructed
   * once and only once per build, and this validator should be called once and
   * only once.  Use this space to report about your needs and desires with
   * respect to finding the path to the lib.
   */
  validateTo : function(errors) {
    if (path.existsSync(this.__root)) return true;
    errors.push('SyntaxHighlighterAdapter load failure. Did you try '+
      'installing it with install.rb? path not found: ' + this.__root);
    return false;
  },
  /**
   * attotw brush.init() doesn't complain on unrecognized element keys.
   * if a future version of SH changes this, things will break.
   */
  render : function (brushName, content, brushOpts) {
    if (!this.__loaded) this._load();
    var Brush = require(brushName).Brush;
    var brush = new Brush();
    brush.init(brushOpts);
    return brush.getHtml(content);
  },
  /**
   * In contrast to themes, which we probably won't specify in more than
   * one or a few places, we will work with brushes a lot and specify them
   * from the metadata of documents a lot.  It is useful, then, to have
   * a short, more universal nomenclature for brushes that is not coupled
   * tightly to the underlying syntax highlighter implementation.
   * (E.g. it's better to be able to just say "js" instead of
   * "shBrushJScript.js").  Below implements a regular translation from
   * the one to the other.
   *
   */
  deduceBrush : function(str) {
    if (undefined != this.__brushes[str]) return this.__brushes[str];
    if (!this.__brushesMap) {
      this.__brushesMap = {};
      var files = require('fs').readdirSync(this.__scriptsPath), match;
      for (var i = 0; i < files.length; i ++) {
        if (!(match = /^shBrush(.+)\.js$/.exec(files[i]))) continue;
        this.__brushesMap[match[1].toLowerCase()] = match[0];
      }
    }
    var normalized = str.toLowerCase().replace(/[- ]/g, '');
    var found = this.__brushesMap[normalized] || null;
    return (this.__brushes[str] = found);
  },
  /**
   * take a string expressing a theme and return a normalized, valid
   * theme name.  To keep life simple, for now we require just using
   * the straight up filename, (it also makes the values more readable, to
   * see what's going on) but if we ever change this, this is the place
   * to do this.
   * if a valid theme name cannot be deduced, return null.
   */
  deduceTheme : function(str) {
    if (!this.__themes)
      this.__themes = require('fs').readdirSync(this.__stylesPath);
    return (-1 == this.__themes.indexOf(str)) ? null : str;
  },
  themePath : function(theme) {
    return this.__stylesPath + '/' + theme;
  },
  /**
   * This is the end-all default theme if all other attempts at loading valid
   * themes fail and/or a theme was not specified.  Don't do anything fancy
   * here like do a config file lookup.  This theme must be valid.
   */
  defaultTheme : function () { return 'shCoreDefault.css'; },
  _load : function() {
    if (this.__loaded) return;
    if (-1 == require.paths.indexOf(this.__scriptsPath))
      require.paths.unshift(this.__scriptsPath);
     // we put an extra check in in case we accidentally create more than one
     // adapter during a run.
    this.__loaded = true;
  }
};
