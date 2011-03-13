var events = require ('events'),
        fs = require('fs'),
      Path = require('path'),
       sys = require('sys'),
      phax = exports;

/**
 * a lot a lot a lot of this could be exported to make this more of an api.
 *
 * but for now the exports are kept minimal during development to reduce
 * the appearance of tight coupling.  Because after all, this is one huge hack.
 *
 * Naming Convention:
 *   we subsitute once kind of eyehurt for another:
 *   __privateDataMember _privateOrProtectedMethod publicMethodsOrDataMember
 *
 */

exports.hackPetrify = function(libs, f) {
  h = new BuildrunnerHacks(libs);
  if (f) f(h);
  return h; // allow either style
};

/*
var Color = {
  codes : {'bold':1,'blink':5,'dark_red':31,'green':32,'yellow':33,
    'blue':34,'purple':35,'cyan':36,'white':37,'red':38
  },
  esc : String.fromCharCode(0x1B), // in ruby/php we could do "\e"
  methods : {
    color : function(str) {
      var c, cc = [];
      for (var i = 1; i < arguments.length; i++)
        (c = Color.codes[arguments[i]]) && cc.push(c.toString());
      return Color.esc + '[' + cc.join(';') + 'm' + str + Color.esc + '[0m';
    }
  }
};
*/

/**
 * adapted from petrify withFiles()
 */
var withFileList = function(dirname, list, fn, callback){
  if (!list.length) return callback(null);
  var waiting = list.length;
  list.forEach(function(filename) {
    fs.readFile(Path.join(dirname, filename), function(err, data) {
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



/**
 * it's called BuildrunnerHacks because it is 'tied' to the buildrunner
 * instance, however it does not actually interact with that particular object.
 */
var BuildrunnerHacks = function(libs) {
  libs.__buildrunnerHacks = this;
  this.__libs = libs;
};

BuildrunnerHacks.prototype = {
  toString : function() { return 'BuildrunnerHacks'; },
  includeStrangeDataFiles : function(relpaths) {
    if (!this.__dataFilesHacked) this._hackDataFiles();
    if (this.__strangeDataFiles) throw new Error("only settable once for now.");
    this.__strangeDataFiles = relpaths;
    return this;
  },
  setMetadata : function(path, data) {
    if (!this._dataFilesHacked) this._hackDataFiles();
    if (!this.__metadata) this.__metadata = {};
    if (this.__metadata[path]) throw new Error("@todo: implement merging");
    this.__metadata[path] = data;
    return this;
  },
  /*
  _color : Color.methods.color,
  _notice : function(msg) {
    // @todo this might become an event driven thing ick.
    sys.log(this._color('petrify hack: ', 'bright', 'purple') + msg);
  },
  */
  _wmd : function() {
    if (!this.__wmd)
      this.__wmd = require(this.__libs.petrifyRoot + '/deps/wmd');
    return this.__wmd;
  },
  _petrify : function() {
    return this.__libs.petrify;
  },
  /**
  * rewrite petrify's version of readFile() so that it reveals more api hooks.
  */
  _hackReadFile : function() {
    if (this.__readFileHacked) return null;

    var hax = this, petrify = this._petrify(), wmd = this._wmd();

    // careful! we totally blow away original version, so this
    // is not future proof at all  @depends:petrify-version
    // and we @bind it to **this instance** of the build hacks :(
    petrify.readFile = function(a,b){ return hax.readFile(a,b); };

    // re-implement the two components of readFile exactly as they were
    // in petrify but as hookey methods.
    this._preprocessAndPostprocessFile = function(data) {
      // copy-pasted from petrify
      return wmd(data, {
        preprocessors: [
          wmd.preprocessors.metadata,
          wmd.preprocessors.underscores
        ],
        postprocessors: [
          wmd.postprocessors.heading,
          wmd.postprocessors.first_paragraph,
          wmd.postprocessors.html_no_heading
        ]
      });
    };
    this._postPostProcessFile = function(result, filename){
      // copy pasted from petrify
      result.filename = Path.basename(filename);
    };
    return (this.__readFileHacked = true);
  },
  /**
   * at first this does exactly the same as petrify's original (attotw)
   */
  readFile : function(filename, data) {
    var result = this._preprocessAndPostprocessFile(data);
    this._postPostProcessFile(result, filename);
    return result;
  }
};

/**
 * start code-blocks hack
 */
BuildrunnerHacks.prototype.enableCodeBlocks = function() {
  // @todo
};
BuildrunnerHacks.prototype.processCodeBlocks = function(p) {
  if (!p.metadata['code-blocks']) return null;
  sys.puts("ohai skipping processCodeBlocks for now!");
  return null;
};
// end code-blocks hack


/**
 * Probably not worth it, but: allow user to add data files that exist outside
 * of the data/ folder and try to make it look like the was inside the data/
 * folder.  (But why in god's name go through all this hacking just for that!??
 * Just so that we can have a README.md that lives in the root of the project
 * where github likes it but *also* include it in the generated docs.
 * riduculous.  easier just to use a symlink!! but w/e the damage is done.)
 *
 */
BuildrunnerHacks.prototype._hackDataFiles = function() {
  var hax = this;
  if (hax.__dataFilesHacked) return null;
  var petrify = hax._petrify();


  // Overide the original loadData, call it and change
  // what emitter you return:  Propagate 'load' and 'error'
  // events, but on 'loaded' event, also add crazy extra data files.
  // Unfortunately this @binds the function to **this instance** of the hax
  // so this will be hellof broken if you try to run the same petrify for more
  // than one build for some strange reason.
  // Petrify is not written in a prototype-centric way so we can't etc.

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
      hax.addCrazyExtraDataFiles(dirname, myEmit, datas);
    });
    return myEmit;
  };


  // The hacked version of loadData calls this.
  // Almost identical to the original petrify.loadData,
  // but with a static list of files.

  BuildrunnerHacks.prototype.addCrazyExtraDataFiles =
                                    function(dirname, emitter, datas) {
    withFileList(dirname, (this.__strangeDataFiles || []),
      function(filename, fileData, completed, total){
        datas.push(petrify.readFile(filename, fileData));
        emitter.emit('load', filename, completed, total);
      },
      function (err) {
        if (err)   emitter.emit('error', err);
        else       emitter.emit('loaded', datas);
      }
    );
  };


  // Alter readData to preserve the crazy path when setting filename of
  // the data. Add any page metadata hack-added in the build file.

  if (!hax.__readFileHacked) hax._hackReadFile();
  hax._postPostProcessFile = function(result, filename) {
    result.filename = filename; // petrify version does basename() of it
    if (hax.__metadata[filename]) {
      var i;
      for (i in hax.__metadata[filename])
        result.metadata[i] = hax.__metadata[filename][i];
    }
  };

  /*
  ick tihs happens in view for now
  // when you actually write the output file, remove leading ../
  var origEmit = petrify.emit;
  petrify.emit = function(outputDir, urlpath, data, callback) {
    if ('..' == urlpath.substr(0,2)) {
      var use = urlpath.replace(/^(\.\.\/)+/, '');
      hacks._notice("will truncate path from "+urlpath+" to "+use);
      urlpath = use;
    }
    origEmit(outputDir, urlpath, data, callback);
  };
  */

  hax.__dataFilesHacked = true;
  return true;
};
