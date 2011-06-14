/*!
 * @depends TableLookupOscillator.js
 */

/**
 * Square wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Square wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 *
 * @constructor
 * @extends TableLookupOscillator
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Square = function(audiolet, frequency) {
    TableLookupOscillator.call(this, audiolet, Square.TABLE, frequency);
};
extend(Square, TableLookupOscillator);

/**
 * toString
 *
 * @return {String} String representation.
 */
Square.prototype.toString = function() {
    return 'Square';
};

/**
 * Square wave table
 */
Square.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Square.TABLE.push(((i - 4096) / 8192) < 0 ? 1 : -1);
}


