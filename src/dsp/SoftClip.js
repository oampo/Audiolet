/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A soft-clipper, which distorts at values over +-0.5.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Clipped audio
 */
var SoftClip = AudioletNode.extend({

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
            if (value > 0.5 || value < -0.5) {
                output.samples[i] = (Math.abs(value) - 0.25) / value;
            }
            else {
                output.samples[i] = value;
            }
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return ('SoftClip');
    }

});