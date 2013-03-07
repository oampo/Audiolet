/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Saw wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Saw wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 */
var Saw = AudioletNode.extend({

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

        output.samples[0] = ((this.phase / 2 + 0.25) % 0.5 - 0.25) * 4;
        this.phase += frequency / sampleRate;

        if (this.phase > 1) {
            this.phase %= 1;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Saw';
    }

});