var fs = require('fs'),
  path = require('path');


var datadir = path.normalize(__dirname + '/../data/');
  // @todo would be better not hardcoded etc.


exports.run = function(view, context) {

  // parse meta data - this updates the context.data in-place, so
  // other views can make use of these changes
  var maxIndex = -1;
  context.data = context.data.map(function(x){
    // tags and date processing omitted (keep this line for now)

    // remove leading '../' per haxies
    var rootie = x.filename.replace(/^(\.\.\/)+/,'').replace(/\.md$/, '');
    x.url = rootie + '.html';

    if (undefined == x.metadata.directoryIndex) {
      x.directoryIndex = (++ maxIndex);
    } else {
      x.directoryIndex = x.metadata.directoryIndex;
      if (x.directoryIndex > maxIndex) {
        maxIndex = x.directoryIndex;
      }
    }

    x.pageTitle = x.metadata.pageTitle || x.metadata.heading ||
      path.basename(rootie).replace(/[-_]/g, ' ');

    return x;
  });

  context.data.sort(function(a, b) {
    return a.directoryIndex - b.directoryIndex;
  });

  view.done();
};
