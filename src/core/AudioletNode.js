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
            // Need to set the timestamp before we tick the parents so we
            // can't get into infinite loops where there is feedback in the
            // graph
            this.timestamp = timestamp;
            this.tickParents(length, timestamp);

            var inputBuffers = this.createInputBuffers(length);
            var outputBuffers = this.createOutputBuffers(length);

            this.generate(inputBuffers, outputBuffers);
        }
    },

    tickParents: function(length, timestamp) {
        var numberOfInputs = this.numberOfInputs;
        for (var i = 0; i < numberOfInputs; i++) {
            var input = this.inputs[i];
            var numberOfStreams = input.connectedFrom.length;
            // Tick backwards, as the input may disconnect itself during the
            // loop
            for (var j = 0; j < numberOfStreams; j++) {
                var index = numberOfStreams - j - 1;
                input.connectedFrom[index].node.tick(length, timestamp);
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

                var numberOfChannels = 0;
                var largestOutput = null;
                for (var j=0; j<numberOfConnections; j++) {
                    var output = connectedFrom[j];
                    var outputBuffer = output.buffer;
                    if (outputBuffer.numberOfChannels > numberOfChannels) {
                        numberOfChannels = outputBuffer.numberOfChannels;
                        largestOutput = output;
                    }
                }

                // Resize the input buffer accordingly
                var inputBuffer = input.buffer;
                inputBuffer.resize(numberOfChannels, length, true);

                // Set the buffer using the largest output
                inputBuffer.set(largestOutput.getBuffer(length));
                
                // Sum the rest of the outputs
                for (var j = 0; j < numberOfConnections; j++) {
                    var output = connectedFrom[j];
                    if (output != largestOutput) {
                        inputBuffer.add(output.getBuffer(length));
                    }
                }

                inputBuffers.push(inputBuffer);
            }
            else {
                // If we don't have any connections give a single channel empty
                // buffer of the correct length
                var inputBuffer = input.buffer;
                inputBuffer.resize(1, length, true);
                inputBuffer.isEmpty = true;
                inputBuffers.push(inputBuffer);
            }
        }
        return inputBuffers;
    },

    createOutputBuffers: function(length) {
        // Create the output buffers
        var outputBuffers = [];
        var numberOfOutputs = this.numberOfOutputs;
        for (var i = 0; i < numberOfOutputs; i++) {
            var output = this.outputs[i];
            output.buffer.resize(output.getNumberOfChannels(), length, true);
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
                var inputPin = output.connectedTo[j];
                var input = inputPin.node;
                this.disconnect(input, i, inputPin.index);
            }
        }
    }
});

