/*

Modified version of https://github.com/developit/snarkdown

The MIT License (MIT)

Copyright (c) 2017 Jason Miller

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

import snarkdown from "../../config/snarkdown.js";
import assert from "assert";

describe("Text Formatting", () => {
    it("parses bold with **", () => {
        assert.strictEqual(
            snarkdown("I **like** tiny libraries"),
            "I <strong>like</strong> tiny libraries",
        );
    });

    it("parses bold with __", () => {
        assert.strictEqual(
            snarkdown("I __like__ tiny libraries"),
            "I <strong>like</strong> tiny libraries",
        );
    });

    it("parses italics with *", () => {
        assert.strictEqual(
            snarkdown("I *like* tiny libraries"),
            "I <em>like</em> tiny libraries",
        );
    });

    it("parses italics with _", () => {
        assert.strictEqual(
            snarkdown("I _like_ tiny libraries"),
            "I <em>like</em> tiny libraries",
        );
    });
});

describe("Abbreviations", () => {
    it("parses abbreviation", () => {
        assert.strictEqual(
            snarkdown('{fine spells}="Mostly sunny"'),
            '<abbr data-tippy-content="Mostly sunny">fine spells</abbr>',
        );
    });
});

describe("Titles", () => {
    it("parses H1 titles", () => {
        assert.strictEqual(
            snarkdown("# I like tiny libraries"),
            "<h1>I like tiny libraries</h1>",
        );
    });

    it("parses H2 titles", () => {
        assert.strictEqual(
            snarkdown("## I like tiny libraries"),
            "<h2>I like tiny libraries</h2>",
        );
    });

    it("parses H3 titles", () => {
        assert.strictEqual(
            snarkdown("### I like tiny libraries"),
            "<h3>I like tiny libraries</h3>",
        );
    });
});

describe("Links & Images", () => {
    it("parses links", () => {
        assert.strictEqual(
            snarkdown("[Snarkdown](http://github.com/developit/snarkdown)"),
            '<a href="http://github.com/developit/snarkdown">Snarkdown</a>',
        );
    });

    it("parses internal links pointing to a story [EN]", () => {
        assert.strictEqual(
            snarkdown("[Lost](story:Great_Story)", "en"),
            '<a href="/en/story/Great_Story" data-story="Great_Story">Lost</a>',
        );
    });

    it("parses internal links pointing to a story [FI]", () => {
        assert.strictEqual(
            snarkdown("[Lost](story:Great_Story)", "fi"),
            '<a href="/fi/story/Great_Story" data-story="Great_Story">Lost</a>',
        );
    });

    it("parses internal links pointing to a story [FR]", () => {
        assert.strictEqual(
            snarkdown("[Lost](story:Great_Story)", "fr"),
            '<a href="/fr/story/Great_Story" data-story="Great_Story">Lost</a>',
        );
    });

    it("parses anchor links", () => {
        assert.strictEqual(
            snarkdown("[Example](#example)"),
            '<a href="#example">Example</a>',
        );
    });

    it("parses images", () => {
        assert.strictEqual(
            snarkdown("![title](foo.png)"),
            '<img src="foo.png" alt="title">',
        );
        assert.strictEqual(
            snarkdown("![](foo.png)"),
            '<img src="foo.png" alt="">',
        );
    });

    it("parses images within links", () => {
        assert.strictEqual(
            snarkdown("[![](toc.png)](#toc)"),
            '<a href="#toc"><img src="toc.png" alt=""></a>',
        );
        assert.strictEqual(
            snarkdown("[![a](a.png)](#a) [![b](b.png)](#b)"),
            '<a href="#a"><img src="a.png" alt="a"></a> <a href="#b"><img src="b.png" alt="b"></a>',
        );
    });
});

describe("Lists", () => {
    it("parses an unordered list with *", () => {
        assert.strictEqual(
            snarkdown("* One\n* Two"),
            "<ul><li>One</li><li>Two</li></ul>",
        );
    });

    it("parses an unordered list with -", () => {
        assert.strictEqual(
            snarkdown("- One\n- Two"),
            "<ul><li>One</li><li>Two</li></ul>",
        );
    });

    it("parses an unordered list with +", () => {
        assert.strictEqual(
            snarkdown("+ One\n+ Two"),
            "<ul><li>One</li><li>Two</li></ul>",
        );
    });

    it("parses an unordered list with mixed bullet point styles", () => {
        assert.strictEqual(
            snarkdown("+ One\n* Two\n- Three"),
            "<ul><li>One</li><li>Two</li><li>Three</li></ul>",
        );
    });

    it("parses an ordered list", () => {
        assert.strictEqual(
            snarkdown("1. Ordered\n2. Lists\n4. Numbers are ignored"),
            "<ol><li>Ordered</li><li>Lists</li><li>Numbers are ignored</li></ol>",
        );
    });
});

describe("Line Breaks", () => {
    it("parses two new lines as line breaks", () => {
        assert.strictEqual(
            snarkdown("Something with\n\na line break"),
            "Something with<br />a line break",
        );
    });

    it("parses two spaces as a line break", () => {
        assert.strictEqual(
            snarkdown("Something with  \na line break"),
            "Something with<br />a line break",
        );
    });
});

describe("Quotes", () => {
    it("parses a block quote", () => {
        assert.strictEqual(
            snarkdown("> To be or not to be"),
            "<blockquote>To be or not to be</blockquote>",
        );
    });

    it("parses lists within block quotes", () => {
        assert.strictEqual(
            snarkdown("> - one\n> - two\n> - **three**\nhello"),
            "<blockquote><ul><li>one</li><li>two</li><li><strong>three</strong></li></ul></blockquote>\nhello",
        );
    });
});

describe("Horizontal Rules", () => {
    it("should parse ---", () => {
        assert.strictEqual(snarkdown("foo\n\n---\nbar"), "foo<hr />bar");
        assert.strictEqual(
            snarkdown("> foo\n\n---\nbar"),
            "<blockquote>foo</blockquote><hr />bar",
        );
    });

    it("should parse * * *", () => {
        assert.strictEqual(snarkdown("foo\n* * *\nbar"), "foo<hr />bar");
        assert.strictEqual(
            snarkdown("> foo\n\n* * *\nbar"),
            "<blockquote>foo</blockquote><hr />bar",
        );
    });
});

describe("Edge Cases", () => {
    it("should close unclosed tags", () => {
        assert.strictEqual(snarkdown("*foo"), "<em>foo</em>");
        assert.strictEqual(snarkdown("foo**"), "foo<strong></strong>");
        assert.strictEqual(
            snarkdown("[some **bold text](#winning)"),
            '<a href="#winning">some <strong>bold text</strong></a>',
        );
        assert.strictEqual(snarkdown("`foo"), "`foo");
    });

    it("should not choke on single characters", () => {
        assert.strictEqual(snarkdown("*"), "<em></em>");
        assert.strictEqual(snarkdown("_"), "<em></em>");
        assert.strictEqual(snarkdown("**"), "<strong></strong>");
        assert.strictEqual(snarkdown(">"), ">");
        assert.strictEqual(snarkdown("`"), "`");
    });
});
