function playExample() {
    var Synth = function(audiolet) {
        AudioletGroup.apply(this, [audiolet, 0, 1]);
        // Basic wave
        this.saw = new Saw(audiolet, 100);

        // Frequency LFO
        this.frequencyLFO = new Sine(audiolet, 2);
        this.frequencyMA = new MulAdd(audiolet, 10, 100);

        // Filter
        this.filter = new LowPassFilter(audiolet, 1000);

        // Filter LFO
        this.filterLFO = new Sine(audiolet, 8);
        this.filterMA = new MulAdd(audiolet, 900, 1000);

        // Gain envelope
        this.gain = new Gain(audiolet);
        this.env = new ADSREnvelope(audiolet,
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
    extend(Synth, AudioletGroup);

    var audiolet = new Audiolet();
    var synth = new Synth(audiolet);

    var frequencyPattern = new PSequence([55, 55, 98, 98, 73, 73, 98, 98],
                                         Infinity);
    var filterLFOPattern = new PChoose([2, 4, 6, 8], Infinity);
    var gatePattern = new PSequence([1, 0], Infinity);

    var patterns = [frequencyPattern, filterLFOPattern, gatePattern];
    audiolet.scheduler.play(patterns, 2,
        function(frequency, filterLFOFrequency, gate) {
            this.frequencyMA.add.setValue(frequency);
            this.filterLFO.frequency.setValue(filterLFOFrequency);
            this.env.gate.setValue(gate);
        }.bind(synth)
    );

    synth.connect(audiolet.output);
};