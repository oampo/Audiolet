var Tuning = require('./tuning');

/**
 * Equal temperament tuning.
 *
 * @constructor
 * @extends Tuning
 * @param {Number} pitchesPerOctave The number of notes in each octave.
 */
var EqualTemperament = function(pitchesPerOctave) {
    var semitones = [];
    for (var i = 0; i < pitchesPerOctave; i++) {
        semitones.push(i);
    }
    Tuning.call(this, semitones, 2);
};
EqualTemperament.prototype = Object.create(Tuning.prototype);
EqualTemperament.prototype.constructor = Tuning;

module.exports = EqualTemperament;
