#!/usr/bin/env node
;

var fap = {fap-doc-root};
require.paths.push(fap + '/lib');
require.paths.push({petrify-root}/lib');
require.paths.push({petrify-root}/deps');
require.paths.push({petrify-root}/deps/json-template/lib');
require.paths.push({petrify-root}/deps/markdown-js/lib');


require('fap-doc/petrify-hacks').hackPetrify(function(h) {
  h.processCodeBlocks();
  h.includeStrangeDataFiles(['../../README.md']);
  h.setMetadata('../../README.md', {
    'directory-index'   : 1,
    'page-title'        : "{project-label}",
    'page-title-short'  : "fuckparse",
    'code-blocks'       : '{"0":"js", "*":"none"}'
  });
});

require('buildrunner').run({
  data_dir:     __dirname + '/data',
  view_dir:     __dirname + '/view',
  template_dir: __dirname + '/template',
  output_dir:   __dirname + '/www',
  media_dirs:  [__dirname + '/media']
});
