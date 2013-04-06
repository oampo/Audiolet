/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Position a single-channel input in stereo space
 *
 * **Inputs**
 *
 * - Audio
 * - Pan Position
 *
 * **Outputs**
 *
 * - Panned audio
 *
 * **Parameters**
 *
 * - pan The pan position.  Values between 0 (hard-left) and 1 (hard-right).
 * Linked to input 1.
 */
var Pan = AudioletNode.extend({

    parameters: {
        pan: [1, 0.5]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [pan=0.5] The initial pan position.
     */
    constructor: function(audiolet, pan) {
        AudioletNode.call(this, audiolet, 2, 1, {
            pan: pan
        });
        // Hardcode two output channels
        this.setNumberOfOutputChannels(0, 2);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var pan = this.get('pan');

        var value = input.samples[0] || 0;
        var scaledPan = pan * Math.PI / 2;
        output.samples[0] = value * Math.cos(scaledPan);
        output.samples[1] = value * Math.sin(scaledPan);
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Stereo Panner';
    }

});