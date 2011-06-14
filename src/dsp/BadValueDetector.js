/*!
 * @depends ../core/PassThroughNode.js
 */

/**
 * Detect potentially hazardous values in the audio stream.  Looks for
 * undefineds, nulls, NaNs and Infinities.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 *
 * @constructor
 * @extends PassThroughNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Function} [callback] Function called if a bad value is detected.
 */
var BadValueDetector = function(audiolet, callback) {
    PassThroughNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);

    if (callback) {
        this.callback = callback;
    }
};
extend(BadValueDetector, PassThroughNode);

/**
 * Default callback.  Logs the value and position of the bad value.
 *
 * @param {Number|Object|'undefined'} value The value detected.
 * @param {Number} channel The index of the channel the value was found in.
 * @param {Number} index The sample index the value was found at.
 */
BadValueDetector.prototype.callback = function(value, channel, index) {
    console.error(value + ' detected at channel ' + channel + ' index ' +
                  index);
};

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
BadValueDetector.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];

    if (inputBuffer.isEmpty) {
        return;
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var channel = inputBuffer.getChannelData(i);

        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = channel[j];
            if (typeof value == 'undefined' ||
                value == null ||
                isNaN(value) ||
                value == Infinity ||
                value == -Infinity) {
                this.callback(value, i, j);
            }
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BadValueDetector.prototype.toString = function() {
    return 'Bad Value Detector';
};
