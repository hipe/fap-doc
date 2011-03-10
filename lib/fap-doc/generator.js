var fstasks = require('./filesystem-tasks'),
       path = require('path');

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
      uow.copy('{doc-template-dir}', '{users-lib-root}');
    });
    if (this.req['dry-run']) uw.setDryRunOn();
    uw.setData('doc-template-dir',
      path.normalize(__dirname + '/../../doc-template/' + this._useTheme())
    );
    uw.setData('users-lib-root', this.req['out-dir']);
    return uw.run(this.out, this.req);
  },
  _useTheme : function() { return 'first';  }
};
