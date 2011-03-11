var fsTasks = require('./filesystem-tasks'),
       Path = require('path'),
       color = require('../../vendor/fuckparse/fuckparse').Color.methods.color;

exports.generate = function(ctx) {
  var gen = new Generator(ctx.request.values, ctx.err);
  return gen.run();
};

var Generator = exports.Generator = function(req, out) {
  this.req = req;
  this.out = out;
};

Generator.prototype = {
  toString : function() { return 'Generator'; },
  run : function() {
    var uow = fsTasks.unitOfWork(function(u) {
      u.copy('{doc-template-dir}/README.md', '{out-dir}/../README.md');
      u.copy('{doc-template-dir}/files',     '{out-dir}');
    });
    this.__outDir = this.req['out-dir'];
    var dir = this._themeDir();
    this.req['dry-run'] && uow.setDryRunOn();
    uow.setManifest(require('./meta-parser').read(dir + '/meta.txt'));
    uow.setTemplateData('doc-template-dir', dir);
    uow.setTemplateData('out-dir', this.__outDir);
    uow.setTemplateData('your-project-slug', 'my-project');
    uow.setTemplateData('local-petrify-root', this._localPetRoot());
    uow.setTemplateData('local-fap-doc-root', this._localFapDocRoot());
    if (!uow.run(this.out, this.req)) return false;
    if (this.req.prune) return true;
    return this._andThen();
  },
  _themeDir : function() {
    return (
     Path.normalize(__dirname + '/../../doc-template') +'/' + this._useTheme());
  },
  _useTheme : function() { return 'first';  },
  _localPetRoot : function() {
    return '/vendor/petrify'; // @todo ?
  },
  _localFapDocRoot : function() {
    var docDirFull = Path.resolve(process.cwd(), this.__outDir),
        p, myRoot = Path.dirname(Path.dirname(__dirname));
    (p = fsTasks.relativePath(docDirFull, myRoot)) && (p.length) && (p = '/'+p);
    return p || 'path/to/fap-doc';
  },
  _andThen : function() {
    this.out.puts('now try ' +
      color(this.req['out-dir'] + '/build.js', 'green') + '!');
    return true;
  }
};
