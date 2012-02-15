/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Sine wave oscillator
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Sine wave
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
var Sine = function(audiolet, frequency) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.phase = 0;
};
extend(Sine, AudioletNode);

/**
 * Process samples
 */
Sine.prototype.generate = function() {
    var output = this.outputs[0];

    var frequency = this.frequency.getValue();
    var sampleRate = this.audiolet.device.sampleRate;

    output.samples[0] = Math.sin(this.phase);

    this.phase += 2 * Math.PI * frequency / sampleRate;
    if (this.phase > 2 * Math.PI) {
        this.phase %= 2 * Math.PI;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Sine.prototype.toString = function() {
    return 'Sine';
};

