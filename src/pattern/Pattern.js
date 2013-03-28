/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * A generic pattern.  Patterns are simple classes which return the next value
 * in a sequence when the next function is called.  Patterns can be embedded
 * inside other patterns to produce complex sequences of values.  When a
 * pattern is finished its next function returns null.
 */
var Pattern = AudioletClass.extend({

    /**
     * Default next function.
     *
     * @return {null} Null.
     */
    next: function() {
        return null;
    },

    /**
     * Return the current value of an item contained in a pattern.
     *
     * @param {Pattern|Object} The item.
     * @return {Object} The value of the item.
     */
    valueOf: function(item) {
        if (item instanceof Pattern) {
            return (item.next());
        }
        else {
            return (item);
        }
    },

    /**
     * Default reset function.
     */
    reset: function() {
    }

});