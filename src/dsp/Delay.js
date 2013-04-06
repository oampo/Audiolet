/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A simple delay line.
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 *
 * **Outputs**
 *
 * - Delayed audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 */
var Delay = AudioletNode.extend({

    parameters: {
        delayTime: [1, 1]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} maximumDelayTime The largest allowable delay time.
     * @param {Number} delayTime The initial delay time.
     */
    constructor: function(audiolet, maximumDelayTime, delayTime) {
        AudioletNode.call(this, audiolet, 2, 1, {
            delayTime: delayTime
        });
        this.linkNumberOfOutputChannels(0, 0);
        this.maximumDelayTime = maximumDelayTime;
        var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
        this.buffers = [];
        this.readWriteIndex = 0;
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];
        var output = this.outputs[0];

        var sampleRate = this.audiolet.device.sampleRate;

        var delayTime = this.get('delayTime') * sampleRate;

        var numberOfChannels = input.samples.length;

        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= this.buffers.length) {
                var bufferSize = this.maximumDelayTime * sampleRate;
                this.buffers.push(new Float32Array(bufferSize));
            }

            var buffer = this.buffers[i];
            output.samples[i] = buffer[this.readWriteIndex];
            buffer[this.readWriteIndex] = input.samples[i];
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
        return 'Delay';
    }

});