/**
 * @depends ../core/AudioletNode.js
 */

var DiscontinuityDetector = new Class({
    Extends: PassThroughNode,
    initialize: function(audiolet, threshold, callback) {
        PassThroughNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.linkNumberOfOutputChannels(0, 0);

        this.threshold = threshold || 0.2;
        if (callback) {
            this.callback = callback;
        }
        this.lastValues = [];

    },

    // Override me
    callback: function(size, channel, index) {
        console.error("Discontinuity of " + size + " detected on channel " +
                      channel + " index " + index);
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];

        if (inputBuffer.isEmpty) {
            this.lastValues = [];
            return;
        }

        var lastValues = this.lastValues;
        var threshold = this.threshold;

        var numberOfChannels = inputBuffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel = inputBuffer.getChannelData(i);

            if (i >= lastValues.length) {
                lastValues.push(null);
            }
            var lastValue = lastValues[i];

            var bufferLength = inputBuffer.length;
            for (var j = 0; j < bufferLength; j++) {
                var value = channel[j];
                if (lastValue != null) {
                    if (Math.abs(lastValue - value) > threshold) {
                        this.callback(Math.abs(lastValue - value), i, j);
                    }
                }
                lastValue = value;
            }

            lastValues[i] = lastValue;
        }
    },

    toString: function() {
        return 'Discontinuity Detector';
    }
});

