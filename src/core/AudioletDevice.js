/*!
 * @depends AudioletNode.js
 */

/**
 * Audio output device.  Uses sink.js to output to a range of APIs.
 */
var AudioletDevice = AudioletNode.extend({

    /**
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [sampleRate=44100] The sample rate to run at.
     * @param {Number} [numberOfChannels=2] The number of output channels.
     * @param {Number} [bufferSize=8192] A fixed buffer size to use.
     */
    constructor: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AudioletNode.call(this, audiolet, 1, 0);

        this.sink = Sink(this.tick.bind(this), numberOfChannels, bufferSize,
                         sampleRate);

        // Re-read the actual values from the sink.  Sample rate especially is
        // liable to change depending on what the soundcard allows.
        this.sampleRate = this.sink.sampleRate;
        this.numberOfChannels = this.sink.channelCount;
        this.bufferSize = this.sink.preBufferSize;

        this.writePosition = 0;
        this.buffer = null;
        this.paused = false;

        this.needTraverse = true;
        this.nodes = [];
    },

    /**
     * Overridden tick function. Pulls data from the input and writes it to the
     * device.
     *
     * @param {Float32Array} buffer Buffer to write data to.
     * @param {Number} numberOfChannels Number of channels in the buffer.
     */
    tick: function(buffer, numberOfChannels) {
        if (!this.paused) {
            var input = this.inputs[0];

            var samplesNeeded = buffer.length / numberOfChannels;
            for (var i = 0; i < samplesNeeded; i++) {
                if (this.needTraverse) {
                    this.nodes = this.traverse([]);
                    this.needTraverse = false;
                }

                // Tick in reverse order up to, but not including this node
                for (var j = this.nodes.length - 1; j > 0; j--) {
                    this.nodes[j].tick();
                }
                // Cut down tick to just sum the input samples 
                this.createInputSamples();

                for (var j = 0; j < numberOfChannels; j++) {
                    buffer[i * numberOfChannels + j] = input.samples[j];
                }

                this.writePosition += 1;
            }
        }
    },

    /**
     * Get the current output position
     *
     * @return {Number} Output position in samples.
     */
    getPlaybackTime: function() {
        return this.sink.getPlaybackTime();
    },

    /**
     * Get the current write position
     *
     * @return {Number} Write position in samples.
     */
    getWriteTime: function() {
        return this.writePosition;
    },

    /**
     * Pause the output stream, and stop everything from ticking.  The playback
     * time will continue to increase, but the write time will be paused.
     */
    pause: function() {
        this.paused = true;
    },

    /**
     * Restart the output stream.
     */
    play: function() {
       this.paused = false; 
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Audio Output Device';
    }

});