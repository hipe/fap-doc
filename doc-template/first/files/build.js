#!/usr/bin/env node
;

var fap = {fap-doc-root};
require.paths.push(fap + '/lib');
require.paths.push({petrify-root}/lib');
require.paths.push({petrify-root}/deps');
require.paths.push({petrify-root}/deps/json-template/lib');
require.paths.push({petrify-root}/deps/markdown-js/lib');

require('fap-doc/petrify-hacks').hackPetrify(function(h) {
  h.processSidebars();
  h.processCodeBlocks({
    theme : 'shCoreFadeToGrey.css',
    gutter : false
  });
  h.includeStrangeDataFiles(['../../README.md']);
  h.setMetadata('../../README.md', {
    'directory-index'   : 1,
    'page-title-short'  : "{project-label}",
    'code-blocks'       : '[none,js]'
  });
});

require('buildrunner').run({
  data_dir:     __dirname + '/data',
  view_dir:     __dirname + '/view',
  template_dir: __dirname + '/template',
  output_dir:   __dirname + '/www',
  media_dirs:  [__dirname + '/media']
});
