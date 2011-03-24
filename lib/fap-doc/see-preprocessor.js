var util   = require('./util'),
        fs = require('fs'),
      path = require('path');

/**
 * This is an experimental enhanced version of extend() we came up with
 * ourselves to deal with inheiriting getters and setters down to prototypes.
 * This might get pushed up, but it's experimental because it's kind of
 * ridiculous when you find that you are effectively creating language
 * features just to do normal stuff.
 */
extend = function (tgt) {
  var i,j; for (i = 1; i < arguments.length; i++) {
    var src = arguments[i], p;
    for (j in src) {
      if ((p = src.__lookupGetter__(j))) {
        tgt.__defineGetter__(j, p);
      } else if ((p = src.__lookupSetter__(j))) {
        tgt.__defineSetter__(j, p);
      } else {
        tgt[j] = src[j];
      }
    }
  }
  return tgt;
};

exports.build = function(hax) {
  return new _SeePreproccessor(hax);
};

// test/all/'basic usage'/story
var name = '[- _a-z0-9"\']+';
var see  = '\\(see: ('+name+'(?:\\/'+name+')*)\\)';

var rtest = new RegExp(see);
var rscan = new RegExp('^((?:(?:.|\\s)(?!'+see+'))*(?:.|\\s)?)');
var rtake = new RegExp('^'+see);

function _SeePreproccessor(hax) { this.__hax = hax; }

_SeePreproccessor.prototype = {
  process : function(doc) {
    if (!rtest.test(doc.markdown)) return doc;
    var sexp = [];
    var rest = doc.markdown; // split with zero-width didn't work
    while (rest.length) {
      var match = rscan.exec(rest);
      if (match[1].length) {
        sexp.push(['string', match[1]]);
      }
      rest = rest.substr(match[0].length);
      if ((match2 = rtake.exec(rest))) {
        var m = /(?:^|\n|\r)([^\n\r \t]*)([ \t]*)$/.exec(match[1]);
        var before = { nonwhite : m[1] , white : m[2] };
        sexp.push(['see', match2[1], before]);
        rest = rest.substr(match2[0].length);
      }
    }
    doc.markdown = this._render(sexp);
    return doc;
  },
  _render : function(sexp) {
    strs = [];
    for (var i = 0; i < sexp.length; i++) {
      switch(sexp[i][0]) {
        case 'string' :
          strs.push(sexp[i][1]);
          break;
        case 'see' : default :
          var sp = sexp[i][2];
          strs.push(this._renderSee(sexp[i][1], sp.nonwhite, sp.white));
      }
    }
    return strs.join('');
  },
  _renderSee : function(path, beforeNonwhite, beforeWhite) {
    var m = /^(.+)\/([^\/]+)$/.exec(path);
    var see;
    switch (m[2]) {
      case 'story'  :
        see = new SeeStory(m[1], this.__hax);
        break;
      case 'output' :
        see = new SeeOutput(m[1], this.__hax);
        break;
      default :
        see = new SeeFailed(m[1], this.__hax);
        break;
    }
    return see.render(beforeNonwhite, beforeWhite);
  }
};

var SeeCommon = {
  _commonInit : function(args) {
    this.__path = args[0];
    this.__hax = args[1];
  },
  render : function() {
    return this._unparsed;
  },
  get _unparsed() {
    return '(see: '+this.__path+'/'+this.__token+')';
  },
  _warn  : function(x) { return this.__hax._warn(x); },
  _error : function(x) { return this.__hax._error(x); },
  _parseTestPath : function(path) {
    var md = /^((?:test|spec)s?\/.+)\/["']?(.*[^"'])['"]?$/.exec(path);
    if (!md) return false;
    return { filename : md[1], storyName : md[2] };
  },
  _prerender : function() {
    if (!(p = this._parseTestPath(this.__path))) {
      this._warn('failed to parse '+this.__story+': "' + this.__path + '"');
      return false;
    }
    this.__filename = p.filename;
    this.__storyName = p.storyName;
    if (!this._fileExists()) {
      this._warn('file not found: '+this._filename);
      return false;
    }
    return true;
  },
  _fileExists : function() {
    return path.existsSync(this._filename);
  },
  get _filename() {
    return process.cwd() + '/' + this.__filename + '.js';
  }
};

function SeeFailed() { this._failedInit(arguments); }
SeeFailed.prototype = extend({}, SeeCommon, {
  _failedInit : function(args) {
    this._commonInit(args);
    this.__token = args[2];
  },
  render : function() {
    this._warn("bad see type: "+this.__token);
    return this._unparsed;
  }
});

function SeeOutput() { this._commonInit(arguments); }
SeeOutput.prototype = extend({}, SeeCommon, {
  __token : 'output'
});

function SeeStory() { this._commonInit(arguments); }
SeeStory.prototype = extend({}, SeeCommon, {
  __token : 'story',
  render : function (beforeNonwhite, beforeWhite) {
    if (!this._prerender()) return this._unparsed;
    var contents = fs.readFileSync(this._filename);
    var match = this._matcher.exec(contents);
    if (!match) {
      this._warn('story not found in '+this._filename+': '+this._delimDesc);
      return this._unparsed;
    }
    var indent = (!beforeNonwhite.length && beforeWhite.length) ?
      beforeWhite : '';
    return util.reindent(match[2], match[1], indent);
  },
  get _delimDesc() {
    return '// start story "'+this.__storyName+'"[...]// end story';
  },
  get _matcher() {
    return new RegExp('^([\t ]*)//[\t ]*start story [\'"]?' +
      util.regexpEscape(this.__storyName) + '[\'"]?[ \t]*\n((?:.|[\n\r])+)' +
      '\n[ \t]*//[ \t]*end story[ \t]*(?:\n|$)', 'mi');
  }
});
