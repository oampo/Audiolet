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

    this.inputs = [];
    for (var i = 0; i < numberOfInputs; i++) {
        this.inputs.push(new AudioletInput(this, i));
    }

    this.outputs = [];
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

    this.audiolet.device.needTraverse = true;
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

    this.audiolet.device.needTraverse = true;
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
 */
AudioletNode.prototype.tick = function() {
    this.createInputSamples();
    this.createOutputSamples();

    this.generate();
};

AudioletNode.prototype.traverse = function(nodes) {
    nodes = this.traverseParents(nodes);
    if (nodes.indexOf(this) == -1) {
        nodes.push(this);
    }
    return nodes;
};

/**
 * Call the tick function on nodes which are connected to the inputs.  This
 * function should not be called manually by users.
 *
 * @param {Number} timestamp A timestamp for the block of samples.
 */
AudioletNode.prototype.traverseParents = function(nodes) {
    var numberOfInputs = this.inputs.length;
    for (var i = 0; i < numberOfInputs; i++) {
        var input = this.inputs[i];
        var numberOfStreams = input.connectedFrom.length;
        for (var j = 0; j < numberOfStreams; j++) {
            nodes = input.connectedFrom[j].node.traverse(nodes);
        }
    }
    return nodes;
};

/**
 * Process a block of samples, reading from the input buffers and putting
 * new values into the output buffers.  Override me!
 */
AudioletNode.prototype.generate = function() {
};

/**
 * Create the input buffers by grabbing data from the outputs of connected
 * nodes and summing it.  If no nodes are connected to an input, then
 * give a one channel empty buffer.
 */
AudioletNode.prototype.createInputSamples = function() {
    var numberOfInputs = this.inputs.length;
    for (var i = 0; i < numberOfInputs; i++) {
        var input = this.inputs[i];
        var numberOfInputChannels = 0;

        var connectedFrom = input.connectedFrom;
        var numberOfConnections = connectedFrom.length;
        for (var j = 0; j < numberOfConnections; j++) {
            var output = connectedFrom[j];
            var numberOfOutputChannels = output.samples.length;

            for (var k = numberOfInputChannels; k < numberOfOutputChannels;
                 k++) {
                input.samples[k] = 0;
                numberOfInputChannels += 1;
            }

            for (var k = 0; k < numberOfOutputChannels; k++) {
                input.samples[k] += output.samples[k];
            }
        }
        if (input.samples.length > numberOfInputChannels) {
            input.samples.splice(numberOfInputChannels,
                                 input.samples.length - numberOfInputChannels);
        }
    }
};


/**
* Create output buffers of the correct length.
*/
AudioletNode.prototype.createOutputSamples = function() {
    var numberOfOutputs = this.outputs.length;
    for (var i = 0; i < numberOfOutputs; i++) {
        var output = this.outputs[i];
        var numberOfChannels = output.getNumberOfChannels();
        for (var j = 0; j < numberOfChannels; j++) {
            output.samples[j] = 0;
        }
        if (output.samples.length > numberOfChannels) {
            output.samples.splice(numberOfChannels,
                                  output.samples.length - numberOfChannels);
        }
    }
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

