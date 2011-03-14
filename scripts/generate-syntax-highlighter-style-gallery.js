#!/usr/bin/env node
;

var op = require(__dirname+'/../vendor/fuckparse/lib/fuckparse');

var cmd = op.build(function(cmd){
  cmd.on('go', function(c2) {
    c2.desc('generate the html files.');
    c2.on('-n', '--dry-run', 'dry run');
    c2.arg('<output-directory>', 'where to put the html files');
    c2.execute(function(opts, outputDir) {
      (new ExamplesGenerator(this, opts, outputDir)).run();
    });
  });
});

var path = require('path');

var ExamplesGenerator = function(app, opts, outputDir) {
  this.__app = app;
  this.__opts = opts;
  this.__outputDir = outputDir;
  this.__shPath = path.dirname(__dirname)+'/vendor/syntaxhighlighter_tip';
};

ExamplesGenerator.prototype = {
  run : function() {
    var fs = require('fs');
    if (!path.existsSync(this.__shPath)) return this._error("syntax "+
      "highlighter path not found. Do you need to install it? path: " +
      this.__shPath);
    this.__stylesPath = this.__shPath + '/styles';
    this.__localStyleFiles = fs.readdirSync(this.__stylesPath);
    return this._usePetrifyToGenerate();
  },
  _error : function(msg) {
    this.__app.err.puts("ExamplesGenerator error: "+msg);
    return false;
  },
  _usePetrifyToGenerate : function() {
    var p = require('./support/paths');
    if (!path.existsSync(p.petrify)) return this._error("path not found: "+
      "where is petrify? not at: "+p.petrify);
    require.paths.push(p.petrify + '/lib');
    require.paths.push(p.petrify + '/deps');
    require.paths.push(p.petrify + '/deps/json-template/lib');
    require.paths.push(p.petrify + '/deps/markdown-js/lib');

    // hackish way to pass params into the view
    p.localStyleFiles = this.__localStyleFiles;

    var buildrunner = require('buildrunner');
    var doc = __dirname + '/support/gallery';
    buildrunner.run({
      data_dir:     doc + '/data',
      view_dir:     doc + '/view',
      template_dir: doc + '/template',
      output_dir:   this.__outputDir,
      media_dirs: [this.__stylesPath]
    });
    this.__app.out.puts("running generator using petrify..");
    return true;
  },
};

cmd.run(process.argv);
