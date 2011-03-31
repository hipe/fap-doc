var path = require('path');

var o = path.normalize(__dirname + '/../..');    // root of this package
var O = path.normalize(__dirname + '/../../..'); // parent folder of package

exports.root = o;
exports.fapUnit           = O + '/fap-unit';
exports.optparse          = O + '/fuckparse/lib/fuckparse';
exports.petrify           = o + '/vendor/petrify';
exports.syntaxhighlighter = o + '/vendor/syntaxhighlighter_tip';
