var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Undamped comb filter
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Decay Time
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - decayTime Time for the echoes to decay by 60dB.  Linked to input 0.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 * @param {Number} decayTime The initial decay time.
 */
var CombFilter = function(context, maximumDelayTime, delayTime, decayTime) {
    Node.call(this, context, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new Parameter(this, 1, delayTime || 1);
    this.decayTime = new Parameter(this, 2, decayTime);
    this.buffers = [];
    this.readWriteIndex = 0;
};
CombFilter.prototype = Object.create(Node.prototype);
CombFilter.prototype.constructor = CombFilter;

/**
 * Process samples
 */
CombFilter.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.context.device.sampleRate;

    var delayTime = this.delayTime.getValue() * sampleRate;
    var decayTime = this.decayTime.getValue() * sampleRate;
    var feedback = Math.exp(-3 * delayTime / decayTime);

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= this.buffers.length) {
            // Create buffer for channel if it doesn't already exist
            var bufferSize = this.maximumDelayTime * sampleRate;
            this.buffers.push(new Float32Array(bufferSize));
        }

        var buffer = this.buffers[i];
        var outputValue = buffer[this.readWriteIndex];
        output.samples[i] = outputValue;
        buffer[this.readWriteIndex] = input.samples[i] + feedback * outputValue;
    }

    this.readWriteIndex += 1;
    if (this.readWriteIndex >= delayTime) {
        this.readWriteIndex = 0;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
CombFilter.prototype.toString = function() {
    return 'Comb Filter';
};

module.exports = CombFilter;
