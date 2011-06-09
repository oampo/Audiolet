/**
 * @depends BiquadFilter.js
 */

/**
 * Band-reject filter
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
 * @extends BiquadFilter
 */

var BandRejectFilter = new Class({
    Extends: BiquadFilter,
    /**
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object
     * @param {Number} frequency The initial frequency
     */
    initialize: function(audiolet, frequency) {
        BiquadFilter.prototype.initialize.apply(this, [audiolet, frequency]);
    },

    /**
     * Calculate the biquad filter coefficients using maths from
     * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
     *
     * @param {Number} frequency The filter frequency
     */
    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency /
                 this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = 1;
        this.b1 = -2 * cosw0;
        this.b2 = 1;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    /**
     * toString
     *
     * @return {String}
     */
    toString: function() {
        return 'Band Reject Filter';
    }
});
