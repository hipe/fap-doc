
exports.requires = ['navigation'];

exports.run = function(view, context){

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
