/**
 * @depends ../core/AudioletNode.js
 */

var Gain = function(audiolet, gain) {
    Gain.superclass.call(this, audiolet, 2, 1); 
    this.linkNumberOfOutputChannels(0, 0);
    this.gain = new AudioletParameter(this, 1, gain || 1);
}
extend(Gain, AudioletNode);

Gain.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var gainParameter = this.gain;
    var gain, gainChannel;
    if (gainParameter.isStatic()) {
        gain = gainParameter.getValue();
    }
    else {
        gainChannel = gainParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (gainChannel) {
                gain = gainChannel[j];
            }
            outputChannel[j] = inputChannel[j] * gain;
        }
    }
}

Gain.prototype.toString = function() {
    return ('Gain');
}
