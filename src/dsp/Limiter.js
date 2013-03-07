/*!
 * @depends ../core/AudioletGroup.js
 */

/**
 * A simple (and frankly shoddy) zero-lookahead limiter.
 *
 * **Inputs**
 *
 * - Audio
 * - Threshold
 * - Attack
 * - Release
 *
 * **Outputs**
 *
 * - Limited audio
 *
 * **Parameters**
 *
 * - threshold The limiter threshold.  Linked to input 1.
 * - attack The attack time in seconds. Linked to input 2.
 * - release The release time in seconds.  Linked to input 3.
 */
var Limiter = AudioletNode.extend({

    parameters: {
        threshold: [1, 0.95],
        attack: [2, 0.01],
        release: [3, 0.4]
    },

    /**
     * Constructor
     *
     * @extends AudioletGroup
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [threshold=0.95] The initial threshold.
     * @param {Number} [attack=0.01] The initial attack time.
     * @param {Number} [release=0.4] The initial release time.
     */
    constructor: function(audiolet, threshold, attack, release) {
        AudioletNode.call(this, audiolet, 4, 1, {
            threshold: threshold,
            attack: attack,
            release: release
        });
        this.linkNumberOfOutputChannels(0, 0);

        this.followers = [];
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.device.sampleRate;

        // Local processing variables
        var attack = Math.pow(0.01, 1 / (this.attack.getValue() *
                                         sampleRate));
        var release = Math.pow(0.01, 1 / (this.release.getValue() *
                                          sampleRate));

        var threshold = this.threshold.getValue();

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.followers.length) {
                this.followers.push(0);
            }

            var follower = this.followers[i];

            var value = input.samples[i];

            // Calculate amplitude envelope
            var absValue = Math.abs(value);
            if (absValue > follower) {
                follower = attack * (follower - absValue) + absValue;
            }
            else {
                follower = release * (follower - absValue) + absValue;
            }
            
            var diff = follower - threshold;
            if (diff > 0) {
                output.samples[i] = value / (1 + diff);
            }
            else {
                output.samples[i] = value;
            }

            this.followers[i] = follower;
        }
    },


    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Limiter';
    }

});