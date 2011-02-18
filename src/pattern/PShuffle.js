/**
 * @depends Pattern.js
 * @depends PSequence.js
 */

var PShuffle = new Class({
    Extends: Pattern,
    Implements: PSequence, // Use the same next function
    initialize: function(list, repeats) {
        Pattern.prototype.initialize(this);
        this.list = [];
        // Shuffle values into new list
        while (list.length) {
            var index = Math.floor(Math.random() * list.length);
            var value = list.splice(index, 1);
            this.list.push(value);
        }
        this.repeats = repeats;
        this.position = 0;
    }
});

var Pshuffle = PShuffle;

