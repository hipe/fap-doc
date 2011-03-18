var fs = require('fs'),
  path = require('path');

exports.run = function(view, context) {

  // parse meta data - this updates the context.data in-place, so
  // other views can make use of these changes
  var maxIndex = -1;
  var datas = context.data;
  datas.forEach(function(x){
    // tags and date processing omitted (keep this line for now)

    // remove leading '../' per haxies
    var rootie = x.filename.replace(/^(\.\.\/)+/,'').replace(/\.md$/, '');
    x.url = rootie + '.html';

    if (undefined == x.metadata['directory-index']) {
      x.directoryIndex = (++ maxIndex);
    } else {
      x.directoryIndex = x.metadata['directory-index'];
      if (x.directoryIndex > maxIndex) {
        maxIndex = x.directoryIndex;
      }
    }

    x.pageTitle = x.metadata['page-title'] || x.metadata.heading ||
      path.basename(rootie).replace(/[-_]/g, ' ');

    if (!x.heading) x.heading = x.metadata.heading || x.pageTitle;

    x.pageTitleShort = x.metadata['page-title-short'] || x.pageTitle;
  });

  datas.sort(function(a, b) {
    return a.directoryIndex - b.directoryIndex;
  });

  if (datas.length) {
    datas[0].isFirst = true;
    datas[datas.length-1].isLast = true;
  }

  view.done();
};
