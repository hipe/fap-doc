/**
 * Centralized location to load the disparate libraries.
 * Sets exports.[petrifyRoot, petrify, petrifyHacks]
 * Write errors to stdout on failure.
 * 
 * It would be nice to get this logic the hell out of doc/
 * but it's bootstrapping code so we cannot assume clean paths to anywhere.
 */

var sys               = require('sys'),
    Path              = require('path'),
    libs              = exports,
    _fapDocRoot       = Path.normalize(__dirname + "/../../fap-doc"),
    _petrifyRoot      = _fapDocRoot + "/vendor/petrify",
    _petrifyHacksPath = _fapDocRoot + "/lib/fap-doc/petrify-hacks",
    _assertPath = function(path, name) {
      if (Path.existsSync(path)) return true;
      sys.puts((name||"path") + " not found: "+path+"\n(from "+__filename+")");
      return false;
    },
    _ok = (function() {
      sys.puts("ONLY EVER READ THIS ONCE");      
      if (!(_assertPath(_fapDocRoot,  'fap-doc root') &&
            _assertPath(_petrifyRoot, 'petrify root') &&
            _assertPath(_petrifyHacksPath+'.js', 'petrify hacks path')))
              return false;
      libs.petrifyRoot = _petrifyRoot;
      require.paths.push(_petrifyRoot + '/lib');
      require.paths.push(_petrifyRoot + '/deps');
      require.paths.push(_petrifyRoot + '/deps/json-template/lib');
      require.paths.push(_petrifyRoot + '/deps/markdown-js/lib');
      // below requires above!
      libs.petrify = require(_petrifyRoot + '/lib/petrify');
      libs.petrifyHacks = require(_petrifyHacksPath);
      return true;
    })();

libs.assertOkOrThrowException = function() {
  if (!_ok) throw new Error("failed to load libraries");
};
