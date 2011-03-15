/**
 * @depends ../core/AudioletNode.js
 */

var LinearCrossFade = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, position) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 3, 1]);
        this.linkNumberOfOutputChannels(0, 0);
        this.position = new AudioletParameter(this, 2, position || 0.5);
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBufferA = inputBuffers[0];
        var inputBufferB = inputBuffers[1];
        var outputBuffer = outputBuffers[0];

        var inputChannelsA = inputBufferA.channels;
        var inputChannelsB = inputBufferB.channels;
        var outputChannels = outputBuffer.channels;

        if (inputBufferA.isEmpty || inputBufferB.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }

        // Local processing variables
        var positionParameter = this.position;
        var position, positionChannel;
        if (positionParameter.isStatic()) {
            position = positionParameter.getValue();
        }
        else {
            positionChannel = positionParameter.getChannel();
        }

        var bufferLength = outputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            if (positionChannel) {
                position = positionChannel[i];
            }

            var gainA = position;
            var gainB = 1 - position;

            var numberOfChannels = inputBufferA.numberOfChannels;
            for (var j = 0; j < numberOfChannels; j++) {
                var inputChannelA = inputChannelsA[j];
                var inputChannelB = inputChannelsB[j];
                var outputChannel = outputChannels[j];

                outputChannel[i] = inputChannelA[i] * gainA +
                                   inputChannelB[i] * gainB;
            }
        }
    },

    toString: function() {
        return 'Linear Cross Fader';
    }
});
