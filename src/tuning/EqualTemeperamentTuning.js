/**
 * @depends Tuning.js
 */
var EqualTemperamentTuning = function(pitchesPerOctave) {
    var semitones = [];
    for (var i=0; i<pitchesPerOctave; i++) {
        semitones.push(i);
    }
    EqualTemperamentTuning.superclass.call(this, semitones, 2);
}
extend(EqualTemperamentTuning, Tuning);
