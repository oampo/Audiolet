/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Exponential lag for smoothing signals.
 *
 * **Inputs**
 *
 * - Value
 * - Lag time
 *
 * **Outputs**
 *
 * - Lagged value
 *
 * **Parameters**
 *
 * - value The value to lag.  Linked to input 0.
 * - lag The 60dB lag time. Linked to input 1.
 */
var Lag = AudioletNode.extend({

    defaults: {
        value: [0, 0],
        lag: [1, 1]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
      * @param {Number} [value=0] The initial value.
     * @param {Number} [lag=1] The initial lag time.
     */
    constructor: function(audiolet, value, lag) {
        AudioletNode.call(this, audiolet, 2, 1, {
            value: value,
            lag: lag
        });
        this.lastValue = 0;

        this.log001 = Math.log(0.001);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.device.sampleRate;

        var value = this.get('value');
        var lag = this.get('lag');
        var coefficient = Math.exp(this.log001 / (lag * sampleRate));

        var outputValue = ((1 - coefficient) * value) +
                          (coefficient * this.lastValue);
        output.samples[0] = outputValue;
        this.lastValue = outputValue;
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Lag';
    }

});