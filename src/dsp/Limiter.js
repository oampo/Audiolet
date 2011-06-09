/**
 * @depends ../core/AudioletGroup.js
 */

var Limiter = function(audiolet, threshold, attack, release) {
    Limiter.superclass.call(this, audiolet, 4, 1); 

    // Parameters
    var attack = attack || 0.01;
    this.attackNode = new ParameterNode(audiolet, attack);
    this.attack = this.attackNode.parameter;

    var release = release || 0.4;
    this.releaseNode = new ParameterNode(audiolet, release);
    this.release = this.releaseNode.parameter;

    this.amplitude = new Amplitude(audiolet);
    this.limitFromAmplitude = new LimitFromAmplitude(audiolet, threshold);
    this.threshold = this.limitFromAmplitude.threshold;

    this.inputs[0].connect(this.amplitude);
    this.inputs[0].connect(this.limitFromAmplitude, 0, 0);
    this.inputs[1].connect(this.limitFromAmplitude, 0, 2);
    this.inputs[2].connect(this.attackNode);
    this.inputs[3].connect(this.releaseNode);

    this.attackNode.connect(this.amplitude, 0, 1);
    this.releaseNode.connect(this.amplitude, 0, 2);

    this.amplitude.connect(this.limitFromAmplitude, 0, 1);
    this.limitFromAmplitude.connect(this.outputs[0]);
}
extend(Limiter, AudioletGroup);

Limiter.prototype.toString = function() {
    return 'Limiter';
}

var LimitFromAmplitude = function(audiolet, threshold) {
    LimitFromAmplitude.superclass.call(this, audiolet, 3, 1); 
    this.linkNumberOfOutputChannels(0, 0);
    this.threshold = new AudioletParameter(this, 2, threshold || 0.95);
}
extend(LimitFromAmplitude, AudioletNode);

LimitFromAmplitude.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var amplitudeBuffer = inputBuffers[1];
    var amplitudeChannel = inputBuffer.getChannelData(0);
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty || amplitudeBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var thresholdParameter = this.threshold;
    var threshold, thresholdChannel;
    if (thresholdParameter.isStatic()) {
        threshold = thresholdParameter.getValue();
    }
    else {
        thresholdChannel = thresholdParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = inputChannel[j];
            var amplitude = amplitudeChannel[j];
            if (thresholdChannel) {
                threshold = thresholdChannel[j];
            }

            var diff = amplitude - threshold;
            if (diff > 0) {
                outputChannel[j] = inputChannel[j] / (1 + diff);
            }
            else {
                outputChannel[j] = inputChannel[j];
            }
        }
    }
}

LimitFromAmplitude.prototype.toString = function() {
    return ('Limit From Amplitude');
}
