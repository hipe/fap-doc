var path = require('path');

var e = exports;
var o = path.normalize(__dirname + '/../..');    // root of this package
var O = path.normalize(__dirname + '/../../..'); // parent folder of package

exports.lib               = __dirname;
exports.fapUnit           = O + '/fap-unit/lib/fap-unit';
exports.optparse          = O + '/fuckparse/lib/fuckparse';
exports.petrify           = o + '/vendor/petrify';
exports.syntaxhighlighter = o + '/vendor/syntaxhighlighter_tip';
exports.jsdom             = e.petrify + '/deps/wmd/deps/jsdom/lib/jsdom';
exports.htmlparser        = e.petrify + '/deps/wmd/deps/node-htmlparser/lib/node-htmlparser';
