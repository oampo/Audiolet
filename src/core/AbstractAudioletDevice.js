/*!
 * @depends AudioletNode.js
 */

/**
 * An abstract base class for audio output devices
 *
 * @extends AudioletNode
 */
var AbstractAudioletDevice = new Class({
    Extends: AudioletNode,
    /**
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object
     */
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 0]);
        this.audiolet = audiolet;
        this.buffer = null;
    },

    /**
     * Default generate function.  Makes the input buffer available as a
     * member.
     *
     * @param {AudioletBuffer[]} inputBuffers An array containing the input buffer
     * @param {AudioletBuffer[]} outputBuffers An empty array
     */
    generate: function(inputBuffers, outputBuffers) {
        this.buffer = inputBuffers[0];
    },

    /**
     * Default playback time function.
     *
     * @returns {Number} Zero
     */
    getPlaybackTime: function() {
        return 0;
    },

    /**
     * Default write time function.
     *
     * @returns {Number} Zero
     */
    getWriteTime: function() {
        return 0;
    },

    /**
     * toString
     *
     * @returns {String}
     */
    toString: function() {
        return 'Device';
    }
});

