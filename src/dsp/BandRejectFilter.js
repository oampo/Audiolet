/**
 * @depends BiquadFilter.js
 */

// Maths from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
var BandRejectFilter = function(audiolet, frequency) {
    BiquadFilter.call(this, audiolet, frequency);
};
extend(BandRejectFilter, BiquadFilter);

BandRejectFilter.prototype.calculateCoefficients = function(frequency) {
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
};

BandRejectFilter.prototype.toString = function() {
    return 'Band Reject Filter';
};
