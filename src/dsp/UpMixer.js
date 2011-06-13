/**
 * @depends ../core/AudioletNode.js
 */

var UpMixer = function(audiolet, outputChannels) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.outputChannels = outputChannels;
    this.outputs[0].numberOfChannels = outputChannels;
};
extend(UpMixer, AudioletNode);

UpMixer.prototype.generate = function(inputBuffers, outputBuffers) {
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
};

UpMixer.prototype.toString = function() {
    return 'UpMixer';
};

