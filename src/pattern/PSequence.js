/**
 * @depends Pattern.js
 */

var PSequence = function(list, repeats, offset) {
    Pattern.call(this); 
    this.list = list;
    this.repeats = repeats || 1;
    this.position = 0;
    this.offset = offset || 0;
}
extend(PSequence, Pattern);

PSequence.prototype.next = function() {
    var returnValue;
    if (this.position < this.repeats * this.list.length) {
        var index = (this.position + this.offset) % this.list.length;
        var item = this.list[index];
        var value = this.valueOf(item);
        if (value != null) {
            if (!(item instanceof Pattern)) {
                this.position += 1;
            }
            returnValue = value;
        }
        else {
            if (item instanceof Pattern) {
                item.reset();
            }
            this.position += 1;
            returnValue = this.next();
        }
    }
    else {
        returnValue = null;
    }
    return (returnValue);
}

PSequence.prototype.reset = function() {
    this.position = 0;
    for (var i = 0; i < this.list.length; i++) {
        var item = this.list[i];
        if (item instanceof Pattern) {
            item.reset();
        }
    }
}
var Pseq = PSequence;

