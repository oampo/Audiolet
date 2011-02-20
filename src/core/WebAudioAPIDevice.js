/**
 * @depends AbstractAudioletDevice.js
 */

var WebAudioAPIDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);

        this.sampleRate = sampleRate || 44100.0;
        this.numberOfChannels = numberOfChannels || 2;
        this.bufferSize = bufferSize || 8192;

        // AudioContext is called webkitAudioContext in the current
        // implementation, so look for either
        var AudioContext, webkitAudioContext;
        AudioContext = AudioContext || webkitAudioContext;
        this.context = new AudioContext(this.sampleRate);

        this.node = this.context.createJavaScriptAudioNode(this.bufferSize, 1,
                                                           1);

        this.node.onprocessaudio = this.tick;
        this.writePosition = 0;
    },

    tick: function(event) {
        var buffer = event.outputBuffer[0];
        var samplesNeeded = buffer.length;
        AudioletNode.prototype.tick.apply(this, [samplesNeeded]);
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
    }
});

