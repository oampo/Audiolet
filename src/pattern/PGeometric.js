/**
 * @depends Pattern.js
 */

var PGeometric = new Class({
    Extends: Pattern,
    initialize: function(start, step, repeats) {
        Pattern.prototype.initialize(this);
        this.start = start;
        this.value = start;
        this.step = step;
        this.repeats = repeats;
        this.position = 0;
    },

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

    reset: function() {
        this.value = this.start;
        this.position = 0;
        if (instanceOf(this.step, Pattern)) {
            this.step.reset();
        }
    }
});
var Pgeom = PGeometric;

