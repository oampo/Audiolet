/**
 * @depends ../core/AudioletNode.js
 */
var WhiteNoise = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 0, 1]);
    },

    generate: function(inputBuffers, outputBuffers) {
        var buffer = outputBuffers[0];
        var channel = buffer.getChannelData(0);

        // Processing loop
        var bufferLength = buffer.length;
        for (var i = 0; i < bufferLength; i++) {
            channel[i] = Math.random() * 2 - 1;
        }
    },

    toString: function() {
        return 'White Noise';
    }
});

