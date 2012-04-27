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
 * Process samples
 */
Reverb.prototype.generate = function() {
    var mix = this.mix.getValue();
    var roomSize = this.roomSize.getValue();
    var damping = this.damping.getValue();

    var numberOfCombs = this.combTuning.length;
    var numberOfFilters = this.allPassTuning.length;

    var value = this.inputs[0].samples[0] || 0;
    var dryValue = value;

    value *= this.fixedGain;
    var gainedValue = value;

    var damping = damping * this.scaleDamping;
    var feedback = roomSize * this.scaleRoom + this.offsetRoom;

    for (var i = 0; i < numberOfCombs; i++) {
        var combIndex = this.combIndices[i];
        var combBuffer = this.combBuffers[i];
        var filterStore = this.filterStores[i];

        var output = combBuffer[combIndex];
        filterStore = (output * (1 - damping)) +
                      (filterStore * damping);
        value += output;
        combBuffer[combIndex] = gainedValue + feedback * filterStore;

        combIndex += 1;
        if (combIndex >= combBuffer.length) {
            combIndex = 0;
        }

        this.combIndices[i] = combIndex;
        this.filterStores[i] = filterStore;
    }

    for (var i = 0; i < numberOfFilters; i++) {
        var allPassBuffer = this.allPassBuffers[i];
        var allPassIndex = this.allPassIndices[i];

        var input = value;
        var bufferValue = allPassBuffer[allPassIndex];
        value = -value + bufferValue;
        allPassBuffer[allPassIndex] = input + (bufferValue * 0.5);

        allPassIndex += 1;
        if (allPassIndex >= allPassBuffer.length) {
            allPassIndex = 0;
        }

        this.allPassIndices[i] = allPassIndex;
    }

    this.outputs[0].samples[0] = mix * value + (1 - mix) * dryValue;
};


/**
 * toString
 *
 * @return {String} String representation.
 */
Reverb.prototype.toString = function() {
    return 'Reverb';
};

