/*!
 * @depends ../core/AudioletNode.js
 */

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
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 * @param {Number} decayTime The initial decay time.
 */
var CombFilter = function(audiolet, maximumDelayTime, delayTime, decayTime) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
    this.decayTime = new AudioletParameter(this, 2, decayTime);
    var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
    this.buffers = [];
    this.readWriteIndex = 0;
};
extend(CombFilter, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
CombFilter.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

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

    var decayTimeParameter = this.decayTime;
    var decayTime, decayTimeChannel;
    if (decayTimeParameter.isStatic()) {
        decayTime = Math.floor(decayTimeParameter.getValue() * sampleRate);
    }
    else {
        decayTimeChannel = decayTimeParameter.getChannel();
    }


    var feedback;
    if (delayTimeParameter.isStatic() && decayTimeParameter.isStatic()) {
        feedback = Math.exp(-3 * delayTime / decayTime);
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

        if (decayTimeChannel) {
            decayTime = Math.floor(decayTimeChannel[i] * sampleRate);
        }

        if (delayTimeChannel || decayTimeChannel) {
            feedback = Math.exp(-3 * delayTime / decayTime);
        }

        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannel = inputChannels[j];
            var outputChannel = outputChannels[j];
            var buffer = buffers[j];
            var output = buffer[readWriteIndex];
            outputChannel[i] = output;
            buffer[readWriteIndex] = inputChannel[i] +
                                     feedback * output;
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
CombFilter.prototype.toString = function() {
    return 'Comb Filter';
};
