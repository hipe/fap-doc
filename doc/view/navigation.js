// return unique list of values from arr
var unique = function(arr) {
  return Object.keys(arr.reduce(function(a, x){a[x] = null; return a;}, {}));
};

exports.requires = ['initial'];

exports.run = function(view, context) {

  var partials = context.partials;

  partials.navigation = context.templates['nav.jsont'].expand({
    sortedDocPages : context.data
  });

  // note: this view did not emit anything, but generated some HTML and data
  // for including in other templates.
  view.done();

};
