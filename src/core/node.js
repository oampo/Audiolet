var Input = require('./input');
var Output = require('./output');

/**
 * The basic building block of Audiolet applications.  Nodes are connected
 * together to create a processing graph which governs the flow of audio data.
 * Nodes can contain any number of inputs and outputs which send and
 * receive one or more channels of audio data.  Audio data is created and
 * processed using the generate function, which is called whenever new data is
 * needed.
 *
 * @constructor
 * @param {Audiolet} context The context object.
 * @param {Number} numberOfInputs The number of inputs.
 * @param {Number} numberOfOutputs The number of outputs.
 * @param {Function} [generate] A replacement for the generate function.
 */
var Node = function(context, numberOfInputs, numberOfOutputs,
                            generate) {
    this.context = context;

    this.inputs = [];
    for (var i = 0; i < numberOfInputs; i++) {
        this.inputs.push(new Input(this, i));
    }

    this.outputs = [];
    for (var i = 0; i < numberOfOutputs; i++) {
        this.outputs.push(new Output(this, i));
    }

    if (generate) {
        this.generate = generate;
    }
};

/**
 * Connect the node to another node or group.
 *
 * @param {Node|Group} node The node to connect to.
 * @param {Number} [output=0] The index of the output to connect from.
 * @param {Number} [input=0] The index of the input to connect to.
 */
Node.prototype.connect = function(node, output, input) {
    var Group = require('./group');
    if (node instanceof Group) {
        // Connect to the pass-through node rather than the group
        node = node.inputs[input || 0];
        input = 0;
    }
    var outputPin = this.outputs[output || 0];
    var inputPin = node.inputs[input || 0];
    outputPin.connect(inputPin);
    inputPin.connect(outputPin);

    this.context.device.needTraverse = true;
};

/**
 * Disconnect the node from another node or group
 *
 * @param {Node|Group} node The node to disconnect from.
 * @param {Number} [output=0] The index of the output to disconnect.
 * @param {Number} [input=0] The index of the input to disconnect.
 */
Node.prototype.disconnect = function(node, output, input) {
    var Group = require('./group');
    if (node instanceof Group) {
        node = node.inputs[input || 0];
        input = 0;
    }

    var outputPin = this.outputs[output || 0];
    var inputPin = node.inputs[input || 0];
    inputPin.disconnect(outputPin);
    outputPin.disconnect(inputPin);

    this.context.device.needTraverse = true;
};

/**
 * Force an output to contain a fixed number of channels.
 *
 * @param {Number} output The index of the output.
 * @param {Number} numberOfChannels The number of channels.
 */
Node.prototype.setNumberOfOutputChannels = function(output,
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
Node.prototype.linkNumberOfOutputChannels = function(output, input) {
    this.outputs[output].linkNumberOfChannels(this.inputs[input]);
};

/**
 * Process samples a from each channel. This function should not be called
 * manually by users, who should instead rely on automatic ticking from
 * connections to the Device.
 */
Node.prototype.tick = function() {
    this.createInputSamples();
    this.createOutputSamples();

    this.generate();
};

/**
 * Traverse the audio graph, adding this and any parent nodes to the nodes
 * array.
 *
 * @param {Node[]} nodes Array to add nodes to.
 */
Node.prototype.traverse = function(nodes) {
    if (nodes.indexOf(this) == -1) {
        nodes.push(this);
        nodes = this.traverseParents(nodes);
    }
    return nodes;
};

/**
 * Call the traverse function on nodes which are connected to the inputs.
 */
Node.prototype.traverseParents = function(nodes) {
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
 * Process a sample for each channel, reading from the inputs and putting new
 * values into the outputs.  Override me!
 */
Node.prototype.generate = function() {
};

/**
 * Create the input samples by grabbing data from the outputs of connected
 * nodes and summing it.  If no nodes are connected to an input, then
 * give an empty array
 */
Node.prototype.createInputSamples = function() {
    var numberOfInputs = this.inputs.length;
    for (var i = 0; i < numberOfInputs; i++) {
        var input = this.inputs[i];

        var numberOfInputChannels = 0;

        for (var j = 0; j < input.connectedFrom.length; j++) {
            var output = input.connectedFrom[j];
            for (var k = 0; k < output.samples.length; k++) {
                var sample = output.samples[k];
                if (k < numberOfInputChannels) {
                    input.samples[k] += sample;
                }
                else {
                    input.samples[k] = sample;
                    numberOfInputChannels += 1;
                }
            }
        }

        if (input.samples.length > numberOfInputChannels) {
            input.samples = input.samples.slice(0, numberOfInputChannels);
        }
    }
};


/**
* Create output samples for each channel.
*/
Node.prototype.createOutputSamples = function() {
    var numberOfOutputs = this.outputs.length;
    for (var i = 0; i < numberOfOutputs; i++) {
        var output = this.outputs[i];
        var numberOfChannels = output.getNumberOfChannels();
        if (output.samples.length == numberOfChannels) {
            continue;
        }
        else if (output.samples.length > numberOfChannels) {
            output.samples = output.samples.slice(0, numberOfChannels);
            continue;
        }

        for (var j = output.samples.length; j < numberOfChannels; j++) {
            output.samples[j] = 0;
        }
    }
};

/**
 * Remove the node completely from the processing graph, disconnecting all
 * of its inputs and outputs.
 */
Node.prototype.remove = function() {
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

module.exports = Node;
