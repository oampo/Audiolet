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
 *
 * @constructor
 * @extends AudioletGroup
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [threshold=0.95] The initial threshold.
 * @param {Number} [attack=0.01] The initial attack time.
 * @param {Number} [release=0.4] The initial release time.
 */
var Limiter = function(audiolet, threshold, attack, release) {
    AudioletNode.call(this, audiolet, 4, 1);
    this.linkNumberOfOutputChannels(0, 0);

    // Parameters
    this.threshold = new AudioletParameter(this, 1, threshold || 0.95);
    this.attack = new AudioletParameter(this, 2, attack || 0.01);
    this.release = new AudioletParameter(this, 2, release || 0.4);

    this.followers = [];
};
extend(Limiter, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Limiter.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var followers = this.followers;
    var numberOfFollowers = followers.length;

    var sampleRate = this.audiolet.device.sampleRate;

    // Local processing variables
    var attackParameter = this.attack;
    var attack, attackChannel;
    if (attackParameter.isStatic()) {
        attack = Math.pow(0.01, 1 / (attackParameter.getValue() *
                                     sampleRate));
    }
    else {
        attackChannel = attackParameter.getChannel();
    }

    var releaseParameter = this.release;
    var release, releaseChannel;
    if (releaseParameter.isStatic()) {
        release = Math.pow(0.01, 1 / (releaseParameter.getValue() *
                                      sampleRate));
    }
    else {
        releaseChannel = releaseParameter.getChannel();
    } 

    var thresholdParameter = this.threshold;
    var threshold, thresholdChannel;
    if (thresholdParameter.isStatic()) {
        threshold = thresholdParameter.getValue();
    }
    else {
        thresholdChannel = thresholdParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= numberOfFollowers) {
            followers.push(0);
        }
        var follower = followers[i];

        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);

        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            // Get values from channels
            var value = inputChannel[j];
            if (attackChannel) {
                attack = Math.pow(0.01, 1 / (attackChannel[j] * sampleRate));
            }
            if (releaseChannel) {
                release = Math.pow(0.01, 1 / (releaseChannel[j] * sampleRate));
            }
            if (thresholdChannel) {
                threshold = thresholdChannel[j];
            }
            
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
                outputChannel[j] = value / (1 + diff);
            }
            else {
                outputChannel[j] = value;
            }
        }
        followers[i] = follower;
    }
};


/**
 * toString
 *
 * @return {String} String representation.
 */
Limiter.prototype.toString = function() {
    return 'Limiter';
};
