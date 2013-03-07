/**
 * @depends ../core/AudioletNode.js
 */

/**
 * Hyperbolic tangent of values.  Works nicely as a distortion function.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Tanh audio
 */
var Tanh = AudioletNode.extend({

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
            var value = input.samples[i];
            output.samples[i] = (Math.exp(value) - Math.exp(-value)) /
                                (Math.exp(value) + Math.exp(-value));
        } 
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return ('Tanh');
    }

});