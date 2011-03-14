var Templite = require('../../vendor/fuckparse/lib/fuckparse/templite').Templite,
  en = require('../../vendor/fuckparse/lib/fuckparse'),
  color = en.Color.methods.color,
  fs = require('fs'),
  Path = require('path');

/**
 * Icky but addicting experimental naming convention:
 *    _ModulePrivatePrototype publicMethodOrProperty
 *    _privateOrProtectedMethod __privateOrProtectedMember
 *
 */

var extend = function(tgt) {
  for (var i = 1; i < arguments.length; i++) {
    var src = arguments[i], j;
    for (j in src) tgt[j] = src[j];
  }
  return tgt;
};

var isDir = exports.isDir = function(path) {
  if (!Path.existsSync(path)) return false;
  return fs.statSync(path).isDirectory();
};

var isFile = exports.isFile = function(path) {
  if (!Path.existsSync(path)) return false;
  return fs.statSync(path).isFile();
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

// this will be borked on windows, but so is node.js?
var relativePath = exports.relativePath = function(fullFrom, fullTo) {
  var fullA = Path.normalize(fullFrom), fullB = Path.normalize(fullTo);
  if ('/' != fullA.substr(0,1) || '/' != fullB.substr(0,1)) return null;
  var aA = fullA.split('/'), aB = fullB.split('/');
  aA.shift(); aB.shift(); // get rid of ''
  var aSame = [], len = Math.min(aA.length, aB.length);
  for (var i = 0; i<len && aA[i]==aB[i] && aSame.push(aA[i]); i++); // !
  if (0 == aSame.length) return null;
  var aTail = aA.slice(aSame.length), bTail = aB.slice(aSame.length);
  var rel = (new Array(aTail.length + 1).join('../')) + bTail.join('/');
  return '/'==rel.substr(rel.length-1) ? rel.substr(0, rel.length - 1) : rel;
};
// if this is run from the commandline, run these tests
if ('.' == module.id) { //if (process.argv && process.argv[1] == __filename) {
  var sys = require('sys'), numOk = 0; numFailed = 0;
  sys.puts('testing realtivePath() in '+__filename);
  var equal = function(a, b, msg) {
    if (a==b) { numOk +=1; sys.print('.'); }
    else { numFailed +=1; sys.puts("\nfailed: "+msg+' "'+a+'" "'+b+'"'); }
  };
  var t = function(f, t, s, m) { equal(s, relativePath(f, t), m); };
  t('a', '/b', null, 'null unless both are absoute paths.');
  t('/a', 'b', null, 'null unless both are absolute paths.');
  t('/a','/a', '',   'empty string when paths are same.');
  t('/a', '/b', null, 'null when paths have no parent in common.');
  t('/a', '/a/b', 'b', 'dest is inside source one level.');
  t('/a', '/a/b/c', 'b/c', 'dest is inside source two levels.');
  t('/a/b/c', '/a/b', '..', 'dest is outside source one level.');
  t('/a/b/c', '/a', '../..', 'dest is outside source two levels.');
  t('/a/b/c/x/y', '/a/b/c/p/q', '../../p/q', 'whoodily hah.');
  sys.puts("\n"+(numOk+numFailed)+' assertions, '+numFailed+' failures');
}

exports.unitOfWork = function(runFunc) {
  var uow = new UnitOfWork();
  if (runFunc) uow.defineRunFunc(runFunc);
  return uow;
};

var UnitOfWork = exports.UnitOfWork = function() {
  this.__dataSource = {};
  this.__settings = { isDryRun : false };
};

UnitOfWork.prototype = {
  toString : function(){ return 'UnitOfWork'; },
  setDryRunOn : function() { this.__settings.isDryRun = true; },
  setManifest : function(m) { this._manifest = m; },
  setTemplateData : function(a, b) { this.__dataSource[a] = b; return this; },
  defineRunFunc : function(f) {
    if (this.__sexp) throw new Error("can't define runFunc again!");
    this.__sexp = _RunDef.parse(f);
  },
  run : function(out, requestHash) {
    this.err = this.out = out;
    if (!this._checkVariableNames()) return false;
    for (var i = 0; i < this.__sexp.length; i++) {
      var sexp = this.__sexp[i];
      var b = sexp.run(this.__settings, this.__dataSource, requestHash,
        this.out, this);
      if (!b) return this.error("filesystem task: there were errors.");
    }
    this.err.puts("done.");
    return true;
  },
  _checkVariableNames : function() {
    var allNames = [], missing = [], i;
    for (i = 0; i < this.__sexp.length; i++ ) {
      this.__sexp[i].varNames(this.__dataSource, this._manifest, allNames);
    }
    for (i = 0; i < allNames.length; i++ ) {
      if (undefined == this.__dataSource[allNames[i]]) {
        missing.push(allNames[i]);
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


var _RunDef = exports._RunDef = function() {
  this.__sexp = [];
};
_RunDef.parse = function(f) {
  var me = new _RunDef();
  f(me);
  return me.__sexp;
};
_RunDef.prototype = {
  toString : function() { return '_RunDef'; },
  copy : function(src, dest) {
    this.__sexp.push(_CopyDirective.build(src, dest));
  }
};


/**
 * A Directive prototype exists for each directive that can be called
 * from the run definition of a unit of work ("task").  Experimentally
 * they are not ordinary objects but Array objects, (to look like sexp elements)
 * for now.
 */

var _Directive = {};
_Directive.proto = {
  _isDirective : true,
  initDirective : function() {
    this.__templatingParameterTemplates = {};
  },
  varNames : function(dataSource, manifest, allNames) {
    this.__ds = dataSource;
    this.__mani = manifest;
    var tt = [];
    this._templatesInParameters(tt);
    this._fileTemplates(tt);
    var nn = Templite.uniqueVariableNamesIn.apply(Templite, tt);
    for (var i = 0; i < nn.length; i++) {
      if (-1 == allNames.indexOf(nn[i])) allNames.push(nn[i]);
    }
  },
  _templatesInParameters : function(tt) {
    var t;
    for (var i = 0; i < this.__templateyVarNames.length; i ++) {
      t = this._parameterTemplate(this.__templateyVarNames[i]);
      if (t) tt.push(t);
    }
  },
  _parameterTemplate : function(name) {
    if (undefined == this.__templatingParameterTemplates[name]) {
      this.__templatingParameterTemplates[name] =
        Templite.buildIfLooksLikeTemplate(this[this.__offsets[name]]);
    }
    return this.__templatingParameterTemplates[name];
  },
  _parameterValue : function(n) {
    var t;
    if ((t=this._parameterTemplate(n))) return t.runStrict(this.__ds);
    return this[this.__offsets[n]];
  }
};


var _CopyDirective = {
  build : function(src, dest) {
    var sexp = extend(['copy', src, dest], _CopyDirective.proto);
    sexp.initCopyDirective();
    return sexp;
  }
};

_CopyDirective.proto = extend({}, _Directive.proto, {
  __errorIfExist : false, // old way, no setters yet
  __offsets : { src : 1, dest : 2 },
  __templateyVarNames : ['src', 'dest'],
  initCopyDirective : function() {
    this.initDirective();
    this.__fileTemplates = {};
  },
  run : function(settings, dataSource, req, out, onErr) {
    this.__dry = settings.isDryRun;
    this.__ds = dataSource;
    this.__prune = req.prune;
    this.__err = out;
    this.__on = onErr;
    this.__fakeFs = {};
    var localFiles = this._localFiles();
    if (!localFiles) return this.__on.error('source file or folder '+
      'not found: "' + this._parameterValue('src') + '"');
    var dst = Path.normalize(this._parameterValue('dest'));
    var useDir = this.__destIsPath ? Path.dirname(dst) : dst; // meh prolly no
    if (!this._dstDirCheck(useDir)) return false;
    this.__dst = dst;
    for (i = 0; i < localFiles.length; i++) {
      if (!this._copyFile(localFiles[i])) return false;
    }
    return true;
  },
  _fileTemplates : function(tt) {
    var localFiles = this._localFiles(), t;
    if (!localFiles) return; // let run() handle it
    for (var i = 0; i < localFiles.length; i++) {
      if (( t = this._fileTemplate(localFiles[i]) )) tt.push(t);
    }
  },
  _fileTemplate : function(n) {
    return (undefined == this.__fileTemplates[n]) ? (
      this.__fileTemplates[n] =
        ('templite' == this.__mani.fileMeta(n).format) ?
          Templite.build(fs.readFileSync(this.__sourceDir+'/'+n).toString()) :
          null
    ) : this.__fileTemplates[n];
  },
  _localFiles : function() {
    return this._localFilesInSourceDir() || this._singleFileAsLocalFiles();
  },
  _localFilesInSourceDir : function() {
    var src = this._parameterValue('src');
    if (!src || !isDir(src)) return null; // handled elsewhere
    this.__sourceDir = src;
    this.__destIsPath = ! (this.__destIsDir = true);
    var localFiles = flatten(src);
    return localFiles;
  },
  _singleFileAsLocalFiles : function() {
    var src = this._parameterValue('src'), err, relPath;
    if (!src || !isFile(src)) return null; // handled elsewhere
    this.__mani.safeRelativePathTo(src, function(_err, _relPath) {
      if (_err) err = _err; else relPath = _relPath;
    });
    if (err) { throw new Error(err); }
    this.__sourceDir = this.__mani.filesDir();
    this._destIsDir = ! (this.__destIsPath = true);
    return [relPath];
  },
  _dstDirCheck : function(dir) {
    var must = Path.dirname(dir);
    if (!isDir(must)) return this.__on.error('containing directory of output '+
      ' directory must exist: "' + must +'" of "' + dir + '"');
    return true;
  },
  _copyFile : function(srcLocal) {
    var dstFull = this.__destIsPath ? this.__dst : (this.__dst+'/'+srcLocal);
    if (this.__prune) return this._prune(srcLocal, dstFull);
    if (Path.existsSync(dstFull)) return this._handleExists(srcLocal, dstFull);
    if (!this._destDir(Path.dirname(dstFull))) return false;
    return this._cp(srcLocal, dstFull);
  },
  _prune : function(srcLocal, dstFull) {
    if (!Path.existsSync(dstFull)) {
      this.__err.puts('does not exist, cannot prune: '+dstFull);
      return true;
    }
    var left = this._sourceContentExpanded(srcLocal);
    var rite = fs.readFileSync(dstFull).toString();
    if (left == rite) {
      this.__err.puts(color('rm ','green') + dstFull);
      if (false == this.__dry) fs.unlinkSync(dstFull);
    } else {
      this.__err.puts(color('modified: ', 'yellow') + dstFull);
    }
    return true;
  },
  _sourceContentExpanded : function(srcLocal) {
    var t, content, srcFull;
    if (( t = this._fileTemplate(srcLocal) )) {
      content = t.run(this.__ds);
    } else {
      srcFull = this.__sourceDir + '/' + srcLocal;
      content = fs.readFileSync(srcFull).toString();
    }
    return content;
  },
  _destDir : function(dir) {
    if (!this.__fakeFs[dir] && !(this.__fakeFs[dir] = isDir(dir))){
      if (!this._mkdir_p(dir)) return false;
    }
    return true;
  },
  _mkdir_p : function(dir) {
    var parent = Path.dirname(dir);
    if (!this.__fakeFs[parent] && !isDir(parent)) {
      if (!this._mkdir_p(parent)) return false;
    }
    this.__fakeFs[dir] = true;
    this.__err.puts(color('mkdir ', 'green') + dir);
    if (false == this.__dry) fs.mkdirSync(dir, 0755);
    return true;
  },
  _cp : function(srcLocal, dstFull) {
    var srcFull = this.__sourceDir + '/' + srcLocal;
    this.__err.puts(color('cp ','green') + srcFull + ' ' + dstFull);
    var srcStat = fs.statSync(srcFull);
    var srcContents = this._sourceContentExpanded(srcLocal);
    if (false == this.__dry) fs.writeFileSync(dstFull, srcContents);
    if (0100644 != srcStat.mode) { // @todo assumes umask
      this.__err.puts(color('chmod ','green') +
        srcStat.mode.toString(8) + ' ' + dstFull);
      if (false == this.__dry) fs.chmodSync(dstFull, srcStat.mode);
    }
    return true;
  },
  _handleExists : function(srcLocal, dstFull) {
    if (this.__errorIfExist)
      return this.__on.error('exists, won\'t overwrite: ' + dstFull);
    var left = this._sourceContentExpanded(srcLocal);
    var rite = fs.readFileSync(dstFull).toString();
    if (left == rite) {
      this.__err.puts(color('no change: ', 'green') + dstFull);
      return true;
    } else {
      this.__err.puts(color('modified: ', 'yellow') + dstFull);
      return true;
    }
  }
});
