/*!
 * @depends ../operators/Multiply.js
 */

/**
 * Simple gain control
 *
 * **Inputs**
 *
 * - Audio
 * - Gain
 *
 * **Outputs**
 *
 * - Audio
 *
 * **Parameters**
 *
 * - gain The amount of gain.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [gain=1] Initial gain.
 */
var Gain = function(audiolet, gain) {
    // Same DSP as operators/Multiply.js, but different parameter name
    Multiply.call(this, audiolet, gain);
    this.gain = this.value;
};
extend(Gain, Multiply);

/**
 * toString
 *
 * @return {String} String representation.
 */
Gain.prototype.toString = function() {
    return ('Gain');
};
