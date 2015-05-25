var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Exponential lag for smoothing signals.
 *
 * **Inputs**
 *
 * - Value
 * - Lag time
 *
 * **Outputs**
 *
 * - Lagged value
 *
 * **Parameters**
 *
 * - value The value to lag.  Linked to input 0.
 * - lag The 60dB lag time. Linked to input 1.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [value=0] The initial value.
 * @param {Number} [lagTime=1] The initial lag time.
 */
var Lag = function(context, value, lagTime) {
    Node.call(this, context, 2, 1);
    this.value = new Parameter(this, 0, value || 0);
    this.lag = new Parameter(this, 1, lagTime || 1);
    this.lastValue = 0;

    this.log001 = Math.log(0.001);
};
Lag.prototype = Object.create(Node.prototype);
Lag.prototype.constructor = Lag;

/**
 * Process samples
 */
Lag.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.context.device.sampleRate;

    var value = this.value.getValue();
    var lag = this.lag.getValue();
    var coefficient = Math.exp(this.log001 / (lag * sampleRate));

    var outputValue = ((1 - coefficient) * value) +
                      (coefficient * this.lastValue);
    output.samples[0] = outputValue;
    this.lastValue = outputValue;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Lag.prototype.toString = function() {
    return 'Lag';
};


module.exports = Lag;
