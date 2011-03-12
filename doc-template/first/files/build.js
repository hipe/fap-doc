#!/usr/bin/env node
;
var Path = require('path'), sys = require('sys');

var dircheck = function(path, name) {
  name || (name = 'path');
  if (!Path.existsSync(path)) {
    sys.puts(name + " not found: "+path);
    sys.puts("(from "+__filename+")");
    return false;
  }
  return true;
};

(function(){

require.paths.push(__dirname);
var projRoot    = Path.normalize(__dirname + '/..');
var fapDocRoot  = {fap-doc-root};
var petrifyRoot = {petrify-root};

if (!dircheck(fapDocRoot, 'fap-doc root')) return;
if (!dircheck(petrifyRoot, 'petrify root')) return;

require.paths.push(petrifyRoot + '/lib');
require.paths.push(petrifyRoot + '/deps');
require.paths.push(petrifyRoot + '/deps/json-template/lib');
require.paths.push(petrifyRoot + '/deps/markdown-js/lib');

var buildrunner = require('buildrunner');
var petrify = require('petrify');

// start petrify hacks
require(fapDocRoot + '/lib/fap-doc/petrify-hacks').
  enableHacks(petrify, buildrunner);
buildrunner.hackIncludeStrangeDataFiles(['../../README.md']);
buildrunner.hackSetMetadata('../../README.md', {
  directoryIndex : 1,
  pageTitle : "{project-label}"
});
// end petrify hacks

buildrunner.run({
    data_dir:     __dirname + '/data',
    view_dir:     __dirname + '/view',
    template_dir: __dirname + '/template',
    output_dir:   __dirname + '/www',
    media_dirs:  [__dirname + '/media']
});


})();