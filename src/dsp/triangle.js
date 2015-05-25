var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Triangle wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Triangle wave
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
var Triangle = function(context, frequency) {
    Node.call(this, context, 1, 1);
    this.frequency = new Parameter(this, 0, frequency || 440);
    this.phase = 0;
};
Triangle.prototype = Object.create(Node.prototype);
Triangle.prototype.constructor = Triangle;

/**
 * Process samples
 */
Triangle.prototype.generate = function() {
    var output = this.outputs[0];

    var frequency = this.frequency.getValue();
    var sampleRate = this.context.device.sampleRate;

    output.samples[0] = 1 - 4 * Math.abs((this.phase + 0.25) % 1 - 0.5);

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
Triangle.prototype.toString = function() {
    return 'Triangle';
};


module.exports = Triangle;
