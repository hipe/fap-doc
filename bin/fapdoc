#!/usr/bin/env node
;
var sys = require('sys');

var cmd = require('../vendor/fuckparse/fuckparse').build(function(o){
  o.on('generate-doc-hacks', "Generate some simple example docfiles",
                              "and a petrify buildscript", function(p){
    p.on('-n', '--dry-run', "Don't actually write the files.");
    p.on('-P', '--prune', "Rather than copy files, remove files that are",
                          "identical to generated files (a safer rm -rf).");
    p.arg('[out-dir]', 'where to put them (default: "{default}")',
      {'default':'./doc'}
    );
    p.execute(function(){
      return require('../lib/fap-doc/generator').generate(this);
    });
  });
});

if (__filename == process.argv[1]) {
  var resp = cmd.run(process.argv);
  sys.puts('(resp: '+resp+')');
}
