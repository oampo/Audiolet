var Node = require('../core/node');

/**
 * Reciprocal (1/x) of values
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Reciprocal audio
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 */
var Reciprocal = function(context) {
    Node.call(this, context, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
};
Reciprocal.prototype = Object.create(Node.prototype);
Reciprocal.prototype.constructor = Node;

/**
 * Process samples
 */
Reciprocal.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = 1 / input.samples[i];
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Reciprocal.prototype.toString = function() {
    return 'Reciprocal';
};


module.exports = Reciprocal;
