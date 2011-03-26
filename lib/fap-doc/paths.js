var path = require('path');

var o = path.normalize(__dirname + '/../..');
exports.root = o;
exports.optparse          = o + '/vendor/fuckparse';
exports.petrify           = o + '/vendor/petrify';
exports.syntaxhighlighter = o + '/vendor/syntaxhighlighter_tip';
exports.fapUnit           = path.normalize(o + '/../fap-unit');
