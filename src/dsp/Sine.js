/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Sine wave oscillator
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Sine wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 */
var Sine = AudioletNode.extend({

    parameters: {
        frequency: [0, 440]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [frequency=440] Initial frequency.
     */
    constructor: function(audiolet, frequency) {
        AudioletNode.call(this, audiolet, 1, 1, {
            frequency: frequency
        });
        this.phase = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var output = this.outputs[0];

        var frequency = this.frequency.getValue();
        var sampleRate = this.audiolet.device.sampleRate;

        output.samples[0] = Math.sin(this.phase);

        this.phase += 2 * Math.PI * frequency / sampleRate;
        if (this.phase > 2 * Math.PI) {
            this.phase %= 2 * Math.PI;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Sine';
    }

});