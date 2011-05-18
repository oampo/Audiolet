/**
 * @depends ../core/PassThroughNode.js
 */

var BadValueDetector = new Class({
    Extends: PassThroughNode,
    initialize: function(audiolet, callback) {
        PassThroughNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.linkNumberOfOutputChannels(0, 0);

        if (callback) {
            this.callback = callback;
        }
    },

    // Override me
    callback: function(value, channel, index) {
        console.error(value + " detected at channel " + channel + " index "
                      + index);
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];

        if (inputBuffer.isEmpty) {
            return;
        }

        var numberOfChannels = inputBuffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel = inputBuffer.getChannelData(i);

            var bufferLength = inputBuffer.length;
            for (var j = 0; j < bufferLength; j++) {
                var value = channel[j];
                if (typeof value == 'undefined' ||
                    value == null ||
                    isNaN(value) ||
                    value == Infinity ||
                    value == -Infinity) {
                    this.callback(value, i, j);
                }
            }
        }
    },

    toString: function() {
        return 'Bad Value Detector';
    }
});

