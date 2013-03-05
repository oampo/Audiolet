/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * Representation of a generic musical scale.  Can be subclassed to produce
 * specific scales.
 */
var Scale = AudioletClass.extend({

    /*
     * Constructor
     *
     * @param {Number[]} degrees Array of integer degrees.
     * @param {Tuning} [tuning] The scale's tuning.  Defaults to 12-tone ET.
     */
    constructor: function(degrees, tuning) {
        this.degrees = degrees;
        this.tuning = tuning || new EqualTemperamentTuning(12);
    },

    /**
     * Get the frequency of a note in the scale.
     *
     * @param {Number} degree The note's degree.
     * @param {Number} rootFrequency  The root frequency of the scale.
     * @param {Number} octave The octave of the note.
     * @return {Number} The frequency of the note in hz.
     */
    getFrequency: function(degree, rootFrequency, octave) {
        var frequency = rootFrequency;
        octave += Math.floor(degree / this.degrees.length);
        degree %= this.degrees.length;
        frequency *= Math.pow(this.tuning.octaveRatio, octave);
        frequency *= this.tuning.ratios[this.degrees[degree]];
        return frequency;
    }

});