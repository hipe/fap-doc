exports.command = require(require('./paths').optparse).build(function(o){
  o.on('generate-example', "Generate an example doc tree",
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
