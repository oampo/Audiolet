/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Square wave oscillator
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Square wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Square = function(audiolet, frequency) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.phase = 0;
};
extend(Square, AudioletNode);

/**
 * Process samples
 */
Square.prototype.generate = function() {
    var output = this.outputs[0];

    var frequency = this.frequency.getValue();
    var sampleRate = this.audiolet.device.sampleRate;

    output.samples[0] = this.phase > 0.5 ? 1 : -1;

    this.phase += frequency / sampleRate;
    if (this.phase > 1) {
        this.phase %= 1;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Square.prototype.toString = function() {
    return 'Square';
};

