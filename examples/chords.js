var Synth = function(context, frequency) {
    audiolet.Group.call(this, context, 0, 1);
    // Basic wave
    this.saw = new audiolet.dsp.Saw(context, frequency);

    // Gain envelope
    this.gain = new audiolet.dsp.Gain(context);
    this.env = new audiolet.dsp.PercussiveEnvelope(context, 1, 0.1, 0.1,
        function() {
            this.context.scheduler.addRelative(0, this.remove.bind(this));
        }.bind(this)
    );
    this.envMulAdd = new audiolet.operator.MulAdd(context, 0.3, 0);

    // Main signal path
    this.saw.connect(this.gain);
    this.gain.connect(this.outputs[0]);

    // Envelope
    this.env.connect(this.envMulAdd);
    this.envMulAdd.connect(this.gain, 0, 1);
};
Synth.prototype = Object.create(audiolet.Group.prototype);
Synth.prototype.constructor = Synth;

var SchedulerApp = function() {
    this.context = new audiolet.Audiolet();

    this.scale = new audiolet.scale.Major();

    // I IV V progression
    var chordPattern = new audiolet.pattern.Sequence([[0, 2, 4],
                                                      [3, 5, 7],
                                                      [4, 6, 8]]);
    // Play the progression
    this.context.scheduler.play([chordPattern], 1,
                                 this.playChord.bind(this));
};

SchedulerApp.prototype.playChord = function(chord) {
    for (var i = 0; i < chord.length; i++) {
        var degree = chord[i];
        var frequency = this.scale.getFrequency(degree, 16.352, 4);
        var synth = new Synth(this.context, frequency);
        synth.connect(this.context.output);
    }
};

var app = new SchedulerApp();
