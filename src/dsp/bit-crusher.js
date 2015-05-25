var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Reduce the bitrate of incoming audio
 *
 * **Inputs**
 *
 * - Audio 1
 * - Number of bits
 *
 * **Outputs**
 *
 * - Bit Crushed Audio
 *
 * **Parameters**
 *
 * - bits The number of bit to reduce to.  Linked to input 1.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} bits The initial number of bits.
 */
var BitCrusher = function(context, bits) {
    Node.call(this, context, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.bits = new Parameter(this, 1, bits);
};
BitCrusher.prototype = Object.create(Node.prototype);
BitCrusher.prototype.constructor = BitCrusher;

/**
 * Process samples
 */
BitCrusher.prototype.generate = function() {
    var input = this.inputs[0];

    var maxValue = Math.pow(2, this.bits.getValue()) - 1;

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        this.outputs[0].samples[i] = Math.floor(input.samples[i] * maxValue) /
                                     maxValue;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BitCrusher.prototype.toString = function() {
    return 'BitCrusher';
};

module.exports = BitCrusher;
