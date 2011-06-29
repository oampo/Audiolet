/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A type of AudioletNode designed to allow AudioletGroups to exactly replicate
 * the behaviour of AudioletParameters.  By linking one of the group's inputs
 * to the ParameterNode's input, and calling `this.parameterName =
 * parameterNode` in the group's constructor, `this.parameterName` will behave
 * as if it were an AudioletParameter contained within an AudioletNode.
 *
 * **Inputs**
 *
 * - Parameter input
 *
 * **Outputs**
 *
 * - Parameter value
 *
 * **Parameters**
 *
 * - parameter The contained parameter.  Linked to input 0.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} value The initial static value of the parameter.
 */
var ParameterNode = function(audiolet, value) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.parameter = new AudioletParameter(this, 0, value);
};
extend(ParameterNode, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
ParameterNode.prototype.generate = function(inputBuffers, outputBuffers) {
    var outputBuffer = outputBuffers[0];
    var outputChannel = outputBuffer.channels[0];

    // Local processing variables
    var parameterParameter = this.parameter;
    var parameter, parameterChannel;
    if (parameterParameter.isStatic()) {
        parameter = parameterParameter.getValue();
    }
    else {
        parameterChannel = parameterParameter.getChannel();
    }


    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (parameterChannel) {
            parameter = parameterChannel[i];
        }
        outputChannel[i] = parameter;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
ParameterNode.prototype.toString = function() {
    return 'Parameter Node';
};
