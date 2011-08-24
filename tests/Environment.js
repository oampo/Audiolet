window = {};
Sink.sinks['moz'].enabled = false;
Sink.sinks['webkit'].enabled = false;
Sink.sinks['dummy'].enabled = true;

function Audio() {}

function setInterval() {}

var Introspector = function(audiolet, numberOfInputs, numberOfOutputs) {
    AudioletNode.call(this, audiolet, numberOfInputs, numberOfOutputs);
    this.timesCalled = 0;
}
extend(Introspector, AudioletNode); 

Introspector.prototype.generate = function(inputBuffers, outputBuffers) {
    this.inputBuffers = inputBuffers;
    this.outputBuffers = outputBuffers;
    this.timesCalled += 1;
}


var ConstantSource = function(audiolet, numberOfOutputs, fillValue) {
    AudioletNode.call(this, audiolet, 0, numberOfOutputs);
    this.fillValue = fillValue || 1;
}
extend(ConstantSource, AudioletNode); 

ConstantSource.prototype.generate = function(inputBuffers, outputBuffers) {
    var fillValue = this.fillValue;
    var numberOfBuffers = outputBuffers.length;
    for (var i=0; i<numberOfBuffers; i++) {
        var buffer = outputBuffers[i];
        var numberOfChannels = buffer.numberOfChannels;
        var bufferLength = buffer.length;
        for (var j=0; j<numberOfChannels; j++) {
            var data = buffer.getChannelData(j);
            for (var k=0; k<bufferLength; k++) {
                data[k] = fillValue;
            }
        }
    }
}


var EmptySource = function(audiolet, numberOfOutputs) {
    AudioletNode.call(this, audiolet, 0, numberOfOutputs);
}
extend(EmptySource, AudioletNode); 

EmptySource.prototype.generate = function(inputBuffers, outputBuffers) {
    var numberOfBuffers = outputBuffers.length;
    for (var i=0; i<numberOfBuffers; i++) {
        outputBuffers[i].isEmpty = true;
    }
}


var InputRecorder = function(audiolet, numberOfInputs) {
    AudioletNode.call(this, audiolet, numberOfInputs, 0);
    this.buffers = [];
    for (var i=0; i<numberOfInputs; i++) {
        this.buffers.push(new AudioletBuffer(1, 0));
    }
}
extend(InputRecorder, AudioletNode); 

InputRecorder.prototype.generate = function(inputBuffers, outputBuffers) {
    var buffers = this.buffers;

    for (var i=0; i<inputBuffers.length; i++) {
        var buffer = inputBuffers[i];
        var recordBuffer = buffers[i];
        if (buffer.isEmpty) {
            recordBuffer.push(new Float32Array(buffer.length));
        }
        else {
            recordBuffer.push(buffer);
        }
    }
}


