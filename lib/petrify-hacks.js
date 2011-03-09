var events = require ('events'),
        fs = require('fs'),
      path = require('path'),
       sys = require('sys');


exports.enableHacks = function(petrify, buildrunner) {
  if (!petrify._hacks)
    petrify._hacks = new exports.PetrifyHacks(petrify);
  if (!buildrunner._isHacked) {
    buildrunner._petrify = petrify;
    for (i in exports.BuildrunnerHacks) {
      buildrunner[i] = exports.BuildrunnerHacks[i];
    }
    buildrunner._isHacked = true;
  }
};

/**
 * adapted from petrify withFiles()
 */
exports.withFileList = function(dirname, list, fn, callback) {
  if (!list.length) return callback(null);
  var waiting = list.length;
  list.forEach(function(filename) {
    fs.readFile(path.join(dirname, filename), function(err, data) {
      if (err) {
        callback(err);
        callback = function(){};
      } else {
        var total = list.length;
        var completed = total - waiting.length;
        fn(filename, data.toString(), completed, total);
      }
      if (! --waiting) { callback(null); }
    });
  });
  return null;
};

exports.Color = {
  codes : {'bold':1,'blink':5,'dark_red':31,'green':32,'yellow':33,
    'blue':34,'purple':35,'cyan':36,'white':37,'red':38
  },
  esc : String.fromCharCode(0x1B), // in ruby/php we could do "\e"
  methods : {
    color : function(str) {
      var these = [], c;
      for (var i = 1; i < arguments.length; i++) {
        (c = exports.Color.codes[arguments[i]]) && these.push(c.toString());
      }
      return exports.Color.esc +
        '[' + these.join(';') + 'm' + str + exports.Color.esc + '[0m';
    }
  }
};

exports.BuildrunnerHacks = {
  hackIncludeStrangeDataFiles : function(paths) {
    if (!this._dataFilesHacked) this._hackDataFiles();
    this._petrify._hacks._strangeDataFiles = paths;
  },
  hackSetMetadata : function(path, data) {
    if (!this._dataFilesHacked) this._hackDataFiles();
    this._petrify._hacks.setMetadata(path, data);
  },
  _hackDataFiles : function() {
    if (this._dataFilesHacked) return;
    exports._loadDataFilesHack(this._petrify, this._petrify._hacks);
    this._dataFilesHacked = true;
  }
};


exports.PetrifyHacks = function(petrify) {
  this.petrify = petrify;
  this.metadata = {};
};
exports.PetrifyHacks.prototype = {
  color : exports.Color.methods.color,
  // @todo this might become an event driven thing ick.
  notice : function(msg) {
    sys.log(this.color('petrify hack: ', 'bright', 'purple') + msg);
  },
  setMetadata : function(path, md) {
    this.metadata[path] = md;
  }
};

/**
 * ************ begin experimental hack **************************
 *
 * Probably not worth it, but: add data files that exist outside of the
 * data/ folder and try to make it look like the was inside the data/ folder
 * (but why!!??  just so we can have a README.md that lives in the root
 * of the project but still included in the docs generation.  stupid.
 * a symlink would have been easier.)
 *
 */

exports._loadDataFilesHack = function(petrify, hacks) {


  // Overide the original loadData, call it and change
  // what emitter you return:  Propagate 'load' and 'error'
  // events, but on 'loaded' event, also add crazy extra data files.

  var origLoadData = petrify.loadData;
  petrify.loadData = function(dirname) {
    var emitter = origLoadData(dirname);
    var myEmit = new events.EventEmitter();
    emitter.addListener('load', function(fn, completed, total) {
      myEmit.emit('load', fn, completed, total);
    });
    emitter.addListener('error', function(e) {
      myEmit.emit('error', e);
    });
    emitter.addListener('loaded', function(datas) {
      hacks.addCrazyExtraDataFiles(dirname, myEmit, datas);
    });
    return myEmit;
  };


  // The hacked version of loadData calls this.
  // Almost identical to the original petrify.loadData,
  // but with a static list of files.

  exports.PetrifyHacks.prototype.addCrazyExtraDataFiles =
                                    function(dirname, emitter, datas) {
    var petr = this.petrify;
    exports.withFileList(dirname, (this._strangeDataFiles || []),
      function(filename, fileData, completed, total){
        datas.push(petr.readFile(filename, fileData));
        emitter.emit('load', filename, completed, total);
      },
      function (err) {
        if (err)   emitter.emit('error', err);
        else       emitter.emit('loaded', datas);
      }
    );
  };

  // Preserve the crazy path when setting filename of the data.
  // Add any metadata hack-added in the build file.
  var origReadFile = petrify.readFile;
  petrify.readFile = function(filename, data) {
    var result = origReadFile(filename, data), i;
    result.filename = filename; // overwrite the basename() version of it
    if (hacks.metadata[filename]) {
      for (i in hacks.metadata[filename]) {
        result.metadata[i] = hacks.metadata[filename][i];
      }
    }
    return result;
  };


  // when you actually write the output file, remove leading ../
  var origEmit = petrify.emit;
  petrify.emit = function(output_dir, urlpath, data, callback) {
    if ('..' == urlpath.substr(0,2)) {
      var use = urlpath.replace(/^(\.\.\/)+/, '');
      hacks.notice("will truncate path from "+urlpath+" to "+use);
      urlpath = use;
    }
    origEmit(output_dir, urlpath, data, callback);
  };
};


// ************** end experimental hack ****************************

