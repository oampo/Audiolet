/**
 * @depends TableLookupOscillator.js
 */
var Saw = new Class({
    Extends: TableLookupOscillator,
    initialize: function(audiolet, frequency) {
        TableLookupOscillator.prototype.initialize.apply(this, [audiolet,
                                                                Saw.TABLE,
                                                                frequency]);
    },

    toString: function() {
        return 'Saw';
    }
});

Saw.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Saw.TABLE.push(((((i - 4096) / 8192) % 1) + 1) % 1 * 2 - 1);
}

