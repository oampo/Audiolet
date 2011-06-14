/*!
 * @depends TableLookupOscillator.js
 */

/**
 * Triangle wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Triangle wave
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
var Triangle = function(audiolet, frequency) {
    TableLookupOscillator.call(this, audiolet, Triangle.TABLE, frequency);
};
extend(Triangle, TableLookupOscillator);

/**
 * toString
 *
 * @return {String} String representation.
 */
Triangle.prototype.toString = function() {
    return 'Triangle';
};

/**
 * Triangle table
 */
Triangle.TABLE = [];
for (var i = 0; i < 8192; i++) {
    // Smelly, but looks right...
    Triangle.TABLE.push(Math.abs(((((i - 2048) / 8192) % 1) + 1) % 1 * 2 - 1) * 2 - 1);
}

