/*!
 * @depends BiquadFilter.js
 */

/**
 * All-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 *
 * @constructor
 * @extends BiquadFilter
 *
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} frequency The initial frequency.
 */
var AllPassFilter = function(audiolet, frequency) {
    BiquadFilter.call(this, audiolet, frequency);
};
extend(AllPassFilter, BiquadFilter);

/**
 * Calculate the biquad filter coefficients using maths from
 * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
 *
 * @param {Number} frequency The filter frequency.
 */
AllPassFilter.prototype.calculateCoefficients = function(frequency) {
    var w0 = 2 * Math.PI * frequency /
             this.audiolet.device.sampleRate;
    var cosw0 = Math.cos(w0);
    var sinw0 = Math.sin(w0);
    var alpha = sinw0 / (2 / Math.sqrt(2));

    this.b0 = 1 - alpha;
    this.b1 = -2 * cosw0;
    this.b2 = 1 + alpha;
    this.a0 = 1 + alpha;
    this.a1 = -2 * cosw0;
    this.a2 = 1 - alpha;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
AllPassFilter.prototype.toString = function() {
    return 'All Pass Filter';
};
