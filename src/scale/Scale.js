var Scale = new Class({
    initialize: function(degrees, tuning) {
        this.degrees = degrees;
        this.tuning = tuning || new EqualTemperamentTuning(12);
    },

    getFrequency: function(degree, rootFrequency, octave) {
        var frequency = rootFrequency;
        frequency *= Math.pow(this.tuning.octaveRatio, octave);
        frequency *= this.tuning.ratios[this.degrees[degree]];
        return frequency;
    }
});
