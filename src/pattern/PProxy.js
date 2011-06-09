/**
 * @depends Pattern.js
 */

var PProxy = function(pattern) {
    PProxy.superclass.call(this); 
    if (pattern) {
        this.pattern = pattern;
    }
}
extend(PProxy, Pattern);

PProxy.prototype.next = function() {
    var returnValue;
    if (this.pattern) {
        var returnValue = this.pattern.next();
    }
    else {
        returnValue = null;
    }
    return returnValue;
}
var Pp = PProxy;

