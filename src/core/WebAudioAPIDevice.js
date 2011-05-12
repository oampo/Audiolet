/**
 * @depends AbstractAudioletDevice.js
 */

var WebAudioAPIDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);

        this.numberOfChannels = numberOfChannels || 2;
        this.bufferSize = bufferSize || 8192;

        // AudioContext is called webkitAudioContext in the current
        // implementation, so look for either
        if (typeof AudioContext != 'undefined') {
            this.context = new AudioContext();
        }
        else {
            // Must be webkitAudioContext
            this.context = new webkitAudioContext();
        }

        // Ignore specified sample rate, and use whatever the context gives us
        this.sampleRate = this.context.sampleRate;

        this.node = this.context.createJavaScriptNode(this.bufferSize, 1,
                                                           1);

        this.node.onaudioprocess = this.tick.bind(this);
        this.node.connect(this.context.destination);
        this.writePosition = 0;
    },

    tick: function(event) {
        var buffer = event.outputBuffer;
        var samplesNeeded = buffer.length;
        AudioletNode.prototype.tick.apply(this, [samplesNeeded,
                                                 this.getWriteTime()]);
        var numberOfChannels = buffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel = buffer.getChannelData(i);
            channel.set(this.buffer.getChannelData(i));
        }
        this.writePosition += samplesNeeded;
    },

    getPlaybackTime: function() {
        return this.context.currentTime * this.sampleRate;
    },

    getWriteTime: function() {
        return this.writePosition;
    },

    toString: function() {
        return 'Web Audio API Device';
    }
});

