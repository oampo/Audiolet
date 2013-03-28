window = {};
Sink.sinks['moz'].enabled = false;
Sink.sinks['webkit'].enabled = false;
Sink.sinks['dummy'].enabled = true;

function Audio() {}

function setInterval() {}

var Introspector = AudioletNode.extend({

    constructor: function(audiolet, numberOfInputs, numberOfOutputs) {
        AudioletNode.call(this, audiolet, numberOfInputs, numberOfOutputs);
        this.timesCalled = 0;
    },

    generate: function() {
        this.timesCalled += 1;
    }

});

var ConstantSource = AudioletNode.extend({

    constructor: function(audiolet, numberOfOutputs, fillValue) {
        AudioletNode.call(this, audiolet, 0, numberOfOutputs);
        this.fillValue = fillValue || 1;
    }, 

    generate: function() {
        var numberOfOutputs = this.outputs.length;
        for (var i=0; i<numberOfOutputs; i++) {
            var numberOfChannels = this.outputs[i].samples.length;
            for (var j=0; j<numberOfChannels; j++) {
                this.outputs[i].samples[j] = this.fillValue;
            }
        }
    }

});

var InputRecorder = AudioletNode.extend({

    constructor: function(audiolet, numberOfInputs) {
        AudioletNode.call(this, audiolet, numberOfInputs, 0);
        this.buffers = [];
        for (var i=0; i<numberOfInputs; i++) {
            this.buffers.push([]);
        }
    },

    generate: function() {
        var buffers = this.buffers;

        for (var i=0; i<this.inputs.length; i++) {
            var input = this.inputs[i];
            var numberOfChannels = input.samples.length;
            var recordBuffer = buffers[i];
            for (var j=0; j<numberOfChannels; j++) {
                if (j >= recordBuffer.length) {
                    recordBuffer.push([]);
                }
                recordBuffer[j].push(input.samples[j]);
            }
        }
    },

    reset: function() {
        for (var i=0; i<this.inputs.length; i++) {
            this.buffers[i] = [];
        }
    }

});