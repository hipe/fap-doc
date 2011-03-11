#!/usr/bin/env node
;
var path = require('path');
require.paths.push(__dirname);
var projRoot = path.normalize(__dirname + '/..');
var petrifyRoot = projRoot + '{local-petrify-root}';

require.paths.push(petrifyRoot + '/lib');
require.paths.push(petrifyRoot + '/deps');
require.paths.push(petrifyRoot + '/deps/json-template/lib');
require.paths.push(petrifyRoot + '/deps/markdown-js/lib');

var buildrunner = require('buildrunner');
var petrify = require('petrify');

// start petrify hacks
var fapDocRoot = __dirname + '{local-fap-doc-root}';
require(fapDocRoot + '/lib/fap-doc/petrify-hacks').
  enableHacks(petrify, buildrunner);
buildrunner.hackIncludeStrangeDataFiles(['../../README.md']);
buildrunner.hackSetMetadata('../../README.md', {
  directoryIndex : 1,
  pageTitle : '{your-project-slug}'
});
// end petrify hacks

buildrunner.run({
    data_dir:     __dirname + '/data',
    view_dir:     __dirname + '/view',
    template_dir: __dirname + '/template',
    output_dir:   __dirname + '/www',
    media_dirs:  [__dirname + '/media']
});
