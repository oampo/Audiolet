/**
 * @depends ../core/AudioletNode.js
 */

var UpMixer = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, outputChannels) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.outputChannels = outputChannels;
        this.outputs[0].numberOfChannels = outputChannels;
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];

        if (inputBuffer.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }

        var outputChannels = this.outputChannels;

        var numberOfChannels = inputBuffer.numberOfChannels;
        for (var i = 0; i < outputChannels; i++) {
            var inputChannel = inputBuffer.getChannelData(i % numberOfChannels);
            var outputChannel = outputBuffer.getChannelData(i);
            outputChannel.set(inputChannel);
        }
    },

    toString: function() {
        return "UpMixer";
    }
});

