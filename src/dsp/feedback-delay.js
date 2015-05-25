var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Delay line with feedback
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Feedback
 * - Mix
 *
 * **Outputs**
 *
 * - Delayed audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - feedback The amount of feedback.  Linked to input 2.
 * - mix The amount of delay to mix into the dry signal.  Linked to input 3.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 * @param {Number} feedabck The initial feedback amount.
 * @param {Number} mix The initial mix amount.
 */
var FeedbackDelay = function(context, maximumDelayTime, delayTime, feedback,
                             mix) {
    Node.call(this, context, 4, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new Parameter(this, 1, delayTime || 1);
    this.feedback = new Parameter(this, 2, feedback || 0.5);
    this.mix = new Parameter(this, 3, mix || 1);
    var bufferSize = maximumDelayTime * this.context.device.sampleRate;
    this.buffers = [];
    this.readWriteIndex = 0;
};
FeedbackDelay.prototype = Object.create(Node.prototype);
FeedbackDelay.prototype.constructor = FeedbackDelay;

/**
 * Process samples
 */
FeedbackDelay.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.context.output.device.sampleRate;

    var delayTime = this.delayTime.getValue() * sampleRate;
    var feedback = this.feedback.getValue();
    var mix = this.mix.getValue();

    var numberOfChannels = input.samples.length;
    var numberOfBuffers = this.buffers.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= numberOfBuffers) {
            // Create buffer for channel if it doesn't already exist
            var bufferSize = this.maximumDelayTime * sampleRate;
            this.buffers.push(new Float32Array(bufferSize));
        }

        var buffer = this.buffers[i];

        var inputSample = input.samples[i];
        var bufferSample = buffer[this.readWriteIndex];

        output.samples[i] = mix * bufferSample + (1 - mix) * inputSample;
        buffer[this.readWriteIndex] = inputSample + feedback * bufferSample;
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
FeedbackDelay.prototype.toString = function() {
    return 'Feedback Delay';
};

module.exports = FeedbackDelay;
