/**
 * @depends Pattern.js
 */

var PArithmetic = new Class({
    Extends: Pattern,
    initialize: function(start, step, repeats) {
        Pattern.prototype.initialize.apply(this);
        this.value = start;
        this.step = step;
        this.repeats = repeats;
        this.position = 0;
    },

    next: function() {
        var returnValue;
        if (this.position < this.repeats) {
            var step = this.value(this.step);
            if (step != null) {
                this.value += step;
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
    }
});

var Pseries = PArithmetic;

