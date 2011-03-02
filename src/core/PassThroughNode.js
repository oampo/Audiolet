/**
 * @depends AudioletNode.js
 */

var PassThroughNode = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, numberOfInputs, numberOfOutputs) {
        AudioletNode.prototype.initialize.apply(this, [audiolet,
                                                       numberOfInputs,
                                                       numberOfOutputs]);
    },

    createOutputBuffers: function(length) {
        var outputBuffers = [];
        var numberOfOutputs = this.numberOfOutputs;
        var numberOfInputs = this.numberOfInputs;
        // Copy the inputs buffers straight to the output buffers
        for (var i = 0; i < numberOfOutputs; i++) {
            var output = this.outputs[i];
            if (i < numberOfInputs) {
                // Copy the input buffer straight to the output buffers
                var input = this.inputs[i];
                output.buffer = input.buffer;
            }
            else {
                output.buffer.resize(output.getNumberOfChannels(), length);
            }
            outputBuffers.push(output.buffer);
        }
        return (outputBuffers);
    },

    toString: function() {
        return 'Pass Through Node';
    }
});

