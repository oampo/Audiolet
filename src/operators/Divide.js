/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Divide values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Divided audio
 *
 * **Parameters**
 *
 * - value The value to divide by.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [value=1] The initial value to divide by.
 */
var Divide = function(audiolet, value) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new AudioletParameter(this, 1, value || 1);
};
extend(Divide, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Divide.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var valueParameter = this.value;
    var value, valueChannel;
    if (valueParameter.isStatic()) {
        value = valueParameter.getValue();
    }
    else {
        valueChannel = valueParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (valueChannel) {
                value = valueChannel[j];
            }
            outputChannel[j] = inputChannel[j] / value;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Divide.prototype.toString = function() {
    return 'Divide';
};

