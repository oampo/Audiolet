/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Reciprocal (1/x) of values
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Reciprocal audio
 */
var Reciprocal = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     */
    constructor: function(audiolet) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.linkNumberOfOutputChannels(0, 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            output.samples[i] = 1 / input.samples[i];
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Reciprocal';
    }

});