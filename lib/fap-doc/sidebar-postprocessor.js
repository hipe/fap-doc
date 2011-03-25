/**
 * What we are trying to do sounds really simple: make a parenthetical
 * clause like (sidebar: foo bar baz) demoted down into its own dom element:
 *   <div class="sidebar"><p>foo bar baz</p></div>
 *
 * Partly for fun and partly for experimentation, we implement this as a
 * post-processor that operates on the html fragment using jsdom.
 *
 * All we are doing is: find each set of N contiguous elements whose first
 * element is a paragraph tag whose beginning of innerHTML matches "(foo:"
 * and whose last element is the first sibling element whose end of innerHTML
 * matches ")".  Take each such contiguous sequence of elements, rip them
 * out of the document and put them inside their own div, and put that div
 * where the paragraph with "(foo:" used to be.
 *
 * The reason we're doing this as a *post* processor as opposed to a
 * preprocesor is a) we wanted experience with jsdom and b) if we do it this
 * way, the would-be contents of the sidebar each get run through all the
 * preprocessors as well as the markdown rendering before getting here,
 * hence if we really want to shoot ourselves in the face with ridiculousness,
 * we can by for example have syntax-highlighted codeblocks inside of sidebars.
 *
 * But the syntax is a bit fragile, innit!
 */

var util = require('./util'),
    jsdom = require('wmd/deps/jsdom/lib/jsdom').jsdom,
    htmlparser = require('wmd/deps/node-htmlparser/lib/node-htmlparser');

exports.build = function(hax) {
  return new _SidebarProcessor(hax);
};
var _SidebarProcessor = function(hax) {
  this.__hax = hax;
  this.__reEnd = /\)\s*$/;
};

_SidebarProcessor.prototype = {
  process : function(doc) {
    if (!doc.metadata.sidebar) return doc;
    this._initWithDoc(doc);

    // this sucks. if html_no_heading is present, assume we are using it.
    // @fixme
    this.__useHtml = this.__doc.html_no_heading ?
      'html_no_heading' : 'html';

    // create new window because we'll be editing the html (c/p wmd)
    // really sad, but appendChild et al complain when ownerDocument
    // of `this` is not same, and so basically from the looks of things
    // you can never use document.apppendChild()
    var window = jsdom(
      "<div class='sidebar-hack'>" +
        this.__doc[this.__useHtml] + "</div>" ,
      jsdom.defaultLevel, { parser : htmlparser }
    ).createWindow();


    // find each pargraph that starts with the pattern(s), and keep
    // getting each next sibling child until you find the stop pattern
    var sidebarSequences = [];
    var parasScoopedUp = []; // redudnant with above, safeguard
    var paras = window.document.getElementsByTagName('P');

    for (var i = 0; i < paras.length; i++) {
      if (! this.__reSearch.test(paras[i].innerHTML)) continue;
      // safeguard against what is usually a typo, that is starting a new
      // sidebar within a sidebar.  no way!
      if (-1 != parasScoopedUp.indexOf(paras[i])) continue;
      var arr = this._scoopUpCodeblockSequence(paras[i], i, parasScoopedUp);
      sidebarSequences.push({ theList : arr });
    }
    if (! sidebarSequences.length) {
      return this._warn('didn\'t find any line beginning with "' +
        this._surface + '" anywhere in document.');
    }
    this._rebuild(sidebarSequences, window);
    return this.__doc;
  },


  // run along each sibling after the element, and keep going till
  // you find the end pattern or till the end of the document.

  _scoopUpCodeblockSequence : function(firstPara, paraIdx, parasScoopedUp) {
    var sequence = [], curr = firstPara, haveLastPara;
    do {
      sequence.push(curr);
      if ('P' == curr.nodeName) parasScoopedUp.push(curr);
      haveLastPara = this.__reEnd.test(curr.innerHTML);
    } while ((curr = curr.nextSibling) && ! haveLastPara);

    if (!haveLastPara) {
      this._warn('couldn\'t find a paragraph anywhere '+
      'after paragraph '+paraIdx+' that started with '+
      '"' + this._surface + '" ending with ")".');
    }
    return sequence;
  },


  // now that we have all the tags we are moving around, actually do it.

  _rebuild : function(sidebarSequences, window) {
    var baseNode = window.document.firstChild; // class = 'sidebar-hack'
    for (var i = 0; i < sidebarSequences.length; i++) {
      var seq = sidebarSequences[i].theList;
      var sidebar = window.document.createElement('div');
      baseNode.insertBefore(sidebar, seq[0]);
      baseNode.removeChild(seq[0]);
      sidebar.appendChild(seq[0]);
      this._makePretty(seq, sidebar, window);
      for (var j = 1; j < seq.length; j++) {
        baseNode.removeChild(seq[j]);
        sidebar.appendChild(seq[j]);
      }
    }
    this.__doc[this.__useHtml] = window.document.innerHTML;
  },

  _initWithDoc : function(doc) {
    this.__doc = doc;
    this.__opts = JSON.parse(util.untersifyJson(this.__doc.metadata.sidebar));
    this._normalizeKeywords(this.__opts);
    var names = this.__opts.keywords.map(function(kw){
      return util.regexpEscape(kw);
    });
    var parenStart = '^\\(('+names.join('|')+'):';
    this.__reSearch = new RegExp(parenStart + '\\s*((?:.|\n)*)$');
    this.__reHeader = new RegExp(parenStart);
  },

  _normalizeKeywords : function(o) {
    if (!o.keywords) o.keywords = [];
    if (o.keyword) {
      if (-1 == o.keywords.indexOf(o.keyword)) o.keywords.push(o.keyword);
      o.keyword = undefined;
    }
    if (0 == o.keywords.length) o.keywords.push('sidebar');
  },

  /**
   * Remove "(foo:" from the beginning and ")" from the end.
   * Infer a CSS class for the sidebar div.
   */
  _makePretty : function(sequence, sidebar, window) {
    var para = sequence[0];
    var nameUsed = this.__reHeader.exec(para.firstChild.data)[1];
    var cssClass = this.__opts['class'] || cssClassify(nameUsed);
    var classes = 'sidebar '+cssClass;
    sidebar.setAttribute('class', classes);
    para.firstChild.data = para.firstChild.data.replace(this.__reHeader, '');
    para = sequence[sequence.length - 1];
    para.lastChild.data = para.lastChild.data.replace(/\)$/, '');
    var h2 = window.document.createElement('h2');
    h2.innerHTML = this.__opts.title || nameUsed;
    sidebar.insertBefore(h2, sidebar.firstChild);
  },

  _warn : function(msg) {
    this.__hax._warn(msg);
    return this.__doc;
  },

  get _surface() {
    return '(' + this.__opts.keywords.join('/') +':';
  }
};

// build this out later as needed
function cssClassify(string) {
  return string.toLowerCase().replace(/^[^a-z]+/, '').
    replace(/[^-a-z0-9]/g, '-').replace(/--+/g, '-');
}
