/**
 * @depends ../core/AudioletNode.js
 */

var Delay = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, maximumDelayTime, delayTime) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);
        this.maximumDelayTime = maximumDelayTime;
        this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
        this.buffer = new Float32Array(maximumDelayTime *
                                       this.audiolet.device.sampleRate);
        this.readWriteIndex = 0;
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];

        if (inputBuffer.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }

        // Local processing variables
        var delayTimeParameter = this.delayTime;
        var buffer = this.buffer;
        var readWriteIndex = this.readWriteIndex;
        var sampleRate = this.audiolet.device.sampleRate;

        var inputChannel = inputBuffer.getChannelData(0);
        var outputChannel = outputBuffer.getChannelData(0);
        var bufferLength = inputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            var delayTime = delayTimeParameter.getValue(i) * sampleRate;
            outputChannel[i] = buffer[readWriteIndex];
            buffer[readWriteIndex] = inputChannel[i];
            readWriteIndex += 1;
            if (readWriteIndex >= delayTime) {
                readWriteIndex = 0;
            }
        }
        this.readWriteIndex = readWriteIndex;
    }
});

