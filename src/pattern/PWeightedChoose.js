/**
 * @depends Pattern.js
 */

var PWeightedChoose = function() {
    Pattern.call(this); 
}

PWeightedChoose.prototype.next = function() {
}
extend(PWeightedChoose, Pattern);

Pwrand = PWeightedChoose;
