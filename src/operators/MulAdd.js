/**
 * @depends ../core/AudioletNode.js
 */

var MulAdd = function(audiolet, mul, add) {
    MulAdd.superclass.call(this, audiolet, 3, 1); 
    this.linkNumberOfOutputChannels(0, 0);
    this.mul = new AudioletParameter(this, 1, mul || 1);
    this.add = new AudioletParameter(this, 2, add || 0);
}
extend(MulAdd, AudioletNode);

MulAdd.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var mulParameter = this.mul;
    var mul, mulChannel;
    if (mulParameter.isStatic()) {
        mul = mulParameter.getValue();
    }
    else {
        mulChannel = mulParameter.getChannel();
    }

    var addParameter = this.add;
    var add, addChannel;
    if (addParameter.isStatic()) {
        add = addParameter.getValue();
    }
    else {
        addChannel = addParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (mulChannel) {
                mul = mulChannel[j];
            }
            if (addChannel) {
                add = addChannel[j];
            }
            outputChannel[j] = inputChannel[j] * mul + add;
        }
    }
}

MulAdd.prototype.toString = function() {
    return 'Multiplier/Adder';
}

