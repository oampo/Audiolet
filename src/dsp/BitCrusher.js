/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Reduce the bitrate of incoming audio
 *
 * **Inputs**
 *
 * - Audio 1
 * - Number of bits
 *
 * **Outputs**
 *
 * - Bit Crushed Audio
 *
 * **Parameters**
 *
 * - bits The number of bit to reduce to.  Linked to input 1.
 */
var BitCrusher = AudioletNode.extend({

    parameters: {
        bits: [1, null]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} bits The initial number of bits.
     */
    constructor: function(audiolet, bits) {
        AudioletNode.call(this, audiolet, 2, 1, {
            bits: bits
        });
        this.linkNumberOfOutputChannels(0, 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];

        var maxValue = Math.pow(2, this.get('bits')) - 1;

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            this.outputs[0].samples[i] = Math.floor(input.samples[i] * maxValue) /
                                         maxValue;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'BitCrusher';
    }

});