var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Filter for leaking DC offset.  Maths is taken from
 * https://ccrma.stanford.edu/~jos/filters/DC_Blocker.html
 *
 * **Inputs**
 *
 * - Audio
 * - Filter coefficient
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - coefficient The filter coefficient.  Linked to input 1.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [coefficient=0.995] The initial coefficient.
 */
var DCFilter = function(context, coefficient) {
    Node.call(this, context, 2, 1);

    // Same number of output channels as input channels
    this.linkNumberOfOutputChannels(0, 0);

    this.coefficient = new Parameter(this, 1, coefficient || 0.995);

    // Delayed values
    this.xValues = [];
    this.yValues = [];
};
DCFilter.prototype = Object.create(Node.prototype);
DCFilter.prototype.constructor = DCFilter;

/**
 * Process samples
 */
DCFilter.prototype.generate = function() {
    var coefficient = this.coefficient.getValue();
    var input = this.inputs[0];
    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= this.xValues.length) {
            this.xValues.push(0);
        }
        if (i >= this.yValues.length) {
            this.yValues.push(0);
        }

        var x0 = input.samples[i];
        var y0 = x0 - this.xValues[i] + coefficient * this.yValues[i];

        this.outputs[0].samples[i] = y0;

        this.xValues[i] = x0;
        this.yValues[i] = y0;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
DCFilter.prototype.toString = function() {
    return 'DC Filter';
};

module.exports = DCFilter;
