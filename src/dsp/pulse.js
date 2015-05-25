var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Pulse wave oscillator.
 *
 * **Inputs**
 *
 * - Frequency
 * - Pulse width
 *
 * **Outputs**
 *
 * - Waveform
 *
 * **Parameters**
 *
 * - frequency The oscillator frequency.  Linked to input 0.
 * - pulseWidth The pulse width.  Linked to input 1.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [frequency=440] The initial frequency.
 * @param {Number} [pulseWidth=0.5] The initial pulse width.
 */
var Pulse = function(context, frequency, pulseWidth) {
    Node.call(this, context, 2, 1);
    this.frequency = new Parameter(this, 0, frequency || 440);
    this.pulseWidth = new Parameter(this, 1, pulseWidth || 0.5);
    this.phase = 0;
};
Pulse.prototype = Object.create(Node.prototype);
Pulse.prototype.constructor = Pulse;


/**
 * Process samples
 */
Pulse.prototype.generate = function() {
    var pulseWidth = this.pulseWidth.getValue();
    this.outputs[0].samples[0] = (this.phase < pulseWidth) ? 1 : -1;

    var frequency = this.frequency.getValue();
    var sampleRate = this.context.device.sampleRate;
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
Pulse.prototype.toString = function() {
    return 'Pulse';
};


module.exports = Pulse;
