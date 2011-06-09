var Tuning = function(semitones, octaveRatio) {
    this.semitones = semitones;
    this.octaveRatio = octaveRatio || 2;
    this.ratios = [];
    var tuningLength = this.semitones.length;
    for (var i=0; i<tuningLength; i++) {
        this.ratios.push(Math.pow(2, i / tuningLength));
    }
}
