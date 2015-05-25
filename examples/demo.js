var HighSynth = function(context) {
    audiolet.Group.call(this, context, 0, 1);

    // Triangle base oscillator
    this.triangle = new audiolet.dsp.Triangle(context);

    // Note on trigger
    this.trigger = new audiolet.dsp.TriggerControl(context);

    // Gain envelope
    this.gainEnv = new audiolet.dsp.PercussiveEnvelope(context, 0, 0.1, 0.15);
    this.gainEnvMulAdd = new audiolet.operator.MulAdd(context, 0.1);
    this.gain = new audiolet.dsp.Gain(context);

    // Feedback delay
    this.delay = new audiolet.dsp.Delay(context, 0.1, 0.1);
    this.feedbackLimiter = new audiolet.dsp.Gain(context, 0.5);

    // Stereo panner
    this.pan = new audiolet.dsp.Pan(context);
    this.panLFO = new audiolet.dsp.Sine(context, 1 / 8);


    // Connect oscillator
    this.triangle.connect(this.gain);

    // Connect trigger and envelope
    this.trigger.connect(this.gainEnv);
    this.gainEnv.connect(this.gainEnvMulAdd);
    this.gainEnvMulAdd.connect(this.gain, 0, 1);
    this.gain.connect(this.delay);

    // Connect delay
    this.delay.connect(this.feedbackLimiter);
    this.feedbackLimiter.connect(this.delay);
    this.gain.connect(this.pan);
    this.delay.connect(this.pan);

    // Connect panner
    this.panLFO.connect(this.pan, 0, 1);
    this.pan.connect(this.outputs[0]);
}
HighSynth.prototype = Object.create(audiolet.Group.prototype);
HighSynth.prototype.constructor = HighSynth;

var BassSynth = function(context) {
    audiolet.Group.call(this, context, 0, 1);
    // Basic wave
    this.sine = new audiolet.dsp.Sine(context, 100);

    // Frequency Modulator
    this.fmEnv = new audiolet.dsp.PercussiveEnvelope(context, 10, 10, 2);
    this.fmEnvMulAdd = new audiolet.operator.MulAdd(context, 90, 0);
    this.frequencyModulator = new audiolet.dsp.Saw(context);
    this.frequencyMulAdd = new audiolet.operator.MulAdd(context, 90, 100);

    // Gain envelope
    this.gain = new audiolet.dsp.Gain(context);
    this.gainEnv = new audiolet.dsp.ADSREnvelope(context,
                                    1, // Gate
                                    1, // Attack
                                    0.2, // Decay
                                    0.9, // Sustain
                                    2); // Release
    this.gainEnvMulAdd = new audiolet.operator.MulAdd(context, 0.2);

    this.upMixer = new audiolet.dsp.UpMixer(context, 2);

    // Connect main signal path
    this.sine.connect(this.gain);
    this.gain.connect(this.upMixer);
    this.upMixer.connect(this.outputs[0]);

    // Connect Frequency Modulator
    this.fmEnv.connect(this.fmEnvMulAdd);
    this.fmEnvMulAdd.connect(this.frequencyMulAdd, 0, 1);
    this.frequencyModulator.connect(this.frequencyMulAdd);
    this.frequencyMulAdd.connect(this.sine);

    // Connect Envelope
    this.gainEnv.connect(this.gainEnvMulAdd);
    this.gainEnvMulAdd.connect(this.gain, 0, 1);
}
BassSynth.prototype = Object.create(audiolet.Group.prototype);
BassSynth.prototype.constructor = BassSynth;

var Kick = function(context) {
    audiolet.Group.call(this, context, 0, 1);
    // Main sine oscillator
    this.sine = new audiolet.dsp.Sine(context, 80);

    // Pitch Envelope - from 81 to 1 hz in 0.3 seconds
    this.pitchEnv = new audiolet.dsp.PercussiveEnvelope(context, 1, 0.001, 0.3);
    this.pitchEnvMulAdd = new audiolet.operator.MulAdd(context, 80, 1);

    // Gain Envelope
    this.gainEnv = new audiolet.dsp.PercussiveEnvelope(context, 1, 0.001, 0.3,
        function() {
            // Remove the group ASAP when env is complete
            this.context.scheduler.addRelative(0,
                                                this.remove.bind(this));
        }.bind(this)
    );
    this.gainEnvMulAdd = new audiolet.operator.MulAdd(context, 0.7);
    this.gain = new audiolet.dsp.Gain(context);
    this.upMixer = new audiolet.dsp.UpMixer(context, 2);


    // Connect oscillator
    this.sine.connect(this.gain);

    // Connect pitch envelope
    this.pitchEnv.connect(this.pitchEnvMulAdd);
    this.pitchEnvMulAdd.connect(this.sine);

    // Connect gain envelope
    this.gainEnv.connect(this.gainEnvMulAdd);
    this.gainEnvMulAdd.connect(this.gain, 0, 1);
    this.gain.connect(this.upMixer);
    this.upMixer.connect(this.outputs[0]);
}
Kick.prototype = Object.create(audiolet.Group.prototype);
Kick.prototype.constructor = Kick;

var Shaker = function(context) {
    audiolet.Group.call(this, context, 0, 1);
    // White noise source
    this.white = new audiolet.dsp.WhiteNoise(context);

    // Gain envelope
    this.gainEnv = new audiolet.dsp.PercussiveEnvelope(context, 1, 0.01, 0.05,
        function() {
            // Remove the group ASAP when env is complete
            this.context.scheduler.addRelative(0,
                                                this.remove.bind(this));
        }.bind(this)
    );
    this.gainEnvMulAdd = new audiolet.operator.MulAdd(context, 0.15);
    this.gain = new audiolet.dsp.Gain(context);

    // Filter
    this.filter = new audiolet.dsp.BandPassFilter(context, 3000);

    this.upMixer = new audiolet.dsp.UpMixer(context, 2);

    // Connect the main signal path
    this.white.connect(this.filter);
    this.filter.connect(this.gain);

    // Connect the gain envelope
    this.gainEnv.connect(this.gainEnvMulAdd);
    this.gainEnvMulAdd.connect(this.gain, 0, 1);
    this.gain.connect(this.upMixer);
    this.upMixer.connect(this.outputs[0]);
}
Shaker.prototype = Object.create(audiolet.Group.prototype);
Shaker.prototype.constructor = Shaker;

var Demo = function() {
    this.context = new audiolet.Audiolet();

    // Set BPM
    this.context.scheduler.setTempo(128);

    // Base frequency and scale to work from
    this.c2Frequency = 65.4064;
    this.scale = new audiolet.scale.Major();

    this.playHighSynth();
    this.playMidSynth();
    this.playKick();
    this.playShaker();
    this.playBassSynth();
}

Demo.prototype.playHighSynth = function() {
    // High synth - scheduled as a mono synth (i.e. one instance keeps
    // running and the gate and frequency are switched)
    this.highSynth = new HighSynth(this.context);

    // Connect it to the output so we can hear it
    this.highSynth.connect(this.context.output);

    // Four rising arpeggios starting at sucessively higher notes
    var arp1 = new audiolet.pattern.Arithmetic(0, 1, 4);
    var arp2 = new audiolet.pattern.Arithmetic(1, 1, 4);
    var arp3 = new audiolet.pattern.Arithmetic(2, 1, 4);
    var arp4 = new audiolet.pattern.Arithmetic(3, 1, 4);

    // Plays the arpeggios one after another, then repeat them
    var degreePattern = new audiolet.pattern.Sequence([arp1, arp2, arp3, arp4],
                                      Infinity);

    // How long each event lasts
    var durationPattern = new audiolet.pattern.Sequence([0.5], Infinity);

    // Schedule the patterns to play
    this.context.scheduler.play([degreePattern],
                                 durationPattern,
        function(degree) {
            // Set the gate
            this.highSynth.trigger.trigger.setValue(1);
            // Calculate the frequency from the scale
            var frequency = this.scale.getFrequency(degree,
                                                    this.c2Frequency,
                                                    3);
            // Set the frequency
            this.highSynth.triangle.frequency.setValue(frequency);
        }.bind(this)
    );
}

Demo.prototype.playMidSynth = function() {
    // Mid synth - actually just a HighSynth instance playing lower.
    // Scheduled as a mono synth
    this.midSynth = new HighSynth(this.context);

    // Connect it to the output so we can hear it
    this.midSynth.connect(this.context.output);

    // Falling arpeggio
    var arp = new audiolet.pattern.Arithmetic(5, -1, 6);
    var degreePattern = new audiolet.pattern.Sequence([arp], Infinity);

    // How long each event lasts
    var durationPattern = new audiolet.pattern.Sequence([0.5], Infinity);

    // Schedule the patterns to play
    this.context.scheduler.play([degreePattern],
                                 durationPattern,
        function(degree) {
            // Set the gate
            this.midSynth.trigger.trigger.setValue(1);
            // Calculate the frequency from the scale
            var frequency = this.scale.getFrequency(degree,
                                                    this.c2Frequency,
                                                    1);
            // Set the frequency
            this.midSynth.triangle.frequency.setValue(frequency);
        }.bind(this)
    );
}

Demo.prototype.playBassSynth = function() {
    // Bass synth - scheduled as a mono synth (i.e. one instance keeps
    // running and the gate and frequency are switched)
    this.bassSynth = new BassSynth(this.context);

    // Connect it to the output so we can hear it
    this.bassSynth.connect(this.context.output);

    // Bassline
    var degreePattern = new audiolet.pattern.Sequence([0, 0, 1, 1, 2, 2, 3, 3],
                                      Infinity);

    // How long each event lasts - gate on for 14, off for 2
    var durationPattern = new audiolet.pattern.Sequence([30, 2], Infinity);

    // Toggle the gate on and off
    var gatePattern = new audiolet.pattern.Sequence([1, 0], Infinity);

    // Schedule the patterns to play
    var patterns = [degreePattern, gatePattern];
    this.context.scheduler.play(patterns, durationPattern,
        function(degree, gate) {
            // Set the gates
            this.bassSynth.gainEnv.gate.setValue(gate);
            this.bassSynth.fmEnv.gate.setValue(gate);
            // Calculate the frequency from the scale
            var frequency = this.scale.getFrequency(degree,
                                                    this.c2Frequency,
                                                    1);
            // Set the frequency
            this.bassSynth.frequencyMulAdd.add.setValue(frequency);
            this.bassSynth.frequencyModulator.frequency.setValue(frequency * 4);
        }.bind(this)
    );
}

Demo.prototype.playKick = function() {
    // Kick - scheduled as a poly synth (i.e. a new instance is
    // launched for each note)

    // Four to the floor pattern
    // Schedule the patterns to play
    this.context.scheduler.play([], 1,
        function() {
            var kick = new Kick(this.context);
            kick.connect(this.context.output);
        }.bind(this)
    );

}

Demo.prototype.playShaker = function() {
    // Shaker - four to the floor on the off-beat
    // Scheduled as a poly synth
    this.context.scheduler.addRelative(0.5, function() {
        this.context.scheduler.play([], 1,
            function() {
                var shaker = new Shaker(this.context);
                shaker.connect(this.context.output);
            }.bind(this)
        );
    }.bind(this));
}

// Run the demo
var demo = new Demo();
