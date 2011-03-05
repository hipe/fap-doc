var fs = require('fs'),
  path = require('path');


var datadir = path.normalize(__dirname + '/../data/');
  // @todo would be better not hardcoded etc.


exports.run = function(view, context) {

  // parse meta data - this updates the context.data in-place, so
  // other views can make use of these changes
  context.data = context.data.map(function(x){
    if (x.metadata.tags) {
      x.tags = x.metadata.tags.split(', ');
    }
    if (x.metadata.date) {
      x.dateObj = new Date(x.metadata.date);
    } else {
      var stat = fs.statSync(datadir + x.filename);
      if (stat && stat.ctime)
        x.dateObj = new Date(stat.ctime);
      else
        x.dateObj = new Date(); // haha we insist
    }
    x.url = x.filename.replace(/\.md$/, '.html');
      // @todo fixme this becomes '../../README.html'
    return x;
  });

  view.done();
};
