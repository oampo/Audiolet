var context = new audiolet.Audiolet();

var Synth = function(context) {
    audiolet.Group.call(this, context, 0, 1);
    this.sin = new audiolet.dsp.Sine(context);
    this.gain = new audiolet.dsp.Gain(context);
    this.env = new audiolet.dsp.PercussiveEnvelope(context, 0, 0.1, 0.5);
    this.delay = new audiolet.dsp.Delay(context, 0.2, 0.2);
    this.feedbackScaler = new audiolet.dsp.Gain(context, 0.5);

    this.sin.connect(this.gain);
    this.env.connect(this.gain, 0, 1);
    this.gain.connect(this.delay);
    this.delay.connect(this.outputs[0]);
    this.delay.connect(this.feedbackScaler);
    this.feedbackScaler.connect(this.delay);
};
Synth.prototype = Object.create(audiolet.Group.prototype);
Synth.prototype.constructor = Synth;

var synth = new Synth(context);
synth.connect(context.output);
var freqPattern = new audiolet.pattern.Sequence([110, 110, 196, 196, 146, 146], Infinity);
var gatePattern = new audiolet.pattern.Sequence([1, 0], Infinity);

context.scheduler.play([freqPattern, gatePattern], 1,
    function(frequency, gate) {
        this.env.gate.setValue(gate);
        this.sin.frequency.setValue(frequency);
    }.bind(synth)
);
