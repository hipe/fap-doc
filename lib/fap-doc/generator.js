var fstasks = require('./filesystem-tasks'),
       path = require('path'),
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
    var uw = fstasks.unitOfWork(function(uow) {
      uow.copy('{doc-template-dir}/README.md', '{one-level-up}/README.md');
      uow.copy('{doc-template-dir}/files',     '{users-lib-root}');
    });
    if (this.req['dry-run']) uw.setDryRunOn();
    var themePath = path.normalize(__dirname + '/../../doc-template') +
      '/' + this._useTheme();
    uw.setData('doc-template-dir', themePath);
    uw.setData('users-lib-root', this.req['out-dir']);
    uw.setData('one-level-up', path.dirname(this.req['out-dir']));
    if (!uw.run(this.out, this.req)) return false;
    if (this.req.prune) return true;
    return this._andThen();
  },
  _andThen : function() {
    this.out.puts('now try ' +
      color(this.req['out-dir'] + '/build.js', 'green') + '!');
    return true;
  },
  _useTheme : function() { return 'first';  }
};
