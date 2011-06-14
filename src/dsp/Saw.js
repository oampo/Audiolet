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
 * @constructor
 * @extends TableLookupOscillator
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Saw = function(audiolet, frequency) {
    TableLookupOscillator.call(this, audiolet, Saw.TABLE, frequency);
};
extend(Saw, TableLookupOscillator);

/**
 * toString
 *
 * @return {String} String representation.
 */
Saw.prototype.toString = function() {
    return 'Saw';
};

/**
 * Saw table
 */
Saw.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Saw.TABLE.push(((((i - 4096) / 8192) % 1) + 1) % 1 * 2 - 1);
}

