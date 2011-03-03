/**
 * @depends Pattern.js
 */

var PRandom = new Class({
    Extends: Pattern,
    initialize: function(low, high, repeats) {
        Pattern.prototype.initialize(this);
        this.low = low;
        this.high = high;
        this.repeats = repeats;
        this.position = 0;
    },

    next: function() {
        var returnValue;
        if (this.position < this.repeats) {
            var low = this.valueOf(this.low);
            var high = this.valueOf(this.high);
            if (low != null && high != null) {
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

    reset: function() {
        this.position = 0;
    }
});
var Pwhite = PRandom;

