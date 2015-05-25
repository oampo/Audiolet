var Pattern = require('./pattern.js');

/**
 * Proxy pattern.  Holds a pattern which can safely be replaced by a different
 * pattern while it is running.
 *
 *
 * @constructor
 * @extends Pattern
 * @param {Pattern} pattern The initial pattern.
 */
var Proxy = function(pattern) {
    Pattern.call(this);
    if (pattern) {
        this.pattern = pattern;
    }
};
Proxy.prototype = Object.create(Pattern.prototype);
Proxy.prototype.constructor = Pattern;

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
Proxy.prototype.next = function() {
    var returnValue;
    if (this.pattern) {
        var returnValue = this.pattern.next();
    }
    else {
        returnValue = null;
    }
    return returnValue;
};

module.exports = Proxy;

