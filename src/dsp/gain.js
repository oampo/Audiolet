var Multiply = require('../operator/multiply');

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
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [gain=1] Initial gain.
 */
var Gain = function(context, gain) {
    // Same DSP as operators/Multiply.js, but different parameter name
    Multiply.call(this, context, gain);
    this.gain = this.value;
};
Gain.prototype = Object.create(Multiply.prototype);
Gain.prototype.constructor = Gain;

/**
 * toString
 *
 * @return {String} String representation.
 */
Gain.prototype.toString = function() {
    return ('Gain');
};

module.exports = Gain;
