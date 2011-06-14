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
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [attack=0.01] The initial attack time in seconds.
 * @param {Number} [release=0.01] The initial release time in seconds.
 */
var Amplitude = function(audiolet, attack, release) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);

    this.followers = [];
    var sampleRate = this.audiolet.device.sampleRate;

    //        attack = Math.pow(0.01, 1 / (attack * sampleRate));
    this.attack = new AudioletParameter(this, 1, attack || 0.01);

    //        release = Math.pow(0.01, 1 / (release * sampleRate));
    this.release = new AudioletParameter(this, 2, release || 0.01);
};
extend(Amplitude, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Amplitude.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var followers = this.followers;
    var numberOfFollowers = followers.length;

    // Local processing variables
    var attackParameter = this.attack;
    var attack, attackChannel;
    if (attackParameter.isStatic()) {
        attack = attackParameter.getValue();
    }
    else {
        attackChannel = attackParameter.getChannel();
    }

    // Local processing variables
    var releaseParameter = this.release;
    var release, releaseChannel;
    if (releaseParameter.isStatic()) {
        release = releaseParameter.getValue();
    }
    else {
        releaseChannel = releaseParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i > numberOfFollowers) {
            followers.push(0);
        }
        var follower = followers[i];

        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = inputChannel[j];
            if (attackChannel) {
                attack = attackChannel[j];
            }
            if (releaseChannel) {
                release = releaseChannel[j];
            }
            if (i > follower) {
                follower = attack * (follower - value) + value;
            }
            else {
                follower = release * (follower - value) + value;
            }
            outputChannel[j] = follower;
        }
        followers[i] = follower;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Amplitude.prototype.toString = function() {
    return ('Amplitude');
};
