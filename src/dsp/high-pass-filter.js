var BiquadFilter = require('./biquad-filter');

/**
 * High-pass filter
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
var HighPassFilter = function(context, frequency) {
    BiquadFilter.call(this, context, frequency);
};
HighPassFilter.prototype = Object.create(BiquadFilter.prototype);
HighPassFilter.prototype.constructor = HighPassFilter;

/**
 * Calculate the biquad filter coefficients using maths from
 * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
 *
 * @param {Number} frequency The filter frequency.
 */
HighPassFilter.prototype.calculateCoefficients = function(frequency) {
    var w0 = 2 * Math.PI * frequency /
             this.context.device.sampleRate;
    var cosw0 = Math.cos(w0);
    var sinw0 = Math.sin(w0);
    var alpha = sinw0 / (2 / Math.sqrt(2));

    this.b0 = (1 + cosw0) / 2;
    this.b1 = - (1 + cosw0);
    this.b2 = this.b0;
    this.a0 = 1 + alpha;
    this.a1 = -2 * cosw0;
    this.a2 = 1 - alpha;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
HighPassFilter.prototype.toString = function() {
    return 'High Pass Filter';
};

module.exports = HighPassFilter;
