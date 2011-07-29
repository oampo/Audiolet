/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Filter for leaking DC offset.  Maths is taken from
 * https://ccrma.stanford.edu/~jos/filters/DC_Blocker.html
 *
 * **Inputs**
 *
 * - Audio
 * - Filter coefficient
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - coefficient The filter coefficient.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [coefficient=0.995] The initial coefficient.
 */
var DCFilter = function(audiolet, coefficient) {
    AudioletNode.call(this, audiolet, 2, 1);

    // Same number of output channels as input channels
    this.linkNumberOfOutputChannels(0, 0);

    this.coefficient = new AudioletParameter(this, 1, coefficient || 0.995);

    // Delayed values
    this.xValues = [];
    this.yValues = [];
};
extend(DCFilter, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
DCFilter.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var xValues = this.xValues;
    var yValues = this.yValues;

    // Local processing variables
    var coefficientParameter = this.coefficient;
    var coefficient, coefficientChannel;
    if (coefficientParameter.isStatic()) {
        coefficient = coefficientParameter.getValue();
    }
    else {
        coefficientChannel = coefficientParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.channels.length;
    var bufferLength = outputBuffer.length;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.channels[i];
        var outputChannel = outputBuffer.channels[i];

        if (i >= xValues.length) {
            xValues.push(0);
        }
        if (i >= yValues.length) {
            yValues.push(0);
        }

        var lastX = xValues[i];
        var lastY = yValues[i];

        for (var j = 0; j < bufferLength; j++) {
            if (coefficientChannel) {
                var coefficient = coefficientChannel[j];
            }

            var x0 = inputChannel[j];
            var y0 = x0 - lastX + coefficient * lastY;

            outputChannel[j] = y0;

            lastX = x0;
            lastY = y0;
        }
        xValues[i] = lastX;
        yValues[i] = lastY;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
DCFilter.prototype.toString = function() {
    return 'DC Filter';
};
