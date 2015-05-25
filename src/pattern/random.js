var Pattern = require('./pattern.js');

/**
 * Sequence of random numbers.
 *
 * @constructor
 * @extends Pattern
 * @param {Number|Pattern} low Lowest possible value.
 * @param {Number|Pattern} high Highest possible value.
 * @param {Number} repeats Number of values to generate.
 */
var Random = function(low, high, repeats) {
    Pattern.call(this);
    this.low = low;
    this.high = high;
    this.repeats = repeats;
    this.position = 0;
};
Random.prototype = Object.create(Pattern.prototype);
Random.prototype.constructor = Pattern;

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
Random.prototype.next = function() {
    var returnValue;
    if (this.position < this.repeats) {
        var low = this.valueOf(this.low);
        var high = this.valueOf(this.high);
        if (low != null && high != null) {
            returnValue = low + Math.random() * (high - low);
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
};

/**
 * Reset the pattern
 */
Random.prototype.reset = function() {
    this.position = 0;
};


module.exports = Random;
