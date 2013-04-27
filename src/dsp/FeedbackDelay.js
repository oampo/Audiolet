/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Delay line with feedback
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Feedback
 * - Mix
 *
 * **Outputs**
 *
 * - Delayed audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - feedback The amount of feedback.  Linked to input 2.
 * - mix The amount of delay to mix into the dry signal.  Linked to input 3.
 */
var FeedbackDelay = AudioletNode.extend({

    defaults: {
        delayTime: [1, 1],
        feedback: [2, 0.5],
        mix: [3, 1]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} maximumDelayTime The largest allowable delay time.
     * @param {Number} delayTime The initial delay time.
     * @param {Number} feedabck The initial feedback amount.
     * @param {Number} mix The initial mix amount.
     */
    constructor: function(audiolet, maximumDelayTime, delayTime, feedback,
                             mix) {
        AudioletNode.call(this, audiolet, 4, 1, {
            delayTime: delayTime,
            feedback: feedback,
            mix: mix
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

        var sampleRate = this.audiolet.output.device.sampleRate;

        var delayTime = this.get('delayTime') * sampleRate;
        var feedback = this.get('feedback');
        var mix = this.get('mix');

        var numberOfChannels = input.samples.length;
        var numberOfBuffers = this.buffers.length;
        for (var i = 0; i < numberOfChannels; i++) {
            if (i >= numberOfBuffers) {
                // Create buffer for channel if it doesn't already exist
                var bufferSize = this.maximumDelayTime * sampleRate;
                this.buffers.push(new Float32Array(bufferSize));
            }

            var buffer = this.buffers[i];

            var inputSample = input.samples[i];
            var bufferSample = buffer[this.readWriteIndex];

            output.samples[i] = mix * bufferSample + (1 - mix) * inputSample;
            buffer[this.readWriteIndex] = inputSample + feedback * bufferSample;
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
        return 'Feedback Delay';
    }

});