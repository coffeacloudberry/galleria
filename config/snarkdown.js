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

const TAGS = {
    "": ["<em>", "</em>"],
    _: ["<strong>", "</strong>"],
    "*": ["<strong>", "</strong>"],
    "~": ["<s>", "</s>"],
    "\n": ["<br />"],
    " ": ["<br />"],
    "-": ["<hr />"],
};

/** Outdent a string based on the first indented line's leading whitespace. */
function outdent(str) {
    return str.replace(
        RegExp(`^${(str.match(/^([\t ])+/) || "")[0]}`, "gm"),
        "",
    );
}

/** Encode special attribute characters to HTML entities in a String. */
function encodeAttr(str) {
    return String(str)
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/** Parse Markdown into an HTML String. */
export default function parse(md, language) {
    const tokenizer =
            /((?:^|\n+)(?:\n---+|\* \*(?: \*)+)\n)|((?:(?:^|\n+)(?:\t|  {2,}).+)+\n*)|((?:(?:^|\n)([>*+-]|\d+\.)\s+.*)+)|!\[([^\]]*?)]\(([^)]+?)\)|(\[)|(](?:\(([^)]+?)\))?)|(?:^|\n+)(#{1,6})\s*(.+)(?:\n+|$)|( {2}\n+|\n{2,}|__|\*\*|[_*]|~~)|({([^{}]*)}="([^"]*)")/gm,
        context = [];
    let out = "",
        last = 0;

    function tag(token) {
        const desc = TAGS[token[1] || ""];
        const end = context[context.length - 1] === token;
        if (!desc) return token;
        if (!desc[1]) return desc[0];
        if (end) context.pop();
        else context.push(token);
        return desc[end | 0];
    }

    function flush() {
        let str = "";
        while (context.length) str += tag(context[context.length - 1]);
        return str;
    }

    for (const token of md.matchAll(tokenizer)) {
        const prev = md.substring(last, token.index);
        let chunk = token[0];
        last = token.index + chunk.length;
        if (/[^\\](\\\\)*\\$/.test(prev)) {
            // escaped
        }
        // > Quotes, -* lists:
        else if (token[4]) {
            let t3 = token[3];
            let t4 = token[4];
            if (/\./.test(t4)) {
                t3 = t3.replace(/^\d+/gm, "");
            }
            t3 = outdent(t3.replace(/^\s*[>*+.-]/gm, ""));
            let inner = parse(t3, language);
            if (t4 === ">") {
                t4 = "blockquote";
            } else {
                t4 = /\./.test(t4) ? "ol" : "ul";
                inner = inner.replace(/^(.*)(\n|$)/gm, "<li>$1</li>");
            }
            chunk = `<${t4}>${inner}</${t4}>`;
        }
        // Images:
        else if (token[6]) {
            chunk = `<img src="${encodeAttr(token[6])}" alt="${encodeAttr(token[5])}">`;
        }
        // Links:
        else if (token[8] && token[9]) {
            let url = token[9];
            let dataStory = "";
            if (url.startsWith("story:")) {
                const story = url.split(":")[1];
                url = `/#!/${language}/story/${story}`;
                dataStory = ` data-story="${story}"`;
            }
            out = out.replace(
                "<a>",
                `<a href="${encodeAttr(url)}"${dataStory}>`,
            );
            chunk = `${flush()}</a>`;
        } else if (token[7]) {
            chunk = "<a>";
        }
        // Headings:
        else if (token[10]) {
            const level = token[10].length;
            chunk = `<h${level}>${parse(token[11], language)}</h${level}>`;
        }
        // Inline formatting: *em*, **strong** & friends
        else if (token[12] || token[1]) {
            chunk = tag(token[12] || "--");
        }
        // Abbreviation
        else if (token[14] && token[15]) {
            chunk = `<abbr data-tippy-content="${token[15]}">${token[14]}</abbr>`;
        }
        out += prev;
        out += chunk;
    }

    return (out + md.substring(last) + flush()).replace(/^\n+|\n+$/g, "");
}
