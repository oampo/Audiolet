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
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [pan=0.5] The initial pan position.
 */
var Pan = function(audiolet, pan) {
    AudioletNode.call(this, audiolet, 2, 1);
    // Hardcode two output channels
    this.setNumberOfOutputChannels(0, 2);
    if (pan == null) {
        var pan = 0.5;
    }
    this.pan = new AudioletParameter(this, 1, pan);
};
extend(Pan, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Pan.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var inputChannel = inputBuffer.getChannelData(0);
    var leftOutputChannel = outputBuffer.getChannelData(0);
    var rightOutputChannel = outputBuffer.getChannelData(1);

    // Local processing variables
    var panParameter = this.pan;
    var pan, panChannel;
    if (panParameter.isStatic()) {
        pan = panParameter.getValue();
    }
    else {
        panChannel = panParameter.getChannel();
    }

    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (panChannel) {
            pan = panChannel[i];
        }
        var scaledPan = pan * Math.PI / 2;
        var value = inputChannel[i];
        // TODO: Use sine/cos tables?
        leftOutputChannel[i] = value * Math.cos(scaledPan);
        rightOutputChannel[i] = value * Math.sin(scaledPan);
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Pan.prototype.toString = function() {
    return 'Stereo Panner';
};
