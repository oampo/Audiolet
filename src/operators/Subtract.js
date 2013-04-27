/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Subtract values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Subtracted audio
 *
 * **Parameters**
 *
 * - value The value to subtract.  Linked to input 1.
 */
var Subtract = AudioletNode.extend({

    defaults: {
        value: [1, 0]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [value=0] The initial value to subtract.
     */
    constructor: function(audiolet, value) {
        AudioletNode.call(this, audiolet, 2, 1, {
            value: value
        });
        this.linkNumberOfOutputChannels(0, 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var value = this.get('value');

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            output.samples[i] = input.samples[i] - value;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Subtract';
    }

});