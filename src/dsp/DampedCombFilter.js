/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Damped comb filter
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Decay Time
 * - Damping
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - decayTime Time for the echoes to decay by 60dB.  Linked to input 2.
 * - damping The amount of high-frequency damping of echoes.  Linked to input 3.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 * @param {Number} decayTime The initial decay time.
 * @param {Number} damping The initial amount of damping.
 */
var DampedCombFilter = function(audiolet, maximumDelayTime, delayTime,
                                decayTime, damping) {
    AudioletNode.call(this, audiolet, 4, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
    this.decayTime = new AudioletParameter(this, 2, decayTime);
    this.damping = new AudioletParameter(this, 3, damping);
    var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
    this.buffers = [];
    this.readWriteIndex = 0;
    this.filterStore = 0;
};
extend(DampedCombFilter, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
DampedCombFilter.prototype.generate = function(inputBuffers, outputBuffers) {
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

    var dampingParameter = this.damping;
    var damping, dampingChannel;
    if (dampingParameter.isStatic()) {
        damping = dampingParameter.getValue();
    }
    else {
        dampingChannel = dampingParameter.getChannel();
    }


    var feedback;
    if (delayTimeParameter.isStatic() && decayTimeParameter.isStatic()) {
        feedback = Math.exp(-3 * delayTime / decayTime);
    }



    var buffers = this.buffers;
    var readWriteIndex = this.readWriteIndex;
    var filterStore = this.filterStore;

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

        if (dampingChannel) {
            damping = dampingChannel[i];
        }

        if (delayTimeChannel || decayTimeChannel) {
            feedback = Math.exp(-3 * delayTime / decayTime);
        }

        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannel = inputChannels[j];
            var outputChannel = outputChannels[j];
            var buffer = buffers[j];
            var output = buffer[readWriteIndex];
            filterStore = (output * (1 - damping)) +
                          (filterStore * damping);
            outputChannel[i] = output;
            buffer[readWriteIndex] = inputChannel[i] +
                                     feedback * filterStore;
        }

        readWriteIndex += 1;
        if (readWriteIndex >= delayTime) {
            readWriteIndex = 0;
        }
    }
    this.readWriteIndex = readWriteIndex;
    this.filterStore = filterStore;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
DampedCombFilter.prototype.toString = function() {
    return 'Damped Comb Filter';
};
