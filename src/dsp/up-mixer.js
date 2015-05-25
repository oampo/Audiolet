var Node = require('../core/node');

/**
 * Upmix an input to a constant number of output channels
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Upmixed audio
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} outputChannels The number of output channels.
 */
var UpMixer = function(context, outputChannels) {
    Node.call(this, context, 1, 1);
    this.outputs[0].numberOfChannels = outputChannels;
};
UpMixer.prototype = Object.create(Node.prototype);
UpMixer.prototype.constructor = UpMixer;

/**
 * Process samples
 */
UpMixer.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var numberOfInputChannels = input.samples.length;
    var numberOfOutputChannels = output.samples.length;

    if (numberOfInputChannels == numberOfOutputChannels) {
        output.samples = input.samples;
    }
    else {
        for (var i = 0; i < numberOfOutputChannels; i++) {
            output.samples[i] = input.samples[i % numberOfInputChannels];
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
UpMixer.prototype.toString = function() {
    return 'UpMixer';
};


module.exports = UpMixer;
