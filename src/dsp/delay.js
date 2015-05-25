var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * A simple delay line.
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 *
 * **Outputs**
 *
 * - Delayed audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 */
var Delay = function(context, maximumDelayTime, delayTime) {
    Node.call(this, context, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new Parameter(this, 1, delayTime || 1);
    var bufferSize = maximumDelayTime * this.context.device.sampleRate;
    this.buffers = [];
    this.readWriteIndex = 0;
};
Delay.prototype = Object.create(Node.prototype);
Delay.prototype.constructor = Delay;

/**
 * Process samples
 */
Delay.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.context.device.sampleRate;

    var delayTime = this.delayTime.getValue() * sampleRate;

    var numberOfChannels = input.samples.length;

    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= this.buffers.length) {
            var bufferSize = this.maximumDelayTime * sampleRate;
            this.buffers.push(new Float32Array(bufferSize));
        }

        var buffer = this.buffers[i];
        output.samples[i] = buffer[this.readWriteIndex];
        buffer[this.readWriteIndex] = input.samples[i];
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
Delay.prototype.toString = function() {
    return 'Delay';
};

module.exports = Delay;
