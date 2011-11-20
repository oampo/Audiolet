function playExample() {
    var Synth = function(audiolet, frequency) {
        AudioletGroup.call(this, audiolet, 0, 1);
        // Basic wave
        this.saw = new Saw(audiolet, frequency);

        // Gain envelope
        this.gain = new Gain(audiolet);
        this.env = new PercussiveEnvelope(audiolet, 1, 0.1, 0.1,
            function() {
                this.audiolet.scheduler.addRelative(0, this.remove.bind(this));
            }.bind(this)
        );
        this.envMulAdd = new MulAdd(audiolet, 0.3, 0);

        // Main signal path
        this.saw.connect(this.gain);
        this.gain.connect(this.outputs[0]);

        // Envelope
        this.env.connect(this.envMulAdd);
        this.envMulAdd.connect(this.gain, 0, 1);
    };
    extend(Synth, AudioletGroup);

    var SchedulerApp = function() {
        this.audiolet = new Audiolet();

        this.scale = new MajorScale();

        // I IV V progression
        var chordPattern = new PSequence([[0, 2, 4],
                                          [3, 5, 7],
                                          [4, 6, 8]]);
        // Play the progression
        this.audiolet.scheduler.play([chordPattern], 1,
                                     this.playChord.bind(this));
    };

    SchedulerApp.prototype.playChord = function(chord) {
        for (var i = 0; i < chord.length; i++) {
            var degree = chord[i];
            var frequency = this.scale.getFrequency(degree, 16.352, 4);
            var synth = new Synth(this.audiolet, frequency);
            synth.connect(this.audiolet.output);
        }
    };

    var app = new SchedulerApp();
};