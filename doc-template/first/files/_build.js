#!/usr/bin/env node
;

(function(){
  require.paths.push(__dirname);

  var libs = require('./libs');
  libs.assertOkOrThrowException();

  var br = require('buildrunner');

  libs.petrifyHacks.hackPetrify(libs, br, function(h) {
    h.processCodeBlocks();
    h.includeStrangeDataFiles(['../../README.md']);
    h.setMetadata('../../README.md', {
      'directory-index'   : 1,
      'page-title'        : "Introducing optparse",
      'page-title-short'  : "optparse",
      'code-blocks'       : '{"0":"js", "*":"none"}'
    });
  });

  br.run({
    data_dir:     __dirname + '/data',
    view_dir:     __dirname + '/view',
    template_dir: __dirname + '/template',
    output_dir:   __dirname + '/www',
    media_dirs:  [__dirname + '/media']
  });
})();
