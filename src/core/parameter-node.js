var Node = require('./node');
var Parameter = require('./parameter');

/**
 * A type of Node designed to allow Groups to exactly replicate
 * the behaviour of Parameters.  By linking one of the group's inputs
 * to the ParameterNode's input, and calling `this.parameterName =
 * parameterNode` in the group's constructor, `this.parameterName` will behave
 * as if it were an Parameter contained within an Node.
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
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} value The initial static value of the parameter.
 */
var ParameterNode = function(context, value) {
    Node.call(this, context, 1, 1);
    this.parameter = new Parameter(this, 0, value);
};
ParameterNode.prototype = Object.create(Node.prototype);
ParameterNode.prototype.constructor = Node;

/**
 * Process samples
 */
ParameterNode.prototype.generate = function() {
    this.outputs[0].samples[0] = this.parameter.getValue();
};

/**
 * toString
 *
 * @return {String} String representation.
 */
ParameterNode.prototype.toString = function() {
    return 'Parameter Node';
};

module.exports = ParameterNode;
