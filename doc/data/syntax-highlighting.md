directory-index: 10
page-title-short: Syntax Highlighting
code-blocks: []
sidebar: {keywords: [note, warning]}
code-blocks:  { 1:js, 3:{type:js, gutter:true}, 5:{type:js, first-line:23, highlight:[26,27]}, 6:js, *:{class:githubby} }



# Styling Codeblocks with Syntax Highlighting.

(note: at the time of this writing, Gorbachev's Syntax Highlighter is the
only syntax highligher we use up in this piece.  Support for other syntax
highighters may happen if there is a compelling reason or effort.

So for the time being when we say "Syntax Highlighter" we are referring both to
the work of software by Gorbachev and the general thing.)


I am here to tell you that once you
know [how to associate metadata with individual code blocks][cb], you
can use this power to
use [Alex Gorbachev's World Famous Syntax Highlighter][agsh] and unleash
it all over your generated documentation.


## Understanding Syntax Highlighter Terminology

### Brushes

`brushes` refer to collection of lexers in Syntax Highlighter that correspond
to the different programming languages or grammars that it supports the
highlighting of.  E.g there is a PHP `brush` and a Javascript `brush`, etc.


### Themes

In abstract terms a _theme_ in the context of Syntax Highlighter is the fonts
and colors that constitute the look of the a highlighted block of text.
Concretely a theme is implemented a single CSS file.  Syntax Highlighter
comes bundled with a variety of themes (i.e. CSS files) from which we can
select one to style our highlighted code blocks by using the full basename of its CSS file, e.g. `shThemeFadeToGrey.css` as explored [below][t]


## Using Syntax Highlighter Brushes

(warning: the specific metadata syntax for how to invoke the following
things is in flux and *might* change slightly at some point in the future.

However, the functionality here described will always be available in fapdoc,
in some way or another.)

If we specify in the metadata for codeblocks a `type` that is not built into
fapdoc, fapdoc will try to load a Syntax Highlighter `brush` corresponding to
that name.

If we wanted all code blocks to be run through the Javascript syntax
highlighter, then in our document metadata we could say:

    code-blocks: { * : js }

(which is shorthand for `code-blocks: { * : {type:js} }` ), and a code block
would get highlighted like so:

    function helloWorld()
    {
        // this is great!
        for(var i = 0; i <= 1; i++)
            alert("yay");
    }

Many of the [Syntax Highlighter Options][agc] are irrelevant to use because
Syntax Hightligher is primary a frontend technology and we are using it
on the backend.  But those that _are_ relevant to us we can indicate
in our metadata and they will get passed back on through to the Syntax
Highlighter engine.

### line numbers

To get a "`gutter`" with line numbers, in your metadata say something like:

    code-blocks: [  ...  {type:js, gutter:true} ... ]

and you will get:

    function helloWorld()
    {
        // this is great!
        for(var i = 0; i <= 1; i++)
            alert("yay");
    }

We can also use the `first-line` and `highlight` options of Syntax Highlighter
like so:

    code-blocks: [ ... {type:js, first-line:23, highlight:[26,27]} ... ]

and we get:

    function helloWorld()
    {
        // this is great!
        for(var i = 0; i <= 1; i++)
            alert("yay");
    }

It bears pointing out that the above three codeblocks in the source markdown
document were all exactly the same.  They only different in what metadata was
used.


<h2><a name='themes' class='anchor'>Using Syntax Highlighter Themes</a></h2>

A theme is just a stylesheet.  You can indicate what Syntax Hilighter theme
you want to use with the `theme` property, whose value should be the basename
of the CSS filename to use.  Typically a theme would be used site-wide,
and as such it is typically indicated in the `build.js` file:

    h.processCodeBlocks({
      // ..
      theme : 'shCoreFadeToGrey.css',
      // ..
    });

(note: At the time of this writing, you can use any theme
that Syntax Highlighter has, but you cannot combine multiple Syntax Highlighter
themes on one page due to the fact that a theme is just a stylesheet, not
associated with any one particular codeblock, but rather defining
the styling for the css class `syntaxhighlighter`.

If you really really wanted this behavior for some crazy reason, you
could use the `class` property of the codeblock metadata and write
your own css rules for it.)

That's all the fun and glory that is Syntax Highlighting with fapdoc!!!


[agsh]:http://alexgorbatchev.com/SyntaxHighlighter/
[agc]:http://alexgorbatchev.com/SyntaxHighlighter/manual/configuration/
[cb]:code-blocks.html
[t]:#themes
