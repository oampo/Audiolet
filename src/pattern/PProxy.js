/**
 * @depends Pattern.js
 */

var PProxy = new Class({
    Extends: Pattern,
    initialize: function(pattern) {
        Pattern.prototype.initialize(this);
        if (pattern) {
            this.pattern = pattern;
        }
    },

    next: function() {
        var returnValue;
        if (this.pattern) {
            var returnValue = pattern.next();
        }
        else {
            returnValue = null;
        }
        return returnValue;
    }
});
var Pp = PProxy;

