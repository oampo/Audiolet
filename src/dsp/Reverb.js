/**
 * @depends ../core/AudioletGroup.js
 */

// Schroder/Moorer Reverb Unit based on Freeverb
// https://ccrma.stanford.edu/~jos/pasp/Freeverb.html has a good description
// of how it all works

var Reverb = new Class({
    Extends: AudioletGroup,
    
    // Constants
    initialMix: 0.33,
    fixedGain: 0.015,
    initialDamping: 0.5,
    scaleDamping: 0.4,
    initialRoom: 0.5,
    scaleRoom: 0.28,
    offsetRoom: 0.7,

    // Parameters: for 44.1k or 48k
    combTuning: [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617],
    allPassTuning: [556, 441, 341, 225],
    
    initialize: function(audiolet, mix, roomSize, damping) {
        AudioletGroup.prototype.initialize.apply(this, [audiolet, 4, 1]);
        
        // Controls
        // Room size control
        var roomSize = roomSize || this.initialRoomSize;
        this.roomSizeNode = new ParameterNode(audiolet, roomSize);
        this.roomSizeMulAdd = new MulAdd(audiolet, this.scaleRoom,
                                         this.offsetRoom);

        // Damping control
        var damping = damping || this.initialDamping;
        this.dampingNode = new ParameterNode(audiolet, damping);
        this.dampingMulAdd = new MulAdd(audiolet, this.scaleDamping);

        // Access the controls as if this is an AudioletNode, and they are it's
        // parameters.
        this.roomSize = this.roomSizeNode.parameter;
        this.damping = this.dampingNode.parameter;

        // Initial gain control
        this.gain = new Gain(audiolet, this.fixedGain);

        // Eight comb filters and feedback gain converters
        this.combFilters = [];
        this.fgConverters = [];
        for (var i=0; i<this.combTuning.length; i++) {
            var delayTime = this.combTuning[i] /
                            this.audiolet.device.sampleRate;
            this.combFilters[i] = new DampedCombFilter(audiolet, delayTime,
                                                       delayTime);

            this.fgConverters[i] = new FeedbackGainToDecayTime(audiolet,
                                                               delayTime);
        }
        
        // Four allpass filters
        this.allPassFilters = [];
        for (var i=0; i<this.allPassTuning.length; i++) {
            this.allPassFilters[i] = new AllPassFilter(audiolet,
                                                       this.allPassTuning[i]);
        }

        // Mixer
        var mix = mix || this.initialMix;
        this.mixer = new LinearCrossFade(audiolet, mix);

        this.mix = this.mixer.position;

        // Connect up the controls
        this.inputs[1].connect(this.mixer, 0, 1);
        
        this.inputs[2].connect(this.roomSizeNode);
        this.roomSizeNode.connect(this.roomSizeMulAdd);

        this.inputs[3].connect(this.dampingNode);
        this.dampingNode.connect(this.dampingMulAdd);

        // Connect up the gain
        this.inputs[0].connect(this.gain);

        // Connect up the comb filters
        for (var i=0; i<this.combFilters.length; i++) {
            this.gain.connect(this.combFilters[i]);
            this.combFilters[i].connect(this.allPassFilters[0]);

            // Controls
            this.roomSizeMulAdd.connect(this.fgConverters[i]);
            this.fgConverters[i].connect(this.combFilters[i], 0, 2);
            
            this.dampingMulAdd.connect(this.combFilters[i], 0, 3);
        }

        // Connect up the all pass filters
        var numberOfAllPassFilters = this.allPassFilters.length;
        for (var i=0; i<numberOfAllPassFilters - 1; i++) {
            this.allPassFilters[i].connect(this.allPassFilters[i + 1]);
        }

        this.inputs[0].connect(this.mixer);
        var lastAllPassIndex = numberOfAllPassFilters - 1;
        this.allPassFilters[lastAllPassIndex].connect(this.mixer, 0, 1);

        this.mixer.connect(this.outputs[0]);
    }
});

// Converts a feedback gain multiplier to a 60db decay time
var FeedbackGainToDecayTime = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, delayTime) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.delayTime = delayTime;
        this.lastFeedbackGain = null;
        this.decayTime = null;
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];
        var inputChannel = inputBuffer.channels[0];
        var outputChannel = outputBuffer.channels[0];

        var delayTime = this.lastDelayTime;
        var decayTime = this.decayTime;
        var lastFeedbackGain = this.lastFeedbackGain;

        var bufferLength = outputBuffer.length;
        for (var i=0; i<bufferLength; i++) {
            var feedbackGain = inputChannel[i];
            if (feedbackGain != lastFeedbackGain) {
                decayTime = - 3 * delayTime / Math.log(feedbackGain);
                lastFeedbackGain = feedbackGain;
            }
            outputChannel[i] = feedbackGain;
        }

        this.decayTime = decayTime;
        this.lastFeedbackGain = lastFeedbackGain;
    }
});
