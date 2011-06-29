/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Oscillator which reads waveform values from a look-up table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Waveform
 *
 * **Parameters**
 *
 * - frequency The oscillator frequency.  Linked to input 0.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] The initial frequency.
 */
var TableLookupOscillator = function(audiolet, table, frequency) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.table = table;
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.phase = 0;
};
extend(TableLookupOscillator, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
TableLookupOscillator.prototype.generate = function(inputBuffers,
                                                    outputBuffers) {
    var buffer = outputBuffers[0];
    var channel = buffer.getChannelData(0);

    // Make processing variables local
    var sampleRate = this.audiolet.device.sampleRate;
    var table = this.table;
    var tableSize = table.length;
    var phase = this.phase;
    var frequencyParameter = this.frequency;
    var frequency, frequencyChannel;
    if (frequencyParameter.isStatic()) {
        frequency = frequencyParameter.getValue();
    }
    else {
        frequencyChannel = frequencyParameter.getChannel();
    }

    // Processing loop
    var bufferLength = buffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (frequencyChannel) {
            frequency = frequencyChannel[i];
        }
        var step = frequency * tableSize / sampleRate;
        phase += step;
        if (phase >= tableSize) {
            phase %= tableSize;
        }
        channel[i] = table[Math.floor(phase)];
    }
    this.phase = phase;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
TableLookupOscillator.prototype.toString = function() {
    return 'Table Lookup Oscillator';
};

