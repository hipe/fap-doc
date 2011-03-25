directory-index: 5
page-title-short: code blocks
page-title: Styling Codeblocks With Metadata.
code-blocks: {*:{class:githubby}, 1:none, 2:js, 8:js}
sidebar: {keyword: note}
<br />

## Understanding Markdown Code Blocks

Daring Fireball markdown syntax supports the idea of [code blocks][dfcb],
which allow you to provide in your markdown files one or more lines indented
by at least 4 spaces or 1 tab,

        ALPHA    GAMMA
             BETA
        ZETAH    CHAIE

which when rendered with fapdoc will by default produce the same html output
that the daring fireball processor will do, which is to wrap the content in
&lt;pre&gt;&lt;code&gt;...&lt;/code&gt;&lt;/pre&gt; tags, producing:

    ALPHA    GAMMA
         BETA
    ZETAH    CHAIE

Boring, innit?  A primary inspriation for fapdoc is to spice-up the
handling of these codeblocks to an absurd degree.


## Turning on Special Code-block Processing

At the time of this writing, every fapdoc feature is experimental and needs to
be enabled explicitly in the [petrify]-style `build.js` file.  To use this one,

    fd.processCodeBlocks();

which tells fapdoc to hack into petrify to add a preprocessor for handling
codeblocks.



## Understanding Code-block Metadata

Thanks to [coalans's WMD markdown parser][wmd] (used by his [petrify], on which
fapdoc is currently married to) you can provide arbitrary metadata at the top of
any of your markdown files.

Document metadata is arbitrary key-value pairs that might look like:

    page-title: Ohai There
    directory-index: 5

Fapdoc will use the `code-blocks` element to decide how you want your
code-blocks processed and rendered on the page.

For example, we can indicate that for the first, second, and third codeblocks
that appear on the page, we want to use CSS classes of `red`, `green`, and
`blue` respectively:

    code-blocks: [{class:red}, {class:green}, {class:blue}]

When you indicate a `class` element there for the individual codeblock metadata,
it simply tells fapdoc to run your codeblock through the daring fireball engine,
and then wrap the results of it in a &lt;div&gt; tag with the class(es) you
indicated.

Rather than using an array-like structure, we can use an object-like
structure, and refer to the offset of which code block we're talking about with
indexes starting from 0:

    code-blocks: { 0:{class:red}, 1:{class:green}, 2:{class:blue}}

(note: the above metadata values are using something we're calling
"_tersified json_" which is essentially json without the unnecessary quotes.

Note that each element of the list corresponds to each codeblock in sequence
that is expected to appear in the markdown document.
This parallelism is a bit ugly and fragile, but ultimately it was decided that
is is better than having *any* view-related markup appear in the body-copy of
the markdown document.  It's sometimes painful to author, but much easier to read; like markdown!)


## Understanding Cascading Metadata

Typically you may want to do the same operations to several (or all) of the
codeblocks in your documents.  A bit like cascading stylesheets, fapdoc
provides you with different levels of scope that you can use to achieve
the desired level of granularity of defining codeblock metadata
without needing to repeat yourself.


### Using the Star Index

In the above array-like syntax, the position of the referred-to codeblock
corresponds to the position of the element in the list.  But we may also refer
to the codeblocks with explicit offset numbers (starting from 0).  Using this
in conjuction with the special `*` index allows us to for example,

    code-blocks: { *:{class:red}, 4:{class:green}, 2:{class:blue} }

which assignings a CSS class `red` to every codeblock on the page except the
fifth (index 4) and third (index 2) ones, which get the `green` and `blue`
classes respectively.


### Site-wide Defaults

The star index above shows how to DRY-up your metadata for an individual page;
but if you have several pages of markdown documentation it's possible that you
will want to define default handling for codeblocks in the same manner for
all of your pages, and if so it is of course prudent to keep that all in one place.

Currently, the place for site-wide metadata/configuration is in the `build.js`
file.  When you call `fd.processCodeBlocks()` to enable all of this, you can
pass it an object some of whom can be (but not all of whom need to be)
configuration metadata for how to handle code-blocks:

    fd.processCodeBlocks({
      class : 'red'
    });

which tells fapdoc to give each codeblock in the whole site that CSS class,
unless we specify otherwise.


## Using fapdoc's Bundled CSS Styles

Fapdoc wants to stay out of the way for how you might want to style all
&lt;pre&gt; and &lt;code&gt; tags, so its default generated stylesheet
does no styling of these things.  (But if it did, easy enough to change,
innit!)

However, to spice things up a bit but still keep things easy, you can use
codeblock CSS class names that are included in our default `style.css`
stylesheet for some common looks.

If you specify a metadata property of `class` alongside no other directives
for handling the codeblock (at this level), fapdoc assumes you just want
to wrap the codeblock in a `div`/`pre`/`code` nest, with that CSS class as
the class for the div.

One such available CSS class out of the box is "githubby", which is based
off of the styling that at the time of this writing Github does to markdown
codeblocks with its CSS styling (tweaked a bit to look better with our styling,
hence "github*by*").

At the time of the writing of this sentence, we wanted to use the "githubby"
CSS class for most of the codeblocks in this page, but use a type `none` for
the codeblock at offset 1, and a `type` of `js` for
two others.  (Saying `type` `js` is covered in
the section on [syntax highlighting][sh].)

    code-blocks: {*:{class:githubby}, 1:none, 2:js, 8:js}

So the above shows what a line of your document metadata might look like
for saying that you want a certain CSS class for certain of your codeblocks
in the document.


## Using Your Own CSS Styles

Fapdoc doesn't know whether your `class` parameters for codeblocks refers
to styles in its default `style.css` or not.  So you can use whatever
classnames you want there in the `class` directive, and then style these
types of codeblocks accordingly in your CSS files.



## In Summary,

Armed with an understanding of how we associate metadata with codeblocks,
you can use one of the features that fapdoc shines best at, which
is [syntax highlighting] [sh]!


[dfcb]:http://daringfireball.net/projects/markdown/syntax#precode
[petrify]:https://github.com/caolan/petrify
[sh]:(syntax-highlighting.html)
[wmd]:https://github.com/caolan/wmd
