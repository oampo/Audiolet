/**
 * @depends TableLookupOscillator.js
 */
var Square = new Class({
    Extends: TableLookupOscillator,
    initialize: function(audiolet, frequency) {
        TableLookupOscillator.prototype.initialize.apply(this, [audiolet,
                                                                Square.TABLE,
                                                                frequency]);
    },

    toString: function() {
        return 'Square';
    }
});

Square.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Square.TABLE.push(((i - 4096) / 8192) < 0 ? 1 : -1);
}


