/*!
 * @depends ../core/AudioletNode.js
 * @depends ../core/AudioletGroup.js
 */

/**
 * Port of the Freeverb Schrodoer/Moorer reverb model.  See
 * https://ccrma.stanford.edu/~jos/pasp/Freeverb.html for a description of how
 * each part works.  This is an old, slow, crappy version maintained for
 * backwards compatibility.  It is recommended to that you use Reverb instead.
 *
 * **Inputs**
 *
 * - Audio
 * - Mix
 * - Room Size
 * - Damping
 *
 * **Outputs**
 *
 * - Reverberated Audio
 *
 * **Parameters**
 *
 * - mix The wet/dry mix.  Values between 0 and 1.  Linked to input 1.
 * - roomSize The reverb's room size.  Values between 0 and 1.  Linked to input
 * 2.
 * - damping The amount of high-frequency damping.  Values between 0 and 1.
 * Linked to input 3.
 *
 * @constructor
 * @extends AudioletGroup
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [mix=0.33] The initial wet/dry mix.
 * @param {Number} [roomSize=0.5] The initial room size.
 * @param {Number} [damping=0.5] The initial damping amount.
 */
var ReverbB = function(audiolet, mix, roomSize, damping) {
    AudioletGroup.call(this, audiolet, 4, 1);

    // Constants
    this.initialMix = 0.33;
    this.fixedGain = 0.015;
    this.initialDamping = 0.5;
    this.scaleDamping = 0.4;
    this.initialRoomSize = 0.5;
    this.scaleRoom = 0.28;
    this.offsetRoom = 0.7;

    // Parameters: for 44.1k or 48k
    this.combTuning = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
    this.allPassTuning = [556, 441, 341, 225];

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
    for (var i = 0; i < this.combTuning.length; i++) {
        var delayTime = this.combTuning[i] /
                        this.audiolet.device.sampleRate;
        this.combFilters[i] = new DampedCombFilter(audiolet, delayTime,
                                                   delayTime);

        this.fgConverters[i] = new FeedbackGainToDecayTime(audiolet,
                                                           delayTime);
    }

    // Four allpass filters
    this.allPassFilters = [];
    for (var i = 0; i < this.allPassTuning.length; i++) {
        this.allPassFilters[i] = new AllPassFilter(audiolet,
                                                   this.allPassTuning[i]);
    }

    // Mixer
    var mix = mix || this.initialMix;
    this.mixer = new LinearCrossFade(audiolet, mix);

    this.mix = this.mixer.position;

    // Connect up the controls
    this.inputs[1].connect(this.mixer, 0, 2);

    this.inputs[2].connect(this.roomSizeNode);
    this.roomSizeNode.connect(this.roomSizeMulAdd);

    this.inputs[3].connect(this.dampingNode);
    this.dampingNode.connect(this.dampingMulAdd);

    // Connect up the gain
    this.inputs[0].connect(this.gain);

    // Connect up the comb filters
    for (var i = 0; i < this.combFilters.length; i++) {
        this.gain.connect(this.combFilters[i]);
        this.combFilters[i].connect(this.allPassFilters[0]);

        // Controls
        this.roomSizeMulAdd.connect(this.fgConverters[i]);
        this.fgConverters[i].connect(this.combFilters[i], 0, 2);

        this.dampingMulAdd.connect(this.combFilters[i], 0, 3);
    }

    // Connect up the all pass filters
    var numberOfAllPassFilters = this.allPassFilters.length;
    for (var i = 0; i < numberOfAllPassFilters - 1; i++) {
        this.allPassFilters[i].connect(this.allPassFilters[i + 1]);
    }

    this.inputs[0].connect(this.mixer);
    var lastAllPassIndex = numberOfAllPassFilters - 1;
    this.allPassFilters[lastAllPassIndex].connect(this.mixer, 0, 1);

    this.mixer.connect(this.outputs[0]);
};
extend(ReverbB, AudioletGroup);

/**
 * toString
 *
 * @return {String} String representation.
 */
ReverbB.prototype.toString = function() {
    return 'Reverb B';
};

/**
 * Helper node to convert a feedback gain multiplier to a 60db decay time.
 *
 * **Inputs**
 *
 * - Feedback gain
 *
 * **Outputs**
 *
 * - Decay time
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} delayTime The delay time in seconds
 */
var FeedbackGainToDecayTime = function(audiolet, delayTime) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.delayTime = delayTime;
    this.lastFeedbackGain = null;
    this.decayTime = null;
};
extend(FeedbackGainToDecayTime, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
FeedbackGainToDecayTime.prototype.generate = function(inputBuffers,
                                                      outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];
    var inputChannel = inputBuffer.channels[0];
    var outputChannel = outputBuffer.channels[0];

    var delayTime = this.lastDelayTime;
    var decayTime = this.decayTime;
    var lastFeedbackGain = this.lastFeedbackGain;

    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        var feedbackGain = inputChannel[i];
        if (feedbackGain != lastFeedbackGain) {
            decayTime = - 3 * delayTime / Math.log(feedbackGain);
            lastFeedbackGain = feedbackGain;
        }
        outputChannel[i] = feedbackGain;
    }

    this.decayTime = decayTime;
    this.lastFeedbackGain = lastFeedbackGain;
};
