/*!
 * @depends Tuning.js
 */

/**
 * Equal temperament tuning.
 */
var EqualTemperamentTuning = Tuning.extend({

  /**
   * Constructor
   *
   * @extends Tuning
   * @param {Number} pitchesPerOctave The number of notes in each octave.
   */
  constructor: function(pitchesPerOctave) {
    var semitones = [];
    for (var i = 0; i < pitchesPerOctave; i++) {
        semitones.push(i);
    }
    Tuning.call(this, semitones, 2);
  }

});
