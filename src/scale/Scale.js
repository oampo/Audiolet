var Scale = function(degrees, tuning) {
    this.degrees = degrees;
    this.tuning = tuning || new EqualTemperamentTuning(12);
};

Scale.prototype.getFrequency = function(degree, rootFrequency, octave) {
    var frequency = rootFrequency;
    octave += Math.floor(degree / this.degrees.length);
    degree %= this.degrees.length;
    frequency *= Math.pow(this.tuning.octaveRatio, octave);
    frequency *= this.tuning.ratios[this.degrees[degree]];
    return frequency;
};
