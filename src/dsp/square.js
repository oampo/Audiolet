var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Square wave oscillator
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Square wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Square = function(context, frequency) {
    Node.call(this, context, 1, 1);
    this.frequency = new Parameter(this, 0, frequency || 440);
    this.phase = 0;
};
Square.prototype = Object.create(Node.prototype);
Square.prototype.constructor = Square;

/**
 * Process samples
 */
Square.prototype.generate = function() {
    var output = this.outputs[0];

    var frequency = this.frequency.getValue();
    var sampleRate = this.context.device.sampleRate;

    output.samples[0] = this.phase > 0.5 ? 1 : -1;

    this.phase += frequency / sampleRate;
    if (this.phase > 1) {
        this.phase %= 1;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Square.prototype.toString = function() {
    return 'Square';
};


module.exports = Square;
