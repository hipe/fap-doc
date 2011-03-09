exports.generate = function(ctx) {
  var gen = new Generator(ctx.request.values, ctx.err);
  return gen.run();
};

var Generator = exports.Generator = function(req, out) {
  this.req = req;
  this.out = out;
};

Generator.prototype = {
  run : function() {
    this.out.puts("haha running and writing files to "+
      this.req['out-dir']+' no jk lol');
    return 'haha lolz';
  }
};