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
 */
var Gain = Multiply.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [gain=1] Initial gain.
     */
    constructor: function(audiolet, gain) {
        // Same DSP as operators/Multiply.js, but different parameter name
        Multiply.call(this, audiolet, gain);
        this.gain = this.value;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return ('Gain');
    }

});