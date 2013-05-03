/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Filter for leaking DC offset.  Maths is taken from
 * https://ccrma.stanford.edu/~jos/filters/DC_Blocker.html
 *
 * **Inputs**
 *
 * - Audio
 * - Filter coefficient
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - coefficient The filter coefficient.  Linked to input 1.
 */
var DCFilter = AudioletNode.extend({

    defaults: {
        coefficient: [1, 0.995]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [coefficient=0.995] The initial coefficient.
     */
    constructor: function(audiolet, coefficient) {
        AudioletNode.call(this, audiolet, 2, 1, {
            coefficient: coefficient
        });

        // Same number of output channels as input channels
        this.linkNumberOfOutputChannels(0, 0);

        // Delayed values
        this.xValues = [];
        this.yValues = [];
    },

    /**
     * Process samples
     */
    generate: function() {
        var coefficient = this.get('coefficient');
        var input = this.inputs[0];
        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.xValues.length) {
                this.xValues.push(0);
            }
            if (i >= this.yValues.length) {
                this.yValues.push(0);
            }

            var x0 = input.samples[i];
            var y0 = x0 - this.xValues[i] + coefficient * this.yValues[i];

            this.outputs[0].samples[i] = y0;

            this.xValues[i] = x0;
            this.yValues[i] = y0;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'DC Filter';
    }

});