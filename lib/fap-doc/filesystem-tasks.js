var Templite = require('../../vendor/fuckparse/lib/templite').Templite,
  en = require('../../vendor/fuckparse/fuckparse'),
  color = en.Color.methods.color,
  fs = require('fs'),
  Path = require('path');

var isDir = exports.isDir = function(path) {
  if (!Path.existsSync(path)) return false;
  return fs.statSync(path).isDirectory();
};

var flatten = exports.flatten = function(dirPath, concatTo, _) {
  var _concatTo = concatTo || [];
  if (!_) _ = '';
  var files = fs.readdirSync(dirPath);
  for (var i = 0; i < files.length; i++) {
    var fullpath = dirPath + '/' + files[i];
    if (isDir(fullpath)) {
      flatten(fullpath, _concatTo, files[i] + '/');
    } else {
      _concatTo.push(_ + files[i]);
    }
  }
  if (!concatTo) return _concatTo;
};

exports.unitOfWork = function(runFunc) {
  var uow = new UnitOfWork();
  uow.defineRunFunc(runFunc);
  return uow;
};

var UnitOfWork = exports.UnitOfWork = function() {
  this._datasourceData = {};
  this._settings = { isDryRun : false };
};

UnitOfWork.prototype = {
  toString : function(){ return 'UnitOfWork'; },
  setDryRunOn : function() { this._settings.isDryRun = true; },
  setData : function(a, b) { this._datasourceData[a] = b; return this; },
  defineRunFunc : function(f) {
    if (this._runSexp) throw new Error("can't define runFunc again!");
    var rd = new _RunDef();
    f(rd);
    this._runSexp = rd.sexp();
    this._varNames = rd.varNames();
  },
  run : function(out, requestValues) {
    this._req = requestValues;
    var b;
    this.err = this.out = out;
    if (!this._checkVariableNames()) return false;
    for (var i = 0; i < this._runSexp.length; i++) {
      var sexp = this._runSexp[i];
      b = sexp.run(this._settings, this._datasourceData, this.out,
        this, this._req);
      if (!b)
        return this.error("filesystem task: there were errors.");
    }
    this.err.puts("done.");
    return true;
  },
  _checkVariableNames : function() {
    var missing = [];
    for (var i = 0; i < this._varNames.length; i ++) {
      var name = this._varNames[i];
      if (undefined == this._datasourceData[this._varNames[i]]) {
        missing.push(this._varNames[i]);
      }
    }
    if (0 != missing.length) return this.error(
      'missing datasource definitions for the template variable(s) '+
      en.oxfordComma(missing, ' and ', en.oxfordComma.quote)
    );
    return true;
  },
  error : function(msg) {
    this.err.puts(msg);
    return false; // important
  }
};

/**
 * this exists only to create the syntax for run definitions for
 * the bodies of filesystem units of work.
 *
 */
var _RunDef = exports._RunDef = function() {
  this._sexp = [];
  this._varNames = [];
};
_RunDef.prototype = {
  toString : function() { return '_RunDef'; },
  sexp : function(){ return this._sexp; },
  varNames : function() { return this._varNames; },
  copy : function(src, dest) {
    var cp = _Copy.build(src, dest);
    this._mergeInVarNames(cp.templateVariableNames());
    this._sexp.push(cp);
  },
  _mergeInVarNames : function(names) {
    for (var i = 0; i < names.length; i ++) {
      var name = names[i];
      if (-1 == this._varNames.indexOf(name))
        this._varNames.push(name);
    }
  }
};


/**
 * "base class" like prototype for directive prototypes
 */
var _DirectivePrototype  = {
  initDirective : function() {
    this._templates = {};
  },
  templateVariableNames : function() {
    var args = [];
    for (var i = 0; i < this._templateyVarNames.length; i ++) {
      args[i] = this._template(this._templateyVarNames[i]);
    }
    return Templite.uniqueVariableNamesIn.apply(Templite, args);
  },
  _template : function(n) {
    if (undefined == this._templates[n]) {
      var t = Templite.buildIfLooksLikeTemplate(this[this._offsets[n]]);
      this._templates[n] = t;
    }
    return this._templates[n];
  },
  _value : function(n) {
    var t;
    if ((t=this._template(n))) return t.run(this._dataSource);
    return this[this._offsets[n]];
  }
};


/**
 * A Directive prototype exists for each directive that can be called
 * from the run definition of a unit of work ("task").  Experimentally
 * they are not ordinary objects but Array objects, (to look like sexp elements)
 * for now.
 */

var _Copy = exports._Copy = {
  build : function(src, dest) {
    var sexp = ['copy', src, dest], i;
    for (i in _Copy.prototip) sexp[i] = _Copy.prototip[i];
    sexp.initCopy();
    return sexp;
  }
};
_Copy.prototip = {
  _offsets : { src : 1, dest : 2 },
  _templateyVarNames : ['src', 'dest'],
  initCopy : function() { this.initDirective(); },
  run : function(settings, dataSource, out, onErr, req) {
    this._set = settings;
    this._dataSource = dataSource;
    this.out = this.err = out;
    this.on = onErr;
    this.req = req;

    this.fakeExists = {};

    var filesDir = this.filesDir = this._value('src') + '/files';
    this.destDir = this._value('dest');
    if (!this._dstDirCheck()) return false;
    if (!isDir(filesDir)) return this.on.error('is not directory: '+filesDir);
    var files = flatten(filesDir);
    for (var i = 0; i < files.length; i++) {
      if (!this._copyFile(files[i])) return false;
    }
    return true;
  },
  _dstDirCheck : function() {
    var must = Path.dirname(this.dstDir);
    if (!isDir(must)) return this.on.error('containing directory of output '+
      ' directory must exist: "' + must +'"');
    return true;
  },
  _copyFile : function(localName) {
    var srcFull = this.filesDir + '/' + localName;
    var dstFull = this.destDir + '/' + localName;
    if (this.req.prune) return this._prune(srcFull, dstFull);
    if (Path.existsSync(dstFull)) {
      return this.on.error('exists, won\'t overwrite: ' + dstFull);
    }
    var dstDir = Path.dirname(dstFull);
    if (!this.fakeExists[dstDir] && !(this.fakeExists[dstDir] = isDir(dstDir))){
      if (!this._mkdir(dstDir)) return false;
    }
    return this._cp(srcFull, dstFull);
  },
  _mkdir : function(dir) {
    var parent = Path.dirname(dir);
    if (!this.fakeExists[parent] && !isDir(parent)) {
      if (!this._mkdir(parent)) return false;
    }
    this.fakeExists[dir] = true;
    this.err.puts(color('mkdir ', 'green')+dir);
    if (false == this._set.isDryRun) {
      fs.mkdirSync(dir, 0755);
    }
    return true;
  },
  _cp : function(src, dst) {
    this.err.puts(color('cp ','green') + src + ' ' + dst);
    var wholeFile = fs.readFileSync(src);
    if (this._set.isDryRun) return true;
    fs.writeFileSync(dst, wholeFile);
    return true;
  },
  _prune : function(src, dst) {
    if (!Path.existsSync(dst)) {
      this.err.puts('does not exist, cannot prune: '+dst);
      return true;
    }
    var left = fs.readFileSync(src).toString();
    var rite = fs.readFileSync(dst).toString();
    if (left == rite) {
      this.err.puts(color('rm ','green') + dst);
      if (false == this._set.isDryRun) fs.unlinkSync(dst);
    } else {
      this.err.puts(color('changed: ', 'yellow') + dst);
    }
    return true;
  }
};
var i;
for (i in _DirectivePrototype) _Copy.prototip[i] = _DirectivePrototype[i];
