/**
 * @depends ../core/AudioletNode.js
 */

var Pan = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);
        // Hardcode two output channels
        this.setNumberOfOutputChannels(0, 2);
        this.pan = new AudioletParameter(this, 1, 0.5);
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];

        if (inputBuffer.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }

        var inputChannel = inputBuffer.getChannelData(0);
        var leftOutputChannel = outputBuffer.getChannelData(0);
        var rightOutputChannel = outputBuffer.getChannelData(1);

        // Local processing variables
        var pan = this.pan;

        var bufferLength = outputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            var scaledPan = this.pan.getValue(i) * Math.PI / 2;
            var value = inputChannel[i];
            // TODO: Use sine/cos tables?
            leftOutputChannel[i] = value * Math.cos(scaledPan);
            rightOutputChannel[i] = value * Math.sin(scaledPan);
        }
    },

    toString: function() {
        return "Stereo Panner";
    }
});
