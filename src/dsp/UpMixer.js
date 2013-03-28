/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Upmix an input to a constant number of output channels
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Upmixed audio
 */
var UpMixer = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} outputChannels The number of output channels.
     */
    constructor: function(audiolet, outputChannels) {
        AudioletNode.call(this, audiolet, 1, 1);
        this.outputs[0].numberOfChannels = outputChannels;
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var numberOfInputChannels = input.samples.length;
        var numberOfOutputChannels = output.samples.length;

        if (numberOfInputChannels == numberOfOutputChannels) {
            output.samples = input.samples;
        }
        else {
            for (var i = 0; i < numberOfOutputChannels; i++) {
                output.samples[i] = input.samples[i % numberOfInputChannels];
            }
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'UpMixer';
    }

});