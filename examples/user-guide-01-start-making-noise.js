var AudioletApp = function() {
    this.context = new audiolet.Audiolet();
    this.sine = new audiolet.dsp.Sine(this.context, 440);
    this.modulator = new audiolet.dsp.Saw(this.context, 880);
    this.modulatorMulAdd = new audiolet.operator.MulAdd(this.context, 200, 440);

    this.modulator.connect(this.modulatorMulAdd);
    this.modulatorMulAdd.connect(this.sine);
    this.sine.connect(this.context.output);
};

this.audioletApp = new AudioletApp();
