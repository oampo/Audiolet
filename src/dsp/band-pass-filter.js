var BiquadFilter = require('./biquad-filter');

/**
 * Band-pass filter
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
 * @param {Audiolet} context The context object.
 * @param {Number} frequency The initial frequency.
 */
var BandPassFilter = function(context, frequency) {
    BiquadFilter.call(this, context, frequency);
};
BandPassFilter.prototype = Object.create(BiquadFilter.prototype);
BandPassFilter.prototype.constructor = BandPassFilter;

/**
 * Calculate the biquad filter coefficients using maths from
 * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
 *
 * @param {Number} frequency The filter frequency.
 */
BandPassFilter.prototype.calculateCoefficients = function(frequency) {
    var w0 = 2 * Math.PI * frequency / this.context.device.sampleRate;
    var cosw0 = Math.cos(w0);
    var sinw0 = Math.sin(w0);
    var alpha = sinw0 / (2 / Math.sqrt(2));

    this.b0 = alpha;
    this.b1 = 0;
    this.b2 = -alpha;
    this.a0 = 1 + alpha;
    this.a1 = -2 * cosw0;
    this.a2 = 1 - alpha;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BandPassFilter.prototype.toString = function() {
    return 'Band Pass Filter';
};

module.exports = BandPassFilter;
