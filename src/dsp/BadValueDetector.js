/**
 * @depends ../core/PassThroughNode.js
 */

var BadValueDetector = function(audiolet, callback) {
    PassThroughNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);

    if (callback) {
        this.callback = callback;
    }
}
extend(BadValueDetector, PassThroughNode);

// Override me
BadValueDetector.prototype.callback = function(value, channel, index) {
    console.error(value + " detected at channel " + channel + " index "
                  + index);
}

BadValueDetector.prototype.generate = function(inputBuffers, outputBuffers) {
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
}

BadValueDetector.prototype.toString = function() {
    return 'Bad Value Detector';
}
