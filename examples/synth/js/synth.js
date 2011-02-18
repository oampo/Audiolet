window.addEvent("domready", function() {
    var Synth = new Class({
        Extends: AudioletGroup,
        initialize: function(audiolet) {
            AudioletGroup.prototype.initialize.apply(this, [audiolet, 0, 1]);
            // Basic wave
            this.saw = new Saw(audiolet, 100);
            
            // Frequency LFO
            this.frequencyLFO = new Sine(audiolet, 2);
            this.frequencyMA = new MulAdd(audiolet, 10, 100);

            // Filter
            this.filter = new LowPassFilter(audiolet, 1000);
            
            // Filter LFO
            this.filterLFO = new Saw(audiolet, 8);
            this.filterMA = new MulAdd(audiolet, 900, 1000);

            // Gain envelope
            this.gain = new Gain(audiolet);
            this.env = new ADSR(audiolet, 1, 4, 5, 0.0001, null,
                function() {
                    this.remove();
                }.bind(this)
            );

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
            //this.env.connect(this.gain, 0, 1);
        }
    });
    
    var audiolet = new Audiolet(44100, 2, Math.pow(2, 13));
    var synth = new Synth(audiolet);

    var frequencyPattern = new PSequence([55, 98, 73, 98], Infinity);
    var filterLFOPattern = new PChoose([2, 4, 6, 8], Infinity);
    audiolet.scheduler.play([frequencyPattern, filterLFOPattern], 4,
        function(frequency, filterLFOFrequency) {
            this.frequencyMA.add.setValue(frequency);
            this.filterLFO.frequency.setValue(filterLFOFrequency);
        }.bind(synth)
    );  

    // TODO: Add up/downmixer to the output so we don't need this
    var pan = new Pan(audiolet);
    synth.connect(pan);
    pan.connect(audiolet.output);
});

