/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Damped comb filter
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Decay Time
 * - Damping
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - decayTime Time for the echoes to decay by 60dB.  Linked to input 2.
 * - damping The amount of high-frequency damping of echoes.  Linked to input 3.
 */
var DampedCombFilter = AudioletNode.extend({

    defaults: {
        delayTime: [1, 1],
        decayTime: [2, null],
        damping: [3, null]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} maximumDelayTime The largest allowable delay time.
     * @param {Number} delayTime The initial delay time.
     * @param {Number} decayTime The initial decay time.
     * @param {Number} damping The initial amount of damping.
     */
    constructor: function(audiolet, maximumDelayTime, delayTime,
                                decayTime, damping) {
        AudioletNode.call(this, audiolet, 4, 1, {
            delayTime: delayTime,
            decayTime: decayTime,
            damping: damping
        });
        this.linkNumberOfOutputChannels(0, 0);
        this.maximumDelayTime = maximumDelayTime;
        var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
        this.buffers = [];
        this.readWriteIndex = 0;
        this.filterStores = [];
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.device.sampleRate;

        var delayTime = this.get('delayTime') * sampleRate;
        var decayTime = this.get('decayTime') * sampleRate;
        var damping = this.get('damping');
        var feedback = Math.exp(-3 * delayTime / decayTime);

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.buffers.length) {
                var bufferSize = this.maximumDelayTime * sampleRate;
                this.buffers.push(new Float32Array(bufferSize));
            }

            if (i >= this.filterStores.length) {
                this.filterStores.push(0);
            }

            var buffer = this.buffers[i];
            var filterStore = this.filterStores[i];

            var outputValue = buffer[this.readWriteIndex];
            filterStore = (outputValue * (1 - damping)) +
                          (filterStore * damping);
            output.samples[i] = outputValue;
            buffer[this.readWriteIndex] = input.samples[i] +
                                          feedback * filterStore;

            this.filterStores[i] = filterStore;
        }

        this.readWriteIndex += 1;
        if (this.readWriteIndex >= delayTime) {
            this.readWriteIndex = 0;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Damped Comb Filter';
    }

});