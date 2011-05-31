function Audio() {}

function setInterval() {}

var Introspector = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, numberOfInputs, numberOfOutputs) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, numberOfInputs,
                                                       numberOfOutputs]);
        this.timesCalled = 0;
    },

    generate: function(inputBuffers, outputBuffers) {
        this.inputBuffers = inputBuffers;
        this.outputBuffers = outputBuffers;
        this.timesCalled += 1;
    }
});



var ConstantSource = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, numberOfOutputs, fillValue) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 0,
                                                       numberOfOutputs]);
        this.fillValue = fillValue || 1;
    },

    generate: function(inputBuffers, outputBuffers) {
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
});

var InputRecorder = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, numberOfInputs) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, numberOfInputs,
                                                       0]);
        this.buffers = [];
        for (var i=0; i<numberOfInputs; i++) {
            this.buffers.push(new AudioletBuffer(1, 0));
        }
    },

    generate: function(inputBuffers, outputBuffers) {
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
});

