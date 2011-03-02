/**
 * @depends ../core/AudioletNode.js
 */

var MulAdd = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, mul, add) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 3, 1]);
        this.linkNumberOfOutputChannels(0, 0);
        this.mul = new AudioletParameter(this, 1, mul || 1);
        this.add = new AudioletParameter(this, 2, add || 0);
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];

        // Local processing variables
        var mulParameter = this.mul;
        var addParameter = this.add;

        var numberOfChannels = inputBuffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var inputChannel = inputBuffer.getChannelData(i);
            var outputChannel = outputBuffer.getChannelData(i);
            var bufferLength = inputBuffer.length;
            for (var j = 0; j < bufferLength; j++) {
                var mul = mulParameter.getValue(j);
                var add = addParameter.getValue(j);
                outputChannel[j] = inputChannel[j] * mul + add;
            }
        }
    }
});

