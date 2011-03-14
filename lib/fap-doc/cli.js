exports.command = require('../../vendor/fuckparse/lib/fuckparse').build(function(o){
  o.on('generate-doc-hacks', "Generate some simple example docfiles",
                              "and a petrify buildscript", function(p){
    p.on('-n', '--dry-run', "Don't actually write the files.");
    p.on('-P', '--prune', "Rather than copy files, remove files that are",
                          "identical to generated files (a safer rm -rf).");
    p.arg('[out-dir]', 'where to put them (default: "{default}")',
      {'default':'./doc'}
    );
    p.execute(function(){
      return require('./generator').generate(this);
    });
  });
});
