function playExample() {
    var audiolet = new Audiolet();

    var Synth = function(audiolet) {
        AudioletGroup.call(this, audiolet, 0, 1);
        this.sin = new Sine(audiolet);
        this.gain = new Gain(audiolet);
        this.env = new PercussiveEnvelope(audiolet, 0, 0.1, 0.5);
        this.delay = new Delay(audiolet, 0.2, 0.2);
        this.feedbackScaler = new Gain(audiolet, 0.5);

        this.sin.connect(this.gain);
        this.env.connect(this.gain, 0, 1);
        this.gain.connect(this.delay);
        this.delay.connect(this.outputs[0]);
        this.delay.connect(this.feedbackScaler);
        this.feedbackScaler.connect(this.delay);
    }
    extend(Synth, AudioletGroup);

    var synth = new Synth(audiolet);
    synth.connect(audiolet.output);
    var freqPattern = new PSequence([110, 110, 196, 196, 146, 146], Infinity);
    var gatePattern = new PSequence([1, 0], Infinity);

    audiolet.scheduler.play([freqPattern, gatePattern], 1,
        function(frequency, gate) {
            this.env.gate.setValue(gate);
            this.sin.frequency.setValue(frequency);
        }.bind(synth)
    );
}
