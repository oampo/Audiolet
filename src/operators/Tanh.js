/**
 * @depends ../core/AudioletNode.js
 */

/**
 * Hyperbolic tangent of values.  Works nicely as a distortion function.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Tanh audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 */

var Tanh = function(audiolet) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
};
extend(Tanh, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Tanh.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = inputChannel[j];
            outputChannel[j] = (Math.exp(value) - Math.exp(-value)) /
                (Math.exp(value) + Math.exp(-value));
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Tanh.prototype.toString = function() {
    return ('Tanh');
};

