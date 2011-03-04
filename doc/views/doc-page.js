var fs = require('fs'),
  path = require('path');

// @todo would be better not hardcoded etc.
var datadir = path.normalize(__dirname + '/../data/');

// wait until the navigation partial is complete
exports.requires = ['navigation'];


exports.run = function(view, context){

    // parse meta data - this updates the context.data in-place, so
    // other views can make use of these changes
    context.data = context.data.map(function(x){
        if (x.metadata.tags) {
          x.tags = x.metadata.tags.split(', ');
        }
        if (x.metadata.date) {
          x.date = new Date(x.metadata.date);
        } else {
          var stat = fs.statSync(datadir + x.filename);
          if (stat && stat.ctime) x.date = new Date(stat.ctime);
        }
        x.url = x.filename.replace(/\.md$/, '.html');
        return x;
    });

    // for each doc-page emit the doc-page template
    context.data.forEach(function(page){
        var html = context.templates['doc-page.jsont'].expand({
            docPage: page,
            partials: context.partials
        });
        view.emit(page.url, html);
    });

    view.done();
};
