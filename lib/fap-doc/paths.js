var path = require('path');

exports.root = path.normalize(__dirname + '/../..');

exports.petrify           = exports.root + '/vendor/petrify';
exports.syntaxhighlighter = exports.root + '/vendor/syntaxhighlighter_tip';
exports.fapUnit           = path.normalize(exports.root + '/../fap-unit');
