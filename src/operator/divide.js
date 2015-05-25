var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Divide values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Divided audio
 *
 * **Parameters**
 *
 * - value The value to divide by.  Linked to input 1.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [value=1] The initial value to divide by.
 */
var Divide = function(context, value) {
    Node.call(this, context, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new Parameter(this, 1, value || 1);
};
Divide.prototype = Object.create(Node.prototype);
Divide.prototype.constructor = Node;

/**
 * Process samples
 */
Divide.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var value = this.value.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] / value;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Divide.prototype.toString = function() {
    return 'Divide';
};


module.exports = Divide;
