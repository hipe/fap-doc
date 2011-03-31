var lib = require('./../code-block-preprocessor');

exports.build = function(a, b, c, d, e) {
  return (new CssStyledCodeBlock(a, b, c, d, e)); //  meh
};


/**
 * this code block just wraps daring fireball output in a div
 * with some classes of your choosing
 */

var CssStyledCodeBlock = function(a,b,c,d, cssClassesStr) {
  this._codeBlockInit(a,b,c,d);
  this.__cssClassesStr = cssClassesStr;
  this.__meta = this._buildMeta();
};

CssStyledCodeBlock.prototype = extend({}, lib._CodeBlock.proto, {
  toString : function() { return 'CssStyledCodeBlock'; },
  render : function() {
    // get whatever daring fireball returns and wrap it in your own div
    var wmd = require('wmd'), me = this;
    var doc = wmd('    '+this.__lines.join('\n    '), {// re-add the four spaces
      preprocessors: [ wmd.preprocessors.underscores ],
      postprocessors: [ function(doc) {
        // we could use jsDom but that's a bit overkill innit
        doc.html = '<div class="' + me.__cssClassesStr + '">' +
          doc.html + '</div>';
      }]
    });
    return doc.toString();
  }
});
