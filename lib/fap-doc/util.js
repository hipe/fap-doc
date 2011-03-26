/**
 * experimental hack:
 *
 * "tersified" JSON is defined here informally as JSON without all the
 * lots of infuriating silly quotes.
 *
 * Take a json-like string who doesn't use quotes where it is supposed to
 * and make it look like one who does.  This is not robust at all and will
 * break on all but trivial cases.
 *
 * '[foo, null, true, false, bar]'  => '["foo", null, true, false, "bar"]'
 *
 * '{one:two, three:four, null:false}' =>
 *                             '{"one":"two", "three":"four", null:false}'
 *
 * This is not a parser, just a regex hack; and in some cases it
 * will turn valid json into non json:
 *
 *              '["a, b, c"]' => '["a, "b", c"]'
 *
 * The string on the left is JSON for "an array with one string element",
 * the string on the right is just borked gobbelty gook.
 */
exports.untersifyJson = function(str) {
  // we can't use the word boundary marker \b b/c "*" must be treated as a b.w.
  return str.replace(
    /(^|[,[\]{}: \n]+)(?!null|true|false)([^,[\]{}: \n'"]+)(?=$|[,[\]{}: \n])/g,
    function(_,a,b) { return a + '"' + b + '"'; });
};


// copy pasted from optparse, which came from the internet
exports.escapeRegexp = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g"); // .*+?|()[]{}\

exports.regexpEscape = function(str) {
  return str.replace(exports.escapeRegexp, "\\$&");
};

exports.reindent = function(content, unindent, reindent, pad, first, safe) {
  if (undefined == pad) pad = true;
  if (undefined == first) first = false;
  var ws = exports.regexpEscape(unindent);
  var re = new RegExp((first?'^':'\n') + (pad ? ('(?:'+ws+'|$)') : ws ), 'mg');
  if (safe) {
    // don't reformat the string unless every line has the unindent string
    var lines = content.split("\n");
    for (var i = lines.length; --i; ) { // skip 0th line
      if (! re.test(lines[i]) ) false;
    }
  }
  first || (reindent = '\n' + reindent);
  return content.replace(re, reindent);
};
