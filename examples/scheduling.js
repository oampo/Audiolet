var Synth = function(context, frequency) {
    audiolet.Group.call(this, context, 0, 1);
    // Basic wave
    this.saw = new audiolet.dsp.Saw(context, frequency);

    // Gain envelope
    this.gain = new audiolet.dsp.Gain(context);
    this.env = new audiolet.dsp.PercussiveEnvelope(context, 1, 0.1, 0.1,
        function() {
            this.context.scheduler.addRelative(0,
                this.remove.bind(this));
        }.bind(this)
    );

    // Main signal path
    this.saw.connect(this.gain);
    this.gain.connect(this.outputs[0]);

    // Envelope
    this.env.connect(this.gain, 0, 1);
}
Synth.prototype = Object.create(audiolet.Group.prototype);
Synth.prototype.constructor = Synth;

var SchedulerApp = function() {
    this.context = new audiolet.Audiolet();

    // Play one note on beat 0
    this.context.scheduler.addAbsolute(0, function() {
        this.playNote(200);
    }.bind(this));

    // Go to play a lower note on beat 1, but cancel it!
    var event = this.context.scheduler.addAbsolute(1, function() {
        this.playNote(100);
    }.bind(this));

    this.context.scheduler.remove(event);

    // Play two notes one after another on beats 2 and 3
    this.context.scheduler.addAbsolute(2, function() {
        // First note
        this.playNote(300);
        // Schedule second note for one beat later
        this.context.scheduler.addRelative(1, function() {
            this.playNote(400);
        }.bind(this));
    }.bind(this));

    // On beat 4 play a pattern of notes twice through as eighth notes
    this.context.scheduler.addAbsolute(4, function() {
        var frequencyPattern = new audiolet.pattern.Sequence([200, 300, 400, 500], 2);
        this.context.scheduler.play([frequencyPattern], 0.5,
            function(frequency) {
                this.playNote(frequency);
            }.bind(this)
        );
    }.bind(this));
}

SchedulerApp.prototype.playNote = function(frequency) {
    var synth = new Synth(this.context, frequency);
    synth.connect(this.context.output);
}

var app = new SchedulerApp();
