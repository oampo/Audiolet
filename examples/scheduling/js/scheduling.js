function playExample() {
    var Synth = function(audiolet, frequency) {
        AudioletGroup.call(this, audiolet, 0, 1);
        // Basic wave
        this.saw = new Saw(audiolet, frequency);

        // Gain envelope
        this.gain = new Gain(audiolet);
        this.env = new PercussiveEnvelope(audiolet, 1, 0.1, 0.1,
            function() {
                this.audiolet.scheduler.addRelative(0,
                    this.remove.bind(this));
            }.bind(this)
        );

        // Main signal path
        this.saw.connect(this.gain);
        this.gain.connect(this.outputs[0]);

        // Envelope
        this.env.connect(this.gain, 0, 1);
    }
    extend(Synth, AudioletGroup);

    var SchedulerApp = function() {
        this.audiolet = new Audiolet();

        // Play one note on beat 0
        this.audiolet.scheduler.addAbsolute(0, function() {
            this.playNote(200);
        }.bind(this));

        // Go to play a lower note on beat 1, but cancel it!
        var event = this.audiolet.scheduler.addAbsolute(1, function() {
            this.playNote(100);
        }.bind(this));

        this.audiolet.scheduler.remove(event);

        // Play two notes one after another on beats 2 and 3
        this.audiolet.scheduler.addAbsolute(2, function() {
            // First note
            this.playNote(300);
            // Schedule second note for one beat later
            this.audiolet.scheduler.addRelative(1, function() {
                this.playNote(400);
            }.bind(this));
        }.bind(this));

        // On beat 4 play a pattern of notes twice through as eighth notes
        this.audiolet.scheduler.addAbsolute(4, function() {
            var frequencyPattern = new PSequence([200, 300, 400, 500], 2);
            this.audiolet.scheduler.play([frequencyPattern], 0.5,
                function(frequency) {
                    this.playNote(frequency);
                }.bind(this)
            );
        }.bind(this));
    }

    SchedulerApp.prototype.playNote = function(frequency) {
        var synth = new Synth(this.audiolet, frequency);
        synth.connect(this.audiolet.output);
    }

    var app = new SchedulerApp();

}