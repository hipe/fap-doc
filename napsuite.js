/**
 * This is a standin for a testing f/w that 'feels' right. till we
 * find one, this.
 */

var NapSuite = function(name) {
  this.suiteName = name;
};

NapSuite.prototype = {
  run : function() {
    var i;
    for (i in this) {
      if (!i.match(/^test\b/)) continue;
      this[i].apply(this);
    }
  }
};

exports.suite = function(name) {
  return new NapSuite(name);
};
