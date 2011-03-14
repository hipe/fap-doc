var events = require ('events'),
        fs = require('fs'),
       sys = require('sys'),
      Path = require('path');

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

exports.hackPetrify = function(f) {
  h = new BuildrunnerHacks();
  if (f) f(h);
  return h; // allow either style
};

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

/**
 * Adapted from petrify withFiles()
 * For each flat relative ("local") filepath in _list_, that must
 * refer to a file (not folder) that exists in folder _dirname_, apply
 * the function _fn_ to it in the same manner that petrify does.
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

var insertAfter = function(arr, after, element) {
  for (var i = 0; i < arr.length; i ++) {
    if (arr[i] == after) {
      i ++;
      break;
    }
  }
  arr.splice(i, 0, element);
  return i;
};

/**
 * this is the god-object of all the hacks.
 * it acts as a 'high level' api face for the hacks, to be used in
 * build.js
 */

var BuildrunnerHacks = function() {
  // a bunch of gross just to get handle on the event emitter thing
  // by the way how in the hell does that even work!? (the handlers after the
  // run @todo ask caolan!)
  var br = require('buildrunner');
  if (!br.__hacked) {
    br.__hacked = true;
    var r = br.run, hax = this;
    br.run = function(options){
      var runner = r.call(br, options);
      hax.__runner = runner;
      return runner;
    };
  }
};

BuildrunnerHacks.prototype = {
  toString : function() { return 'BuildrunnerHacks'; },
  includeStrangeDataFiles : function(relpaths) {
    if (!this.__loadDataHacked) this._hackLoadData();
    if (this.__strangeDataFiles) throw new Error("only settable once for now.");
    this.__strangeDataFiles = relpaths;
    return this;
  },
  setMetadata : function(path, data) {
    if (!this._dataFilesHacked) this._hackLoadData();
    if (!this.__metadata) {
      this.__metadata = {};
      var hax = this;
      insertAfter(this.__processors.pre, this.__wmd.preprocessors.metadata,
        function(doc) { return hax._addFakeMetadata(doc); });
    }
    if (this.__metadata[path]) throw new Error("@todo: implement merging");
    this.__metadata[path] = data;
    return this;
  },
  _addFakeMetadata : function(doc) {
    if (this.__metadata[this.__currentFilename]) {
      var i;
      for (i in this.__metadata[this.__currentFilename])
        doc.metadata[i] = this.__metadata[this.__currentFilename][i];
    }
    return doc;
  },
  processCodeBlocks : function() {
    if (this.__hackedCodeBlocks) return;
    this.__hackedCodeBlocks = true;
    if (!this.__hackedReadFile) this._hackReadFile();
    this._doCodeBlocks = require('./code-block-preprocessor').process;
    var hax = this;
    this.__processors.pre.push(function(d) { return hax._doCodeBlocks(d); });
  },
  _color : Color.methods.color,
  _silly : function(msg) { return this._color(msg, 'bright', 'purple'); },
  _error : function(msg, filename) {
    this.__runner.data.emit('error',
      this._silly('petrify hack error: ')+msg, filename);
    return false;
  },
  _petrify : function() {
    return require('petrify'); // meh
  },

  /**
   * Overwrite petrify.readFile() so that it reveals more API hooks.
   * The steps in readFile are broken up into overrideable methods.
   * The processors it runs are now determined by member variables in the hax
   * object, rather than the hardcoded ones in petrify.
   *
   * We totally blow away the original version of readFile() without holding
   * onto a handle of it and calling it anywhere.  At the time of this writing,
   * the intial state of things is such that this does the same thing, but it is
   * of course not future-proof @depends:petrify-version.
   *
   * Sadly this new version of pertrify.readFile() is bound to **this instance**
   * of the build runner hacks :(
   *
   * We create a pre- and post-processor chain thare is the exact same as
   * in petrify attotw but declarative rather than imperative, so they are
   * dynaically modifiable.
   *
   */

  _hackReadFile : function() {
    if (this.__hackedReadFile) return;
    this.__hackedReadFile = true;
    this.__wmd = require('wmd');
    var hax = this, petrify = this._petrify();

    petrify.readFile = function(a,b){ return hax._readFile(a,b); };

    this.__processors = {
      pre :  [
        this.__wmd.preprocessors.metadata,
        this.__wmd.preprocessors.underscores
      ],
      post : [
        this.__wmd.postprocessors.heading,
        this.__wmd.postprocessors.first_paragraph,
        this.__wmd.postprocessors.html_no_heading
      ]
    };
  },

  // new implementation of petrify.readFile that is more hookable
  //
  _readFile : function(filename, dataString) {
    var result = this._processFile(dataString, filename);
    this._postPostProcessFile(result, filename);
    return result;
  },

  // only called if readFile() is hacked
  //
  _processFile : function(data, filename) {
    this.__currentFilename = filename; // ick
    return this.__wmd(data, {
      preprocessors :  this.__processors.pre,
      postprocessors : this.__processors.post
    });
  },

  // only called if readFile() is hacked, this is the same as petrify's version
  //
  _postPostProcessFile : function(result, filename){
    result.filename = Path.basename(filename);
  }
};


/**
 * Probably not worth it, but: allow user to add data files that exist outside
 * of the data/ folder and try to make it look like the was inside the data/
 * folder.  (But why in god's name go through all this hacking just for that!??
 * Just so that we can have a README.md that lives in the root of the project
 * where github likes it but *also* include it in the generated docs.
 * riduculous.  easier just to use a symlink!! but w/e the damage is done.)
 *
 */
BuildrunnerHacks.prototype._hackLoadData = function() {
  var hax = this;
  if (hax.__loadDataHacked) return null;
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
    var hax = this;
    withFileList(dirname, (this.__strangeDataFiles || []),
      function(filename, fileData, completed, total){
        datas.push(petrify.readFile(filename, fileData));
        emitter.emit('load', hax._silly(filename), completed, total);
      },
      function (err) {
        if (err)   emitter.emit('error', err);
        else       emitter.emit('loaded', datas);
      }
    );
  };


  // Alter readData to preserve the crazy path when setting filename.

  if (!hax.__hackedReadFile) hax._hackReadFile();
  hax._postPostProcessFile = function(result, filename) {
    result.filename = filename; // petrify version does basename() of it
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

  hax.__loadDataHacked = true;
  return true;
};
