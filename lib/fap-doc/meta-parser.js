/**
 * this is for parsing meta.txt files
 *
 * usage:
 *    var manifest = require('meta-parser').read('./meta.txt');
 *    manifest.fileMeta('some/file.blah').format # => 'templite'
 *
 */

var fs = require('fs'), Path = require('path');
var o = exports;

o.read = function(path) {
  var contents, parse, sexp, manifest;
  contents = fs.readFileSync(path).toString();
  parse = new Parse(contents);
  if (!(sexp = parse.parse())) return sexp;
  manifest = new Manifest();
  manifest.__maniPath = path;
  if (!manifest._processSexp(sexp)) return false;
  return manifest;
};

var Parse = o.Parse = function(str) { this.str = str; };
Parse.prototype = {
  parse : function() {
    this.i = 0;
    this.lines = this.str.split("\n");
    this.last = this.lines.length - 1;
    this.sexp = [];
    while (this.i <= this.last) {
      var line = this.lines[this.i];
      if (this._parseSpace()) continue;
      if (this._parseComment()) continue;
      if (this._parseFilesDir()) continue;
      if (this._parseAssignments()) continue;
      return this._handleParseFailure();
    }
    return this.sexp;
  },
  _parseSpace : function() {
    if ((/^\s*$/).test(this.lines[this.i])) {
      this.i += 1;
      return true;
    }
  },
  _parseComment : function() {
    var md;
    if ((md = (/^\s*\((.+)\)\s*$/).exec(this.lines[this.i]))){
      this.sexp.push(['comment', md[1]]);
      this.i += 1;
      return true;
    }
  },
  _parseFilesDir : function() {
    var md =
      (/^\s*with files in "([^"]+)"[\.;,]*\s*$/i).exec(this.lines[this.i]);
    if (md) {
      this.sexp.push(['with files in', md[1]]);
      this.i += 1;
      return true;
    }
  },
  _parseAssignments : function() {
    var md;
    if ((md = (/^\s*"([^"]+)" is in "([^"]+)" format\.\s*(.*)$/).
      exec(this.lines[this.i])))
    {
      this.sexp.push(['file', md[1], 'format', md[2]]);
      if (md[3].length) {
        this.lines[this.i] = md[3];
        return true;
      }
      this.i += 1;
      return true;
    }
  },
  _handleParseFailure : function() {
    var msg = 'sorry, with this weak ass parser can\'t parse ' +
      '"' + this.lines[this.i] + '"';
    throw new Error(msg);
  }
};
var Manifest = o.Manifest = function() {
  this.__fileNames = [];
  this.__fileMeta = {};
};
Manifest.prototype = {
  safeRelativePathTo : function(src, f) {
    if (0 != src.indexOf(this._themeDir)) {
      f('The file does not appear to be inside the theme directory:\n'+
        src + '\n' + this._themeDir);
    } else if (0 == src.indexOf(this.filesPath)) {
      var tail = src.substr(this.filesPath.length + 1); // plus '/'
      f(null, tail);
    } else {
      var diffA = this.filesPath.substr(this._themeDir.length);
      var numDotDot = diffA.match(/\//g).length;
      var diffB = src.substr(this._themeDir.length + 1); // plus '/'
      var hack = (new Array(numDotDot+1).join('../')) + diffB;
      // @todo if this breaks look at path.resolve
      f(null, hack);
    }
  },
  get filesPath() {
    if (!this.__filesPath) this.__filesPath = Path.dirname(this.__maniPath);
    return this.__filesPath;
  },
  fileMeta : function(path) {
    if (!this.__fileMeta[path]) this.__fileMeta[path] = {};
    return this.__fileMeta[path];
  },
  _processSexp : function(sexp) {
    for (var i = 0; i < sexp.length; i ++) {
      var s = sexp[i];
      switch(s[0]) {
        case 'comment' :
          break;
        case 'with files in' :
          this.__filesPath = this._themeDir + '/' + s[1];
          break;
        case 'file' :
          if (!this.__fileMeta[s[1]]){
            this.__fileNames.push(s[1]);
            this.__fileMeta[s[1]] = {};
          }
          this.__fileMeta[s[1]][s[2]] = s[3];
          break;
        default : throw new Error("whoops: handle this: "+s[0]);
      }
    }
    return true;
  },
  get _themeDir() { return Path.dirname(this.__maniPath); }
};
