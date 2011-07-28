/*!
 * @depends ../core/AudioletNode.js
 * @depends ../core/AudioletGroup.js
 */

/**
 * Port of the Freeverb Schrodoer/Moorer reverb model.  See
 * https://ccrma.stanford.edu/~jos/pasp/Freeverb.html for a description of how
 * each part works.
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
var Reverb = function(audiolet, mix, roomSize, damping) {
    AudioletNode.call(this, audiolet, 4, 1);

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
    // Mix control
    var mix = mix || this.initialMix;
    this.mix = new AudioletParameter(this, 1, mix);

    // Room size control
    var roomSize = roomSize || this.initialRoomSize;
    this.roomSize = new AudioletParameter(this, 2, roomSize);

    // Damping control
    var damping = damping || this.initialDamping;
    this.damping = new AudioletParameter(this, 3, damping);

    // Damped comb filters
    this.combBuffers = [];
    this.combIndices = [];
    this.filterStores = [];

    var numberOfCombs = this.combTuning.length;
    for (var i = 0; i < numberOfCombs; i++) {
        this.combBuffers.push(new Float32Array(this.combTuning[i]));
        this.combIndices.push(0);
        this.filterStores.push(0);
    }

    // All-pass filters
    this.allPassBuffers = [];
    this.allPassIndices = [];

    var numberOfFilters = this.allPassTuning.length;
    for (var i = 0; i < numberOfFilters; i++) {
        this.allPassBuffers.push(new Float32Array(this.allPassTuning[i]));
        this.allPassIndices.push(0);
    }
};
extend(Reverb, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Reverb.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var inputChannel = inputBuffer.channels[0];
    var outputBuffer = outputBuffers[0];
    var outputChannel = outputBuffer.channels[0];

    var mixParameter = this.mix;
    var mix, mixChannel;
    if (mixParameter.isStatic()) {
        mix = mixParameter.getValue();
    }
    else {
        mixChannel = mixParameter.getChannel();
    }

    var roomSizeParameter = this.roomSize;
    var roomSize, roomSizeChannel;
    if (roomSizeParameter.isStatic()) {
        roomSize = roomSizeParameter.getValue();
    }
    else {
        roomSizeChannel = roomSizeParameter.getChannel();
    }

    var dampingParameter = this.damping;
    var damping, dampingChannel;
    if (dampingParameter.isStatic()) {
        damping = dampingParameter.getValue();
    }
    else {
        dampingChannel = dampingParameter.getChannel();
    }

    var numberOfCombs = this.combTuning.length;
    var numberOfFilters = this.allPassTuning.length;

    var gain = this.fixedGain;

    var combBuffers = this.combBuffers;
    var combIndices = this.combIndices;
    var filterStores = this.filterStores;

    var allPassBuffers = this.allPassBuffers;
    var allPassIndices = this.allPassIndices;

    var scaleDamping = this.scaleDamping;

    var scaleRoom = this.scaleRoom;
    var offsetRoom = this.offsetRoom;

    var bufferLength = inputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (mixChannel) {
            mix = mixChannel[i];
        }
        if (roomSizeChannel) {
            roomSize = roomSizeChannel[i];
        }
        if (dampingChannel) {
            damping = dampingChannel[i];
        }

        var value;
        if (!inputBuffer.isEmpty) {
            value = inputChannel[i];
        }
        else {
            value = 0;
        }
        var dryValue = value;

        value *= gain;
        var gainedValue = value;

        var damping = damping * scaleDamping;
        var feedback = roomSize * scaleRoom + offsetRoom;
        for (var j = 0; j < numberOfCombs; j++) {
            var combIndex = combIndices[j];
            var combBuffer = combBuffers[j];
            var filterStore = filterStores[j];

            var output = combBuffer[combIndex];
            filterStore = (output * (1 - damping)) +
                          (filterStore * damping);
            value += output;
            combBuffer[combIndex] = gainedValue + feedback * filterStore;

            combIndex += 1;
            if (combIndex >= combBuffer.length) {
                combIndex = 0;
            }


            combIndices[j] = combIndex;
            filterStores[j] = filterStore;
        }

        for (var j = 0; j < numberOfFilters; j++) {
            var allPassBuffer = allPassBuffers[j];
            var allPassIndex = allPassIndices[j];

            var input = value;
            var bufferValue = allPassBuffer[allPassIndex];
            value = -value + bufferValue;
            allPassBuffer[allPassIndex] = input + (bufferValue * 0.5);

            allPassIndex += 1;
            if (allPassIndex >= allPassBuffer.length) {
                allPassIndex = 0;
            }

            allPassIndices[j] = allPassIndex;
        }

        outputChannel[i] = mix * value + (1 - mix) * dryValue;
    }
};


/**
 * toString
 *
 * @return {String} String representation.
 */
Reverb.prototype.toString = function() {
    return 'Reverb';
};

