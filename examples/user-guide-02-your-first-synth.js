var Synth = function(context, frequency) {
    audiolet.Group.apply(this, [context, 0, 1]);
    this.sine = new audiolet.dsp.Sine(this.context, frequency);
    this.modulator = new audiolet.dsp.Saw(this.context, frequency * 2);
    this.modulatorMulAdd = new audiolet.operator.MulAdd(this.context, frequency / 2,
                                      frequency);

    this.gain = new audiolet.dsp.Gain(this.context);
    this.envelope = new audiolet.dsp.PercussiveEnvelope(this.context, 1, 0.2, 0.5,
        function() {
            this.context.scheduler.addRelative(0,
                                                this.remove.bind(this));
        }.bind(this)
    );

    this.modulator.connect(this.modulatorMulAdd);
    this.modulatorMulAdd.connect(this.sine);

    this.envelope.connect(this.gain, 0, 1);
    this.sine.connect(this.gain);

    this.gain.connect(this.outputs[0]);
};
Synth.prototype = Object.create(audiolet.Group.prototype);
Synth.prototype.constructor = Synth;

var AudioletApp = function() {
    this.context = new audiolet.Audiolet();
    var synth = new Synth(this.context, 440);
    synth.connect(this.context.output);
};

this.audioletApp = new AudioletApp();
