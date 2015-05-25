var Node = require('./node');

/**
 * A specialized type of Node where values from the inputs are passed
 * straight to the corresponding outputs in the most efficient way possible.
 * PassThroughNodes are used in Groups to provide the inputs and
 * outputs, and can also be used in analysis nodes where no modifications to
 * the incoming audio are made.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} numberOfInputs The number of inputs.
 * @param {Number} numberOfOutputs The number of outputs.
 */
var PassThroughNode = function(context, numberOfInputs, numberOfOutputs) {
    Node.call(this, context, numberOfInputs, numberOfOutputs);
};
PassThroughNode.prototype = Object.create(Node.prototype);
PassThroughNode.prototype.constructor = Node;

/**
 * Create output samples for each channel, copying any input samples to
 * the corresponding outputs.
 */
PassThroughNode.prototype.createOutputSamples = function() {
    var numberOfOutputs = this.outputs.length;
    // Copy the inputs buffers straight to the output buffers
    for (var i = 0; i < numberOfOutputs; i++) {
        var input = this.inputs[i];
        var output = this.outputs[i];
        if (input && input.samples.length != 0) {
            // Copy the input buffer straight to the output buffers
            output.samples = input.samples;
        }
        else {
            // Create the correct number of output samples
            var numberOfChannels = output.getNumberOfChannels();
            if (output.samples.length == numberOfChannels) {
                continue;
            }
            else if (output.samples.length > numberOfChannels) {
                output.samples = output.samples.slice(0, numberOfChannels);
                continue;
            }

            for (var j = output.samples.length; j < numberOfChannels; j++) {
                output.samples[j] = 0;
            }
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
PassThroughNode.prototype.toString = function() {
    return 'Pass Through Node';
};

module.exports = PassThroughNode;
