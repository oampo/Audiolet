/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Pulse wave oscillator.
 *
 * **Inputs**
 *
 * - Frequency
 * - Pulse width
 *
 * **Outputs**
 *
 * - Waveform
 *
 * **Parameters**
 *
 * - frequency The oscillator frequency.  Linked to input 0.
 * - pulseWidth The pulse width.  Linked to input 1.
 */
var Pulse = AudioletNode.extend({

    parameters: {
        frequency: [0, 440],
        pulseWidth: [1, 0.5]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [frequency=440] The initial frequency.
     * @param {Number} [pulseWidth=0.5] The initial pulse width.
     */
    constructor: function(audiolet, frequency, pulseWidth) {
        AudioletNode.call(this, audiolet, 2, 1, {
            frequency: frequency,
            pulseWidth: pulseWidth
        });
        this.phase = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var pulseWidth = this.pulseWidth.getValue();
        this.outputs[0].samples[0] = (this.phase < pulseWidth) ? 1 : -1;

        var frequency = this.frequency.getValue();
        var sampleRate = this.audiolet.device.sampleRate;
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
        return 'Pulse';
    }

});