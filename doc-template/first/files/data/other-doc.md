directory-index: 5
page-title-short: short page title
page-title: Styling Codeblocks With Metadata.
code-blocks: [ none, js, {type:js, gutter:true}, {type:js, gutter:true, first-line:23, highlight:[26,27]}, github]

<br />

## plain old 'none' type (default)

First i present some code, that has no syntax highlighting:

    ALPHA    GAMMA
         BETA
    ZETAH    CHAIE

(_This is what daring fireball markdown does with codeblocks._)


## 'js' type

If we specify in the metadata a type that is not built into fap-doc, fap-doc will try to load a Syntax Highlighter brush corresponding to that name.

(The Syntax Highlighter theme (read: css stylesheet) used below was specified in build.js.

Here is an exaple of javascript code:

    function helloWorld()
    {
        // this is great!
        for(var i = 0; i <= 1; i++)
            alert("yay");
    }

Here is the exact same code with line numbers:

    function helloWorld()
    {
        // this is great!
        for(var i = 0; i <= 1; i++)
            alert("yay");
    }

Exact same code a third time, but hey look at line 26 and 27:

    function helloWorld()
    {
        // this is great!
        for(var i = 0; i <= 1; i++)
            alert("yay");
    }

(_note_ at the time of this writing, you can use any theme
that Syntax Highlighter has, but you cannot combine multiple Syntax Highlighter
themes on one page due to the fact that a theme is just a stylesheet, not
associated with any one particular codeblock, but rather defining
the styling for the css class `syntaxhighlighter`.)

If you really really wanted this behavior for some crazy reason, you
could use the `class-name` property of the codeblock metadata and write
your own css rules for it.)

Fapdoc has a few built-in themes / brushes of its own for codeblocks.

## github-looking style

The default that Fapdoc does for a codeblock is to pass it through
directly to the daring fireball renderer, and let that handle it (which just wraps it in &lt;pre&gt;&lt;code&gt;...&lt;/code&gt;&lt;/pre&gt; tags as demonstrated
above).

Github's markdown processor (attotw) styles codeblocks similar to the manner
below, which you can have by specifying a `type` of `github` in your codeblock
metadata (per codeblock, per page, or sitewide if passed in the opts
to the `processCodeBlocks()` call in `build.js`.)

    var this { code; } // kinda
    
    looks("like").somethingFrom("github");

That's all for now...