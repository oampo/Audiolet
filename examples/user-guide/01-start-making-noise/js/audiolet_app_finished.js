function playExample() {
    var AudioletApp = function() {
        this.audiolet = new Audiolet();
        this.sine = new Sine(this.audiolet, 440);
        this.modulator = new Saw(this.audiolet, 880);
        this.modulatorMulAdd = new MulAdd(this.audiolet, 200, 440);

        this.modulator.connect(this.modulatorMulAdd);
        this.modulatorMulAdd.connect(this.sine);
        this.sine.connect(this.audiolet.output);
    };

    this.audioletApp = new AudioletApp();
};