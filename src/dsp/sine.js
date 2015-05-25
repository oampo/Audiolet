var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Sine wave oscillator
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Sine wave
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
var Sine = function(context, frequency) {
    Node.call(this, context, 1, 1);
    this.frequency = new Parameter(this, 0, frequency || 440);
    this.phase = 0;
};
Sine.prototype = Object.create(Node.prototype);
Sine.prototype.constructor = Sine;

/**
 * Process samples
 */
Sine.prototype.generate = function() {
    var output = this.outputs[0];

    var frequency = this.frequency.getValue();
    var sampleRate = this.context.device.sampleRate;

    output.samples[0] = Math.sin(this.phase);

    this.phase += 2 * Math.PI * frequency / sampleRate;
    if (this.phase > 2 * Math.PI) {
        this.phase %= 2 * Math.PI;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Sine.prototype.toString = function() {
    return 'Sine';
};


module.exports = Sine;
