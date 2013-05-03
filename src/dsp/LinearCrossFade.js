/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Linear cross-fade between two signals
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 * - Fade Position
 *
 * **Outputs**
 *
 * - Mixed audio
 *
 * **Parameters**
 *
 * - position The fade position.  Values between 0 (Audio 1 only) and 1 (Audio
 * 2 only).  Linked to input 2.
 */
var LinearCrossFade = AudioletNode.extend({

    defaults: {
        position: [2, 0.5]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [position=0.5] The initial fade position.
     */
    constructor: function(audiolet, position) {
        AudioletNode.call(this, audiolet, 3, 1, {
            position: position
        });
        this.linkNumberOfOutputChannels(0, 0);
    },

    /**
     * Process samples
     */
    generate: function() {
        var inputA = this.inputs[0];
        var inputB = this.inputs[1];
        var output = this.outputs[0];

        var position = this.get('position');

        var gainA = 1 - position;
        var gainB = position;

        var numberOfChannels = output.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            var valueA = inputA.samples[i] || 0;
            var valueB = inputB.samples[i] || 0;
            output.samples[i] = valueA * gainA + valueB * gainB;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Linear Cross Fader';
    }

});