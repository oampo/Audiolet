/**
 * @depends AudioletNode.js
 */
var AbstractAudioletDevice = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 0]);
        this.audiolet = audiolet;
        this.numberOfChannels = this.audiolet.numberOfChannels;
        this.sampleRate = this.audiolet.sampleRate;
        this.bufferSize = this.audiolet.bufferSize;
        this.buffer = null;
    },

    generate: function(inputBuffers, outputBuffers) {
        this.buffer = inputBuffers[0];
    },

    getPlaybackTime: function() {
        return 0;
    },

    getWriteTime: function() {
        return 0;
    }
});

