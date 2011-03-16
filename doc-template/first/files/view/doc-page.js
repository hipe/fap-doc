
exports.requires = ['initial'];

exports.run = function(view, context){

  // for each doc-page emit the doc-page template
  context.data.forEach(function(page, idx){
    var url = page.url;
    context.data.forEach(function(page2){
      page2.selected = (url == page2.url);
    });

    context.partials.navigation =
      context.templates['nav.jsont'].expand({
        sortedDocPages : context.data,
        pageIndex : idx
    });

    var html = context.templates['doc-page.jsont'].expand({
      stylesheets : exports.stylesheets ? exports.stylesheets(page,view) : null,
      docPage: page,
      partials: context.partials
    });
    view.emit(page.url, html);
  });

  view.done();

};
