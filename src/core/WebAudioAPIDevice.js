/**
 * @depends AbstractAudioletDevice.js
 */

var WebAudioAPIDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);
        // AudioContext is called webkitAudioContext in the current
        // implementation, so look for either
        var AudioContext, webkitAudioContext;
        AudioContext = AudioContext || webkitAudioContext;
        this.context = new AudioContext(this.sampleRate);

        this.node = this.context.createJavaScriptAudioNode(this.bufferSize, 1,
                                                           1);

        this.node.onprocessaudio = this.tick;
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
    },

    getTime: function() {
        return this.context.currentTime * this.sampleRate;
    }
});

