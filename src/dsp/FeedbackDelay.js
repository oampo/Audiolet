/*!
 * @depends ../core/AudioletNode.js
 */

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
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 * @param {Number} feedabck The initial feedback amount.
 * @param {Number} mix The initial mix amount.
 */
var FeedbackDelay = function(audiolet, maximumDelayTime, delayTime, feedback,
                             mix) {
    AudioletNode.call(this, audiolet, 4, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
    this.feedback = new AudioletParameter(this, 2, feedback || 0.5);
    this.mix = new AudioletParameter(this, 3, mix || 1);
    var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
    this.buffers = [];
    this.readWriteIndex = 0;
};
extend(FeedbackDelay, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
FeedbackDelay.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    // Local processing variables
    var maximumDelayTime = this.maximumDelayTime;
    var sampleRate = this.audiolet.device.sampleRate;

    var delayTimeParameter = this.delayTime;
    var delayTime, delayTimeChannel;
    if (delayTimeParameter.isStatic()) {
        delayTime = Math.floor(delayTimeParameter.getValue() * sampleRate);
    }
    else {
        delayTimeChannel = delayTimeParameter.getChannel();
    }

    var feedbackParameter = this.feedback;
    var feedback, feedbackChannel;
    if (feedbackParameter.isStatic()) {
        feedback = feedbackParameter.getValue();
    }
    else {
        feedbackChannel = feedbackParameter.getChannel();
    }

    var mixParameter = this.mix;
    var mix, mixChannel;
    if (mixParameter.isStatic()) {
        mix = mixParameter.getValue();
    }
    else {
        mixChannel = mixParameter.getChannel();
    }


    var buffers = this.buffers;
    var readWriteIndex = this.readWriteIndex;

    var inputChannels = inputBuffer.channels;
    var outputChannels = outputBuffer.channels;
    var numberOfChannels = inputBuffer.numberOfChannels;
    var numberOfBuffers = buffers.length;
    for (var i = numberOfBuffers; i < numberOfChannels; i++) {
        // Create buffer for channel if it doesn't already exist
        var bufferSize = maximumDelayTime * sampleRate;
        buffers.push(new Float32Array(bufferSize));
    }


    var bufferLength = inputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (delayTimeChannel) {
            delayTime = Math.floor(delayTimeChannel[i] * sampleRate);
        }
        if (feedbackChannel) {
            feedback = feedbackChannel[i];
        }
        if (mixChannel) {
            mix = mixChannel[i];
        }

        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannel = inputChannels[j];
            var outputChannel = outputChannels[j];
            var buffer = buffers[j];
            var input;
            if (!inputBuffer.isEmpty) {
                input = inputChannel[i];
            }
            else {
                input = 0;
            }
            var output = buffer[readWriteIndex];
            outputChannel[i] = mix * output + (1 - mix) * input;
            buffer[readWriteIndex] = input + feedback * output;
        }

        readWriteIndex += 1;
        if (readWriteIndex >= delayTime) {
            readWriteIndex = 0;
        }
    }
    this.readWriteIndex = readWriteIndex;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
FeedbackDelay.prototype.toString = function() {
    return 'Feedback Delay';
};
