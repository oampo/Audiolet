/*!
 * @depends ../core/AudioletNode.js
 */

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
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] The initial frequency.
 * @param {Number} [pulseWidth=0.5] The initial pulse width.
 */
var Pulse = function(audiolet, frequency, pulseWidth) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.pulseWidth = new AudioletParameter(this, 1, pulseWidth || 0.5);
    this.phase = 0;
};
extend(Pulse, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Pulse.prototype.generate = function(inputBuffers, outputBuffers) {
    var buffer = outputBuffers[0];
    var channel = buffer.getChannelData(0);

    // Make processing variables local
    var sampleRate = this.audiolet.device.sampleRate;
    var phase = this.phase;

    var frequencyParameter = this.frequency;
    var frequency, frequencyChannel;
    if (frequencyParameter.isStatic()) {
        frequency = frequencyParameter.getValue();
    }
    else {
        frequencyChannel = frequencyParameter.getChannel();
    }

    var pulseWidthParameter = this.pulseWidth;
    var pulseWidth, pulseWidthChannel;
    if (pulseWidthParameter.isStatic()) {
        pulseWidth = pulseWidthParameter.getValue();
    }
    else {
        pulseWidthChannel = pulseWidthParameter.getChannel();
    }

    // Processing loop
    var bufferLength = buffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (frequencyChannel) {
            frequency = frequencyChannel[i];
        }
        if (pulseWidthChannel) {
            pulseWidth = pulseWidthChannel[i];
        }

        phase += frequency / sampleRate;
        if (phase > 1) {
            phase %= 1;
        }
        channel[i] = (phase < pulseWidth) ? 1 : -1;
    }
    this.phase = phase;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Pulse.prototype.toString = function() {
    return 'Pulse';
};

