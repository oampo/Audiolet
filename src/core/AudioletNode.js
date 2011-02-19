var AudioletNode = new Class({
    initialize: function(audiolet, numberOfInputs, numberOfOutputs, generate) {
        this.audiolet = audiolet;
        this.numberOfInputs = numberOfInputs;
        this.numberOfOutputs = numberOfOutputs;

        this.inputs = [];
        var numberOfInputs = this.numberOfInputs;
        for (var i = 0; i < numberOfInputs; i++) {
            this.inputs.push(new AudioletInput(this, i));
        }

        this.outputs = [];
        var numberOfOutputs = this.numberOfOutputs;
        for (var i = 0; i < numberOfOutputs; i++) {
            this.outputs.push(new AudioletOutput(this, i));
        }

        if (generate) {
            this.generate = generate;
        }

        this.timestamp = null;
    },

    connect: function(node, output, input) {
        if (instanceOf(node, AudioletGroup)) {
            // Connect to the pass-through node rather than the group
            node = node.inputs[input || 0];
        } 
        var outputPin = this.outputs[output || 0];
        var inputPin = node.inputs[input || 0];
        outputPin.connect(inputPin);
        inputPin.connect(outputPin);
    },

    disconnect: function(node, output, input) {
        if (instanceOf(node, AudioletGroup)) {
            node = node.inputs[input || 0];
        }

        var outputPin = this.outputs[output || 0];
        var inputPin = node.inputs[input];
        inputPin.disconnect(outputPin);
        outputPin.disconnect(inputPin);
    },

    tick: function(length, timestamp) {
        if (timestamp != this.timestamp) {
            this.tickParents(length, timestamp);

            var inputBuffers = this.createInputBuffers(length);
            var outputBuffers = this.createOutputBuffers(length);
            this.generate(inputBuffers, outputBuffers);
            this.timestamp = timestamp;
        }
    },

    tickParents: function(length, timestamp) {
        var numberOfInputs = this.numberOfInputs;
        for (var i = 0; i < numberOfInputs; i++) {
            var input = this.inputs[i];
            var numberOfStreams = input.connectedFrom.length;
            for (var j = 0; j < numberOfStreams; j++) {
                input.connectedFrom[j].node.tick(length, timestamp);
            }
        }
    },

    // Overwrite me!
    generate: function(inputBuffers, outputBuffers) {
    },

    createInputBuffers: function(length) {
        var inputBuffers = [];
        var numberOfInputs = this.numberOfInputs;
        for (var i = 0; i < numberOfInputs; i++) {
            var input = this.inputs[i];

            var connectedFrom = input.connectedFrom;
            var numberOfConnections = connectedFrom.length;
            if (numberOfConnections) {
                // TODO: Optimizations
                // We have connections

                // Calculate the maximum number of channels in a connection
                var numberOfChannels = 0;
                var largestOutput;
                for (var j=0; j<numberOfConnections; j++) {
                    var output = connectedFrom[j];
                    var outputChannels = output.buffer.numberOfChannels;
                    if (outputChannels > numberOfChannels) {
                        numberOfChannels = outputChannels;
                        largestOutput = output;
                    }
                }

                // Resize the input buffer accordingly
                var inputBuffer = input.buffer;
                inputBuffer.resize(numberOfChannels, length);

                // Set the buffer to the largest input
                inputBuffer.set(largestOutput.buffer);

                // Sum the other inputs
                for (var j = 0; j < numberOfConnections; j++) {
                    var output = connectedFrom[j];
                    if (output != largestOutput) {
                        inputBuffer.add(output.buffer);
                    }
                }

                input.buffer = inputBuffer;
                inputBuffers.push(inputBuffer);
            }
            else {
                // If we don't have any connections give a null
                inputBuffers.push(null);
            }
        }
        return (inputBuffers);
    },

    createOutputBuffers: function(length) {
        // Create the output buffers
        var outputBuffers = [];
        var numberOfOutputs = this.numberOfOutputs;
        for (var i = 0; i < numberOfOutputs; i++) {
            var output = this.outputs[i];
            output.buffer.resize(output.getNumberOfChannels(), length);
            outputBuffers.push(output.buffer);
        }
        return (outputBuffers);
    },

    remove: function() {
        // Disconnect inputs
        var numberOfInputs = this.inputs.length;
        for (var i=0; i<numberOfInputs; i++) {
            var input = this.inputs[i];
            var numberOfStreams = input.connectedFrom.length;
            for (var j=0; j<numberOfStreams; j++) {
                var outputPin = input.connectedFrom[j];
                var output = outputPin.node;
                output.disconnect(this, outputPin.index, i);
            }
        }

        // Disconnect outputs
        var numberOfOutputs = this.outputs.length;
        for (var i=0; i<numberOfOutputs; i++) {
            var output = this.outputs[i];
            var numberOfStreams = output.connectedTo.length;
            for (var j=0; j<numberOfStreams; j++) {
                var inputPin = input.connectedFrom[j];
                var input = inputPin.node;
                this.disconnect(input, i, inputPin.index);
            }
        }
    }
});

