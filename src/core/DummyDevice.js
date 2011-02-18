/**
 * @depends AbstractAudioletDevice.js
 */

var DummyDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);
        this.writePosition = 0;

        this.tick.periodical(1000 * this.bufferSize / this.sampleRate, this);
    },

    tick: function() {
        AudioletNode.prototype.tick.apply(this, [this.bufferSize]);
        this.writePosition += this.bufferSize;
    },

    getTime: function() {
        return this.writePosition;
    }
});

