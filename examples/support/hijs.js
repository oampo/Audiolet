/*
Copyright (c) 2010 Alexis Sellier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function (hijs) {
//
// hijs - JavaScript Syntax Highlighter
//
// Copyright (c) 2010 Alexis Sellier
//

// All elements which match this will be syntax highlighted.
var selector = hijs || 'code';

var keywords = ('var function if else for while break switch case do new null in with void '
               +'continue delete return this true false throw catch typeof with instanceof').split(' '),
    special  = ('eval window document undefined NaN Infinity parseInt parseFloat '
               +'encodeURI decodeURI encodeURIComponent decodeURIComponent').split(' ');

// Syntax definition
// The key becomes the class name of the <span>
// around the matched block of code.
var syntax = [
  ['comment', /(\/\*(?:[^*\n]|\*+[^\/*])*\*+\/)/g],
  ['comment', /(\/\/[^\n]*)/g],
  ['string' , /("(?:(?!")[^\\\n]|\\.)*"|'(?:(?!')[^\\\n]|\\.)*')/g],
  ['regexp' , /(\/.+\/[mgi]*)(?!\s*\w)/g],
  ['class'  , /\b([A-Z][a-zA-Z]+)\b/g],
  ['number' , /\b([0-9]+(?:\.[0-9]+)?)\b/g],
  ['keyword', new(RegExp)('\\b(' + keywords.join('|') + ')\\b', 'g')],
  ['special', new(RegExp)('\\b(' + special.join('|') + ')\\b', 'g')]
];
var nodes, table = {};

if (/^[a-z]+$/.test(selector)) {
    nodes = document.getElementsByTagName(selector);
} else if (/^\.[\w-]+$/.test(selector)) {
    nodes = document.getElementsByClassName(selector.slice(1));
} else if (document.querySelectorAll) {
    nodes = document.querySelectorAll(selector);
} else {
    nodes = [];
}

for (var i = 0, children; i < nodes.length; i++) {
    children = nodes[i].childNodes;

    for (var j = 0, str; j < children.length; j++) {
        code = children[j];

        if (code.length >= 0) { // It's a text node
            // Don't highlight command-line snippets
            if (! /^\$\s/.test(code.nodeValue.trim())) {
                syntax.forEach(function (s) {
                    var k = s[0], v = s[1];
                    code.nodeValue = code.nodeValue.replace(v, function (_, m) {
                        return '\u00ab' + encode(k) + '\u00b7'
                                        + encode(m) +
                               '\u00b7' + encode(k) + '\u00bb';
                    });
                });
            }
        }
    }
}
for (var i = 0; i < nodes.length; i++) {
    nodes[i].innerHTML =
        nodes[i].innerHTML.replace(/\u00ab(.+?)\u00b7(.+?)\u00b7\1\u00bb/g, function (_, name, value) {
            value = value.replace(/\u00ab[^\u00b7]+\u00b7/g, '').replace(/\u00b7[^\u00bb]+\u00bb/g, '');
            return '<span class="' + decode(name) + '">' + escape(decode(value)) + '</span>';
    });
}

function escape(str) {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Encode ASCII characters to, and from Braille
function encode (str, encoded) {
    table[encoded = str.split('').map(function (s) {
        if (s.charCodeAt(0) > 127) { return s }
        return String.fromCharCode(s.charCodeAt(0) + 0x2800);
    }).join('')] = str;
    return encoded;
}
function decode (str) {
    if (str in table) {
        return table[str];
    } else {
        return str.trim().split('').map(function (s) {
            if (s.charCodeAt(0) - 0x2800 > 127) { return s }
            return String.fromCharCode(s.charCodeAt(0) - 0x2800);
        }).join('');
    }
}

})(window.hijs);
