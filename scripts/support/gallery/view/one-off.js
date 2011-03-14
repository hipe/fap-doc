exports.run = function(view, context){
  var p = require('../../paths');
    // cheap way to throw around global vars! :(
  var html = context.templates['index.jsont'].expand({
    localStyleFiles : p.localStyleFiles
  });
  view.emit('index.html', html);
  view.done();
};
