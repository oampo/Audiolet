/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Square wave oscillator
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Square wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 */
var Square = AudioletNode.extend({

    defaults: {
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

        var frequency = this.get('frequency');
        var sampleRate = this.audiolet.device.sampleRate;

        output.samples[0] = this.phase > 0.5 ? 1 : -1;

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
        return 'Square';
    }

});