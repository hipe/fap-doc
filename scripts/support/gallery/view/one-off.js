exports.run = function(view, context){
  var p = require('../../paths'), ff = p.localStyleFiles;

    // cheap way to throw around global vars! :(

  var rows = new Array(Math.floor(ff.length / 2) + ff.length % 2);

  for (var i = 0; i < rows.length; i++) {
    var cols = [];
    for ( var j = 0; j < 2; j++ ) {
      var file = ff[i*2+j];
      var target = null;
      if (file) {
        var match = (/^(.*)\.css$/).exec(file);
        sample = 'samples/' + match[1] + '.html';
        var sampleHtml = context.templates['sample.jsont'].expand({
          cssFile : file,
          oc : '{',
          cc : '}'
        });
        view.emit(sample, sampleHtml);
      }
      cols.push({
        label : file,
        sample : sample,
        file : file
      });
    }
    rows[i] = { cols : cols };
  }

  var html = context.templates['index.jsont'].expand({
    rows : rows
  });

  view.emit('index.html', html);
  view.done();
};
