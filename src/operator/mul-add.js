var Node = require('../core/node');
var Parameter = require('../core/parameter');

/*
 * Multiply and add values
 *
 * **Inputs**
 *
 * - Audio
 * - Multiply audio
 * - Add audio
 *
 * **Outputs**
 *
 * - MulAdded audio
 *
 * **Parameters**
 *
 * - mul The value to multiply by.  Linked to input 1.
 * - add The value to add.  Linked to input 2.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [mul=1] The initial value to multiply by.
 * @param {Number} [add=0] The initial value to add.
 */
var MulAdd = function(context, mul, add) {
    Node.call(this, context, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.mul = new Parameter(this, 1, mul || 1);
    this.add = new Parameter(this, 2, add || 0);
};
MulAdd.prototype = Object.create(Node.prototype);
MulAdd.prototype.constructor = Node;

/**
 * Process samples
 */
MulAdd.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var mul = this.mul.getValue();
    var add = this.add.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] * mul + add;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
MulAdd.prototype.toString = function() {
    return 'Multiplier/Adder';
};

module.exports = MulAdd;

