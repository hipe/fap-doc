#!/usr/bin/env node
;

require.paths.push(__dirname);
var petroot = require('path').normalize(__dirname + '/../vendor/petrify-hipe');
require.paths.push(petroot + '/lib');
require.paths.push(petroot + '/deps');
require.paths.push(petroot + '/deps/json-template/lib');
require.paths.push(petroot + '/deps/markdown-js/lib');

var buildrunner = require('buildrunner');
var petrify = require('petrify');

require(__dirname + '/../lib/petrify-hacks/petrify-hacks.js').
  enableHacks(petrify, buildrunner);

buildrunner.hackIncludeStrangeDataFiles(['../../README.md']);
buildrunner.hackSetMetadata('../../README.md', {
  directoryIndex : 1,
  pageTitle : 'fap-unit'
});

buildrunner.run({
    data_dir:     __dirname + '/data',
    view_dir:     __dirname + '/view',
    template_dir: __dirname + '/template',
    output_dir:   __dirname + '/www',
    media_dirs:  [__dirname + '/media']
});
