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
  if (!manifest.processSexp(sexp)) return false;
  manifest.__path = path;
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
  this._fileNames = [];
  this._fileMeta = {};
};
Manifest.prototype = {
  processSexp : function(sexp) {
    for (var i = 0; i < sexp.length; i ++) {
      var s = sexp[i];
      switch(s[0]) {
        case 'comment' : break;
        case 'file' :
          if (!this._fileMeta[s[1]]){
            this._fileNames.push(s[1]);
            this._fileMeta[s[1]] = {};
          }
          this._fileMeta[s[1]][s[2]] = s[3];
          break;
        default : throw new Error("whoops: handle this: "+s[0]);
      }
    }
    return true;
  },
  path : function() { return this.__path; },
  themeDir : function() { return Path.dirname(this.__path); },
  fileMeta : function(path) {
    if (!this._fileMeta[path]) this._fileMeta[path] = {};
    return this._fileMeta[path];
  },
  fileNames : function() { return this._fileNames; },
  safeRelativePathTo : function(src, f) {
    if (0 != src.indexOf(this.themeDir())) {
      f('The file does not appear to be inside the theme directory:\n'+
        src + '\n' + this.themeDir());
    } else if (0 == src.indexOf(this.filesDir())) {
      var tail = src.substr(this.filesDir().length + 1); // plus '/'
      f(null, tail);
    } else {
      var diffA = this.filesDir().substr(this.themeDir().length);
      var numDotDot = diffA.match(/\//g).length;
      var diffB = src.substr(this.themeDir().length + 1); // plus '/'
      var hack = (new Array(numDotDot+1).join('../')) + diffB;
      // @todo if this breaks look at path.resolve
      f(null, hack);
    }
  },
  filesDir : function() {
    return Path.dirname(this.__path) + '/files';
  }
};
