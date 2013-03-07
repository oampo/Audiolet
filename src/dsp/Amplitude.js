/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Amplitude envelope follower
 *
 * **Inputs**
 *
 * - Audio
 * - Attack time
 * - Release time
 *
 * **Outputs**
 *
 * - Amplitude envelope
 *
 * **Parameters**
 *
 * - attack The attack time of the envelope follower.  Linked to input 1.
 * - release The release time of the envelope follower.  Linked to input 2.
 */
var Amplitude  = AudioletNode.extend({

    parameters: {
        attack: [1, 0.01],
        release: [2, 0.01]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [attack=0.01] The initial attack time in seconds.
     * @param {Number} [release=0.01] The initial release time in seconds.
     */
    constructor: function(audiolet, attack, release) {
        AudioletNode.call(this, audiolet, 3, 1, {
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

        var followers = this.followers;
        var numberOfFollowers = followers.length;

        var sampleRate = this.audiolet.device.sampleRate;

        // Local processing variables
        var attack = this.attack.getValue();
        attack = Math.pow(0.01, 1 / (attack * sampleRate));
        var release = this.release.getValue();
        release = Math.pow(0.01, 1 / (release * sampleRate));

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= numberOfFollowers) {
                followers.push(0);
            }
            var follower = followers[i];

            var value = Math.abs(input.samples[i]);
            if (value > follower) {
                follower = attack * (follower - value) + value;
            }
            else {
                follower = release * (follower - value) + value;
            }
            output.samples[i] = follower;
            followers[i] = follower;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return ('Amplitude');
    }

});