/**
 * @depends Tuning.js
 */
var EqualTemperamentTuning = new Class({
    Extends: Tuning,
    initialize: function(pitchesPerOctave) {
        var semitones = [];
        for (var i=0; i<pitchesPerOctave; i++) {
            semitones.push(i);
        }
        Tuning.prototype.initialize.apply(this, [semitones, 2]);
    }
});
