var fsTasks = require('./filesystem-tasks'),
       Path = require('path'),
       color = require('../../vendor/fuckparse/lib/fuckparse').Color.methods.color;

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
    uow.setTemplateData('project-label', this._projectLabel());
    uow.setTemplateData('petrify-root', this._petRoot());
    uow.setTemplateData('fap-doc-root', this._fapDocRoot());
    if (!uow.run(this.out, this.req)) return false;
    if (this.req.prune) return true;
    return this._andThen();
  },
  _projectLabel : function() {
    return process.env.USER ? (process.env.USER +"'s Project"): 'Wizzle Wazzle';
  },
  _themeDir : function() {
    return (
     Path.normalize(__dirname + '/../../doc-template') +'/' + this._useTheme());
  },
  _useTheme : function() { return 'first';  },
  _petRoot : function() {
    return '/vendor/petrify'; // @todo ?
  },
  _fapDocRoot : function() {
    var docDirFull = Path.resolve(process.cwd(), this.__outDir),
        p, myRoot = Path.dirname(Path.dirname(__dirname));
    (p = fsTasks.relativePath(docDirFull, myRoot)) && (p.length) && (p = '/'+p);
    if (!p) return '"path/to/fap-doc"';
    return "require('path').normalize(__dirname +'"+p+"')";
  },
  _petRoot : function() {
    return "fap + '/vendor/petrify";
  },
  _andThen : function() {
    this.out.puts('now try ' +
      color(this.req['out-dir'] + '/build.js', 'green') + '!');
    return true;
  }
};
