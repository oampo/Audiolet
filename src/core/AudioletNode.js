/**
 * The basic building block of Audiolet applications.  Nodes are connected
 * together to create a processing graph which governs the flow of audio data.
 * AudioletNodes can contain any number of inputs and outputs which send and
 * receive one or more channels of audio data.  Audio data is created and
 * processed using the generate function, which is called whenever new data is
 * needed.
 *
 * @constructor
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} numberOfInputs The number of inputs.
 * @param {Number} numberOfOutputs The number of outputs.
 * @param {Function} [generate] A replacement for the generate function.
 */
var AudioletNode = function(audiolet, numberOfInputs, numberOfOutputs,
                            generate) {
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
};

/**
 * Connect the node to another node or group.
 *
 * @param {AudioletNode|AudioletGroup} node The node to connect to.
 * @param {Number} [output=0] The index of the output to connect from.
 * @param {Number} [input=0] The index of the input to connect to.
 */
AudioletNode.prototype.connect = function(node, output, input) {
    if (node instanceof AudioletGroup) {
        // Connect to the pass-through node rather than the group
        node = node.inputs[input || 0];
        input = 0;
    }
    var outputPin = this.outputs[output || 0];
    var inputPin = node.inputs[input || 0];
    outputPin.connect(inputPin);
    inputPin.connect(outputPin);
};

/**
 * Disconnect the node from another node or group
 *
 * @param {AudioletNode|AudioletGroup} node The node to disconnect from.
 * @param {Number} [output=0] The index of the output to disconnect.
 * @param {Number} [input=0] The index of the input to disconnect.
 */
AudioletNode.prototype.disconnect = function(node, output, input) {
    if (node instanceof AudioletGroup) {
        node = node.inputs[input || 0];
        input = 0;
    }

    var outputPin = this.outputs[output || 0];
    var inputPin = node.inputs[input || 0];
    inputPin.disconnect(outputPin);
    outputPin.disconnect(inputPin);
};

/**
 * Force an output to contain a fixed number of channels.
 *
 * @param {Number} output The index of the output.
 * @param {Number} numberOfChannels The number of channels.
 */
AudioletNode.prototype.setNumberOfOutputChannels = function(output,
                                                            numberOfChannels) {
    this.outputs[output].numberOfChannels = numberOfChannels;
};

/**
 * Link an output to an input, forcing the output to always contain the
 * same number of channels as the input.
 *
 * @param {Number} output The index of the output.
 * @param {Number} input The index of the input.
 */
AudioletNode.prototype.linkNumberOfOutputChannels = function(output, input) {
    this.outputs[output].linkNumberOfChannels(this.inputs[input]);
};

/**
 * Process a buffer of samples, first pulling any necessary data from
 * higher up the processing graph.  This function should not be called
 * manually by users, who should instead rely on automatic ticking from
 * connections to the AudioletDevice.
 *
 * @param {Number} length The number of samples to process.
 * @param {Number} timestamp A timestamp for the block of samples.
 */
AudioletNode.prototype.tick = function(length, timestamp) {
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
};

/**
 * Call the tick function on nodes which are connected to the inputs.  This
 * function should not be called manually by users.
 *
 * @param {Number} length The number of samples to process.
 * @param {Number} timestamp A timestamp for the block of samples.
 */
AudioletNode.prototype.tickParents = function(length, timestamp) {
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
};

/**
 * Process a block of samples, reading from the input buffers and putting
 * new values into the output buffers.  Override me!
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
AudioletNode.prototype.generate = function(inputBuffers, outputBuffers) {
    // Sane default - pass along any empty flags
    var numberOfInputs = inputBuffers.length;
    var numberOfOutputs = outputBuffers.length;
    for (var i = 0; i < numberOfInputs; i++) {
        if (i < numberOfOutputs && inputBuffers[i].isEmpty) {
            outputBuffers[i].isEmpty = true;
        }
    }
};

/**
 * Create the input buffers by grabbing data from the outputs of connected
 * nodes and summing it.  If no nodes are connected to an input, then
 * give a one channel empty buffer.
 *
 * @param {Number} length The number of samples for the resulting buffers.
 * @return {AudioletBuffer[]} The input buffers.
 */
AudioletNode.prototype.createInputBuffers = function(length) {
    var inputBuffers = [];
    var numberOfInputs = this.numberOfInputs;
    for (var i = 0; i < numberOfInputs; i++) {
        var input = this.inputs[i];

        // Find the non-empty output with the most channels
        var numberOfChannels = 0;
        var largestOutput = null;
        var connectedFrom = input.connectedFrom;
        var numberOfConnections = connectedFrom.length;
        for (var j = 0; j < numberOfConnections; j++) {
            var output = connectedFrom[j];
            var outputBuffer = output.buffer;
            if (outputBuffer.numberOfChannels > numberOfChannels &&
                !outputBuffer.isEmpty) {
                numberOfChannels = outputBuffer.numberOfChannels;
                largestOutput = output;
            }
        }

        if (largestOutput) {
            // TODO: Optimizations
            // We have non-empty connections

            // Resize the input buffer accordingly
            var inputBuffer = input.buffer;
            inputBuffer.resize(numberOfChannels, length, true);
            inputBuffer.isEmpty = false;

            // Set the buffer using the largest output
            inputBuffer.set(largestOutput.getBuffer(length));

            // Sum the rest of the outputs
            for (var j = 0; j < numberOfConnections; j++) {
                var output = connectedFrom[j];
                if (output != largestOutput && !output.buffer.isEmpty) {
                    inputBuffer.add(output.getBuffer(length));
                }
            }

            inputBuffers.push(inputBuffer);
        }
        else {
            // If we don't have any non-empty connections give a single
            // channel empty buffer of the correct length
            var inputBuffer = input.buffer;
            inputBuffer.resize(1, length, true);
            inputBuffer.isEmpty = true;
            inputBuffers.push(inputBuffer);
        }
    }
    return inputBuffers;
};

/**
 * Create output buffers of the correct length.
 *
 * @param {Number} length The number of samples for the resulting buffers.
 * @return {AudioletNode[]} The output buffers.
 */
AudioletNode.prototype.createOutputBuffers = function(length) {
    // Create the output buffers
    var outputBuffers = [];
    var numberOfOutputs = this.numberOfOutputs;
    for (var i = 0; i < numberOfOutputs; i++) {
        var output = this.outputs[i];
        output.buffer.resize(output.getNumberOfChannels(), length, true);
        output.buffer.isEmpty = false;
        outputBuffers.push(output.buffer);
    }
    return (outputBuffers);
};

/**
 * Remove the node completely from the processing graph, disconnecting all
 * of its inputs and outputs.
 */
AudioletNode.prototype.remove = function() {
    // Disconnect inputs
    var numberOfInputs = this.inputs.length;
    for (var i = 0; i < numberOfInputs; i++) {
        var input = this.inputs[i];
        var numberOfStreams = input.connectedFrom.length;
        for (var j = 0; j < numberOfStreams; j++) {
            var outputPin = input.connectedFrom[j];
            var output = outputPin.node;
            output.disconnect(this, outputPin.index, i);
        }
    }

    // Disconnect outputs
    var numberOfOutputs = this.outputs.length;
    for (var i = 0; i < numberOfOutputs; i++) {
        var output = this.outputs[i];
        var numberOfStreams = output.connectedTo.length;
        for (var j = 0; j < numberOfStreams; j++) {
            var inputPin = output.connectedTo[j];
            var input = inputPin.node;
            this.disconnect(input, i, inputPin.index);
        }
    }
};

