#!/usr/bin/env node
;

require.paths.push(__dirname);
var petroot = __dirname + '/../vendor/petrify-hipe';
require.paths.push(petroot + '/lib');
require.paths.push(petroot + '/deps');
require.paths.push(petroot + '/deps/json-template/lib');
require.paths.push(petroot + '/deps/markdown-js/lib');

var buildrunner = require('buildrunner');

buildrunner.run({
    data_dir:     __dirname + '/data',
    view_dir:     __dirname + '/views',
    template_dir: __dirname + '/templates',
    output_dir:   __dirname + '/www',
    media_dirs:  [__dirname + '/media']
});
