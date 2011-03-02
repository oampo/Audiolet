/**
 * @depends AbstractAudioletDevice.js
 */

var DummyDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);

        this.sampleRate = sampleRate || 44100.0;
        this.numberOfChannels = numberOfChannels || 2;
        this.bufferSize = bufferSize || 8192;

        this.writePosition = 0;

        this.tick.periodical(1000 * this.bufferSize / this.sampleRate, this);
    },

    tick: function() {
        AudioletNode.prototype.tick.apply(this, [this.bufferSize,
                                                 this.writePosition]);
        this.writePosition += this.bufferSize;
    },

    getPlaybackTime: function() {
        return this.writePosition - this.bufferSize;
    },

    getWriteTime: function() {
        return this.writePosition;
    },

    toString: function() {
        return "Dummy Device";
    }
});

