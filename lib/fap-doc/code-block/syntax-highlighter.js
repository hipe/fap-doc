var path  = require('path'),
    lib   = require('./../code-block-preprocessor');

exports.build = function() {
  var hi = new SyntaxHighlighterCodeBlock();
  hi._shInit.apply(hi, arguments);
  return hi;
}


/**
 * Allow code blocks in markdown files to be highlighted
 * by Alex Gorbatchev's famous Syntax Highlighter
 */

var SyntaxHighlighterCodeBlock = function() { };

SyntaxHighlighterCodeBlock.prototype = lib.extend({}, lib._CodeBlock.proto, {
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
        'codeblock metadata type:'+this.__meta.type);
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
    var opts = lib.extend({}, this.__meta);
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
    this.__root = lib.paths.syntaxhighlighter;
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
    if (!str) return false;
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
      require.paths.unshift(this.__scriptsPath); // @todo @fixme
     // we put an extra check in in case we accidentally create more than one
     // adapter during a run.
    this.__loaded = true;
  }
};
