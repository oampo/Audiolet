var Synth = function(context) {
    audiolet.Group.apply(this, [context, 0, 1]);
    // Basic wave
    this.saw = new audiolet.dsp.Saw(context, 100);

    // Frequency LFO
    this.frequencyLFO = new audiolet.dsp.Sine(context, 2);
    this.frequencyMA = new audiolet.operator.MulAdd(context, 10, 100);

    // Filter
    this.filter = new audiolet.dsp.LowPassFilter(context, 1000);

    // Filter LFO
    this.filterLFO = new audiolet.dsp.Sine(context, 8);
    this.filterMA = new audiolet.operator.MulAdd(context, 900, 1000);

    // Gain envelope
    this.gain = new audiolet.dsp.Gain(context);
    this.env = new audiolet.dsp.ADSREnvelope(context,
                                1, // Gate
                                1.5, // Attack
                                0.2, // Decay
                                0.9, // Sustain
                                2); // Release

    // Main signal path
    this.saw.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(this.outputs[0]);

    // Frequency LFO
    this.frequencyLFO.connect(this.frequencyMA);
    this.frequencyMA.connect(this.saw);

    // Filter LFO
    this.filterLFO.connect(this.filterMA);
    this.filterMA.connect(this.filter, 0, 1);

    // Envelope
    this.env.connect(this.gain, 0, 1);
};
Synth.prototype = Object.create(audiolet.Group.prototype);
Synth.prototype.constructor = Synth;

var context = new audiolet.Audiolet();
var synth = new Synth(context);

var frequencyPattern = new audiolet.pattern.Sequence([55, 55, 98, 98, 73, 73, 98, 98],
                                     Infinity);
var filterLFOPattern = new audiolet.pattern.Choose([2, 4, 6, 8], Infinity);
var gatePattern = new audiolet.pattern.Sequence([1, 0], Infinity);

var patterns = [frequencyPattern, filterLFOPattern, gatePattern];
context.scheduler.play(patterns, 2,
    function(frequency, filterLFOFrequency, gate) {
        this.frequencyMA.add.setValue(frequency);
        this.filterLFO.frequency.setValue(filterLFOFrequency);
        this.env.gate.setValue(gate);
    }.bind(synth)
);

synth.connect(context.output);
