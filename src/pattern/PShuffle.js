/**
 * @depends Pattern.js
 */

var PShuffle = function(list, repeats) {
    Pattern.call(this);
    this.list = [];
    // Shuffle values into new list
    while (list.length) {
        var index = Math.floor(Math.random() * list.length);
        var value = list.splice(index, 1);
        this.list.push(value);
    }
    this.repeats = repeats;
    this.position = 0;
};
extend(PShuffle, Pattern);
PShuffle.prototype.next = function() {
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
};
var Pshuffle = PShuffle;

