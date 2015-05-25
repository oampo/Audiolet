var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Subtract values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Subtracted audio
 *
 * **Parameters**
 *
 * - value The value to subtract.  Linked to input 1.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [value=0] The initial value to subtract.
 */
var Subtract = function(context, value) {
    Node.call(this, context, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new Parameter(this, 1, value || 0);
};
Subtract.prototype = Object.create(Node.prototype);
Subtract.prototype.constructor = Node;

/**
 * Process samples
 */
Subtract.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var value = this.value.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] - value;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Subtract.prototype.toString = function() {
    return 'Subtract';
};


module.exports = Subtract;
