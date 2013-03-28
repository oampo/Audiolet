/*!
 * @depends Pattern.js
 */

/**
 * Proxy pattern.  Holds a pattern which can safely be replaced by a different
 * pattern while it is running.
 */
var PProxy = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Pattern} pattern The initial pattern.
     */
    constructor: function(pattern) {
        Pattern.call(this);
        if (pattern) {
            this.pattern = pattern;
        }
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.pattern) {
            var returnValue = this.pattern.next();
        }
        else {
            returnValue = null;
        }
        return returnValue;
    }

});

/**
 * Alias
 */
var Pp = PProxy;