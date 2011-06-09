/*!
 * @depends TableLookupOscillator.js
 */

/**
 * Saw wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Saw wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 *
 * @extends TableLookupOscillator
 */
var Saw = new Class({
    Extends: TableLookupOscillator,
    /**
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object
     * @param {Number} [frequency=440] Initial frequency
     */
    initialize: function(audiolet, frequency) {
        TableLookupOscillator.prototype.initialize.apply(this, [audiolet,
                                                                Saw.TABLE,
                                                                frequency]);
    },

    /**
    * toString
    *
    * @return {String}
    */
    toString: function() {
        return 'Saw';
    }
});

/**
 * Saw table
 */
Saw.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Saw.TABLE.push(((((i - 4096) / 8192) % 1) + 1) % 1 * 2 - 1);
}

