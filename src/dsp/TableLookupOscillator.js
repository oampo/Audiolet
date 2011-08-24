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
 */
TableLookupOscillator.prototype.generate = function() {
    this.outputs[0].samples[0] = this.table[Math.floor(this.phase)];

    var sampleRate = this.audiolet.device.sampleRate;
    var frequency = this.frequency.getValue();
    var tableSize = this.table.length;

    this.phase += frequency * tableSize / sampleRate;
    if (this.phase > tableSize) {
        this.phase %= tableSize;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
TableLookupOscillator.prototype.toString = function() {
    return 'Table Lookup Oscillator';
};

