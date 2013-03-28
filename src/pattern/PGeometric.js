/*!
 * @depends Pattern.js
 */


/**
 * Geometric sequence.  Multiplies a running total by a value on each next
 * call.
 */
var PGeometric = Pattern.extend({

    /**
     * Constructor
     *
     * @extends Pattern
     * @param {Number} start Starting value.
     * @param {Pattern|Number} step Value to multiply by.
     * @param {Number} repeats Number of values to generate.
     */
    constructor: function(start, step, repeats) {
        Pattern.call(this);
        this.start = start;
        this.value = start;
        this.step = step;
        this.repeats = repeats;
        this.position = 0;
    },

    /**
     * Generate the next value in the pattern.
     *
     * @return {Number} The next value.
     */
    next: function() {
        var returnValue;
        if (this.position == 0) {
            returnValue = this.value;
            this.position += 1;
        }
        else if (this.position < this.repeats) {
            var step = this.valueOf(this.step);
            if (step != null) {
                this.value *= step;
                returnValue = this.value;
                this.position += 1;
            }
            else {
                returnValue = null;
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
    },

    /**
     * Reset the pattern
     */
    reset: function() {
        this.value = this.start;
        this.position = 0;
        if (this.step instanceof Pattern) {
            this.step.reset();
        }
    }

});

/**
 * Supercollider alias
 */
var Pgeom = PGeometric;

