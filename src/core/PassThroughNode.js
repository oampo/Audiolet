/*!
 * @depends AudioletNode.js
 */

/**
 * A specialized type of AudioletNode where values from the inputs are passed
 * straight to the corresponding outputs in the most efficient way possible.
 * PassThroughNodes are used in AudioletGroups to provide the inputs and
 * outputs, and can also be used in analysis nodes where no modifications to
 * the incoming audio are made.
 */
var PassThroughNode = AudioletNode.extend({

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} numberOfInputs The number of inputs.
     * @param {Number} numberOfOutputs The number of outputs.
     */
    constructor: function(audiolet, numberOfInputs, numberOfOutputs) {
        AudioletNode.call(this, audiolet, numberOfInputs, numberOfOutputs);
    },

    /**
     * Create output samples for each channel, copying any input samples to
     * the corresponding outputs.
     */
    createOutputSamples: function() {
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
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Pass Through Node';
    }

});