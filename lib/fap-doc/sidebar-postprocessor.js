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
    // create new window because we'll be editing the html (c/p wmd)
    // really sad, but appendChild et al complain when ownerDocument
    // of `this` is not same, and so basically you can never use
    //  document.apppendChild() from what it looks like
    var window = jsdom(
      "<div class='sidebar-hack'>" + this.__doc.html + "</div>" ,
      jsdom.defaultLevel, { parser : htmlparser }
    ).createWindow();
    var tags = window.document.getElementsByTagName('P');
    var founds = [];
    for (var i = 0; i < tags.length; i++) {
      if (! this.__reSearch.test(tags[i].innerHTML)) continue;
      founds.push([i, [tags[i]]]);
    }
    if (! founds.length) return this._warn('expecting "' + this._surface +
      '"' +'at beginning of line.');
    for (i = 0; i < founds.length; i++) {
      var curr = founds[i][1][0], found;
      found = this.__reEnd.test(curr.innerHTML);
      while (!found && curr) {
        curr = curr.nextSibling;
        if (curr) {
          founds[i][1].push(curr);
          found = this.__reEnd.test(curr.innerHTML);
        }
      }
      if (!found) return this._warn('couldn\'t find a paragraph anywhere '+
        'after paragraph '+(founds[i][0]+1)+' that started with '+
        '"' + this.surface + '" ending with ")"');
    }
    this._rebuild(founds, window);
    return doc;
  },
  /**
   * please see first paragraph for a description of this algo.
   */
  _rebuild : function(founds, window) {
    var node = window.document.firstChild; // class = 'sidebar-hack'
    for (var i = 0; i < founds.length; i++) {
      var para = founds[i][1][0];
      var sidebar = window.document.createElement('div');
      sidebar.setAttribute('class', 'sidebar');
      var nx = para.nextSibling;
      node.removeChild(para);
      sidebar.appendChild(para);
      node.insertBefore(sidebar, nx);
      this._makePretty(founds[i][1], sidebar, window);
      for (var j = 1; j < founds[i][1].length; j++) {
        para = founds[i][1][j];
        node.removeChild(para);
        sidebar.appendChild(para);
      }
    }
    this.__doc.html = window.document.innerHTML;
    this.__doc.html_no_heading = this.__doc.html; // if the html_no_heading
    // post-processor was run, then this is ok, because we already don't have
    // the heading anymore! and if we don't use it/don't care, this is inert
  },
  _initWithDoc : function(doc) {
    this.__doc = doc;
    this.__opts = JSON.parse(util.untersifyJson(this.__doc.metadata.sidebar));
    if (!this.__opts.keyword) this.__opts.keyword = 'sidebar';
    var parenStart = '^\\('+util.regexpEscape(this.__opts.keyword)+':';
    this.__reSearch = new RegExp(parenStart + '\\s*((?:.|\n)*)$');
    this.__reHeader = new RegExp(parenStart);
  },
  _makePretty : function(sequence, sidebar, window) {
    var para = sequence[0];
    // remove "(foo:" from the beginning and ")" from the end
    para.firstChild.data = para.firstChild.data.replace(this.__reHeader, '');
    para = sequence[sequence.length - 1];
    para.lastChild.data = para.lastChild.data.replace(/\)$/, '');
    var h2 = window.document.createElement('h2');
    h2.innerHTML = this.__opts.title || this.__opts.keyword;
    sidebar.insertBefore(h2, sidebar.firstChild);
  },
  _warn : function(msg) {
    this.__hax._warn(msg);
    return this.__doc;
  },
  get _surface() {
    return '(' + this.__opts.keyword +':';
  }
};
