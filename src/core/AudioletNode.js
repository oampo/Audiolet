/*!
 * @depends EventEmitter.js
 */

/**
 * The basic building block of Audiolet applications.  Nodes are connected
 * together to create a processing graph which governs the flow of audio data.
 * AudioletNodes can contain any number of inputs and outputs which send and
 * receive one or more channels of audio data.  Audio data is created and
 * processed using the generate function, which is called whenever new data is
 * needed.
 */
var AudioletNode = EventEmitter.extend({

    /**
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} numberOfInputs The number of inputs.
     * @param {Number} numberOfOutputs The number of outputs.
     * @param {Object} parameters Overridden parameter values.
     */
    constructor: function(audiolet, numberOfInputs, numberOfOutputs,
                            parameters) {
        EventEmitter.call(this);
        this.audiolet = audiolet;

        this.inputs = [];
        for (var i = 0; i < numberOfInputs; i++) {
            this.inputs.push(new AudioletInput(this, i));
        }

        this.outputs = [];
        for (var i = 0; i < numberOfOutputs; i++) {
            this.outputs.push(new AudioletOutput(this, i));
        }

        // for each parameter defined in `parameters`, create a
        // new `AudioletParameter` and assign it as a property of the node.
        // typically, `get and `set` should be used to access these parameters.
        var defaults = this.defaults || {};
        this.parameters = {};
        for (var name in defaults) {
            var default_input = defaults[name][0],
                ctor_val = parameters[name],
                val = (ctor_val || ctor_val === 0)? ctor_val: defaults[name][1];
            this.addParameter(default_input, name, val);
        }
    },

    /**
     * Sets up a new AudioletParameter for the node.
     */
    addParameter: function(inputIndex, name, value) {
        var parameter = new AudioletParameter(this, inputIndex, value);

        // rebroadcast parameter changes to the node
        parameter.on('change', function(val) {
            this.trigger('change:' + name, val);
        }.bind(this));

        // expose the parameter on the node
        this.parameters[name] = parameter;
    },

    /**
     * Get a node parameter value by key.
     */
    get: function(key) {
        return this.parameters[key].getValue();
    },

    /**
     * Set a node parameter value by key(s).
     */
    set: function(key, val) {
        var params = key;
        if (typeof key == 'string') {
            params = {};
            params[key] = val;
        }
        for (var param in params) {
            this.parameters[param].setValue(params[param]);
        }
    },

    /**
     * Connect the node to another node or group.
     *
     * @param {AudioletNode|AudioletGroup} node The node to connect to.
     * @param {Number} [output=0] The index of the output to connect from.
     * @param {Number} [input=0] The index of the input to connect to.
     */
    connect: function(node, output, input) {
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
    },

    /**
     * Disconnect the node from another node or group
     *
     * @param {AudioletNode|AudioletGroup} node The node to disconnect from.
     * @param {Number} [output=0] The index of the output to disconnect.
     * @param {Number} [input=0] The index of the input to disconnect.
     */
    disconnect: function(node, output, input) {
        if (node instanceof AudioletGroup) {
            node = node.inputs[input || 0];
            input = 0;
        }

        var outputPin = this.outputs[output || 0];
        var inputPin = node.inputs[input || 0];
        inputPin.disconnect(outputPin);
        outputPin.disconnect(inputPin);

        this.audiolet.device.needTraverse = true;
    },

    /**
     * Force an output to contain a fixed number of channels.
     *
     * @param {Number} output The index of the output.
     * @param {Number} numberOfChannels The number of channels.
     */
    setNumberOfOutputChannels: function(output,
                                                                numberOfChannels) {
        this.outputs[output].numberOfChannels = numberOfChannels;
    },

    /**
     * Link an output to an input, forcing the output to always contain the
     * same number of channels as the input.
     *
     * @param {Number} output The index of the output.
     * @param {Number} input The index of the input.
     */
    linkNumberOfOutputChannels: function(output, input) {
        this.outputs[output].linkNumberOfChannels(this.inputs[input]);
    },

    /**
     * Process samples a from each channel. This function should not be called
     * manually by users, who should instead rely on automatic ticking from
     * connections to the AudioletDevice.
     */
    tick: function() {
        this.createInputSamples();
        this.createOutputSamples();

        this.generate();
    },

    /**
     * Traverse the audio graph, adding this and any parent nodes to the nodes
     * array.
     *
     * @param {AudioletNode[]} nodes Array to add nodes to.
     */
    traverse: function(nodes) {
        if (nodes.indexOf(this) == -1) {
            nodes.push(this);
            nodes = this.traverseParents(nodes);
        }
        return nodes;
    },

    /**
     * Call the traverse function on nodes which are connected to the inputs.
     */
    traverseParents: function(nodes) {
        var numberOfInputs = this.inputs.length;
        for (var i = 0; i < numberOfInputs; i++) {
            var input = this.inputs[i];
            var numberOfStreams = input.connectedFrom.length;
            for (var j = 0; j < numberOfStreams; j++) {
                nodes = input.connectedFrom[j].node.traverse(nodes);
            }
        }
        return nodes;
    },

    /**
     * Process a sample for each channel, reading from the inputs and putting new
     * values into the outputs.  Override me!
     */
    generate: function() {
    },

    /**
     * Create the input samples by grabbing data from the outputs of connected
     * nodes and summing it.  If no nodes are connected to an input, then
     * give an empty array
     */
    createInputSamples: function() {
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
    },


    /**
    * Create output samples for each channel.
    */
    createOutputSamples: function() {
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
    },

    /**
     * Remove the node completely from the processing graph, disconnecting all
     * of its inputs and outputs.
     */
    remove: function() {
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
    }

});