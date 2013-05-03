/*!
 * @depends ../core/AudioletNode.js
 */

/*
 * Multiply values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Multiplied audio
 *
 * **Parameters**
 *
 * - value The value to multiply by.  Linked to input 1.
 */
var Multiply = AudioletNode.extend({

    defaults: {
        value: [1, 1]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [value=1] The initial value to multiply by.
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
        var value = this.get('value');
        var input = this.inputs[0];
        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            this.outputs[0].samples[i] = input.samples[i] * value;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Multiply';
    }

});