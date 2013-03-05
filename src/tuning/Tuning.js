/*!
 * @depends ../core/AudioletClass.js
 */

/**
 * Representation of a generic musical tuning.  Can be subclassed to produce
 * specific tunings.
 */
var Tuning = AudioletClass.extend({

    /**
     * Constructor
     *
     * @param {Number[]} semitones Array of semitone values for the tuning.
     * @param {Number} [octaveRatio=2] Frequency ratio for notes an octave apart.
     */
    constructor: function(semitones, octaveRatio) {
        this.semitones = semitones;
        this.octaveRatio = octaveRatio || 2;
        this.ratios = [];
        var tuningLength = this.semitones.length;
        for (var i = 0; i < tuningLength; i++) {
            this.ratios.push(Math.pow(2, this.semitones[i] / tuningLength));
        }
    }

});