/**
 * @depends ../core/AudioletNode.js
 */

var SoftClip = function(audiolet) {
    SoftClip.superclass.call(this, audiolet, 1, 1); 
    this.linkNumberOfOutputChannels(0, 0);
}
extend(SoftClip, AudioletNode);

SoftClip.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = inputChannel[j];
            if (value > 0.5) {
                outputChannel[j] = (value - 0.25) / value;
            }
            else if (value < -0.5) {
                outputChannel[j] = (-value - 0.25) / value;
            }
            else {
                outputChannel[j] = value;
            }
        }
    }
}

SoftClip.prototype.toString = function() {
    return ('SoftClip');
}

