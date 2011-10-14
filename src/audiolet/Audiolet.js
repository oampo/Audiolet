/**
 * A variable size multi-channel audio buffer.
 *
 * @constructor
 * @param {Number} numberOfChannels The initial number of channels.
 * @param {Number} length The length in samples of each channel.
 */
var AudioletBuffer = function(numberOfChannels, length) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;

    this.channels = [];
    for (var i = 0; i < this.numberOfChannels; i++) {
        this.channels.push(new Float32Array(length));
    }

    this.unslicedChannels = [];
    for (var i = 0; i < this.numberOfChannels; i++) {
        this.unslicedChannels.push(this.channels[i]);
    }

    this.isEmpty = false;
    this.channelOffset = 0;
};

/**
 * Get a single channel of data
 *
 * @param {Number} channel The index of the channel.
 * @return {Float32Array} The requested channel.
 */
AudioletBuffer.prototype.getChannelData = function(channel) {
    return (this.channels[channel]);
};

/**
 * Set the data in the buffer by copying data from a second buffer
 *
 * @param {AudioletBuffer} buffer The buffer to copy data from.
 */
AudioletBuffer.prototype.set = function(buffer) {
    var numberOfChannels = buffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        this.channels[i].set(buffer.getChannelData(i));
    }
};

/**
 * Set the data in a section of the buffer by copying data from a second buffer
 *
 * @param {AudioletBuffer} buffer The buffer to copy data from.
 * @param {Number} length The number of samples to copy.
 * @param {Number} [inputOffset=0] An offset to read data from.
 * @param {Number} [outputOffset=0] An offset to write data to.
 */
AudioletBuffer.prototype.setSection = function(buffer, length, inputOffset,
                                               outputOffset) {
    inputOffset = inputOffset || 0;
    outputOffset = outputOffset || 0;
    var numberOfChannels = buffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        // Begin subarray-of-subarray fix
        inputOffset += buffer.channelOffset;
        outputOffset += this.channelOffset;
        var channel1 = this.unslicedChannels[i].subarray(outputOffset,
                outputOffset +
                length);
        var channel2 = buffer.unslicedChannels[i].subarray(inputOffset,
                inputOffset +
                length);
        // End subarray-of-subarray fix
        // Uncomment the following lines when subarray-of-subarray is fixed
        /*!
           var channel1 = this.getChannelData(i).subarray(outputOffset,
           outputOffset +
           length);
           var channel2 = buffer.getChannelData(i).subarray(inputOffset,
           inputOffset +
           length);
         */
        channel1.set(channel2);
    }
};

/**
 * Add the data from a second buffer to the data in this buffer
 *
 * @param {AudioletBuffer} buffer The buffer to add data from.
 */
AudioletBuffer.prototype.add = function(buffer) {
    var length = this.length;
    var numberOfChannels = buffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var channel1 = this.getChannelData(i);
        var channel2 = buffer.getChannelData(i);
        for (var j = 0; j < length; j++) {
            channel1[j] += channel2[j];
        }
    }
};

/**
 * Add the data from a section of a second buffer to the data in this buffer
 *
 * @param {AudioletBuffer} buffer The buffer to add data from.
 * @param {Number} length The number of samples to add.
 * @param {Number} [inputOffset=0] An offset to read data from.
 * @param {Number} [outputOffset=0] An offset to write data to.
 */
AudioletBuffer.prototype.addSection = function(buffer, length, inputOffset,
                                               outputOffset) {
    inputOffset = inputOffset || 0;
    outputOffset = outputOffset || 0;
    var numberOfChannels = buffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var channel1 = this.getChannelData(i);
        var channel2 = buffer.getChannelData(i);
        for (var j = 0; j < length; j++) {
            channel1[j + outputOffset] += channel2[j + inputOffset];
        }
    }
};

/**
 * Resize the buffer.  This operation can optionally be lazy, which is
 * generally faster but doesn't necessarily result in an empty buffer.
 *
 * @param {Number} numberOfChannel The new number of channels.
 * @param {Number} length The new length of each channel.
 * @param {Boolean} [lazy=false] If true a resized buffer may not be empty.
 * @param {Number} [offset=0] An offset to resize from.
 */
AudioletBuffer.prototype.resize = function(numberOfChannels, length, lazy,
                                           offset) {
    offset = offset || 0;
    // Local variables
    var channels = this.channels;
    var unslicedChannels = this.unslicedChannels;

    var oldLength = this.length;
    var channelOffset = this.channelOffset + offset;

    for (var i = 0; i < numberOfChannels; i++) {
        // Get the current channels
        var channel = channels[i];
        var unslicedChannel = unslicedChannels[i];

        if (length > oldLength) {
            // We are increasing the size of the buffer
            var oldChannel = channel;

            if (!lazy ||
                !unslicedChannel ||
                unslicedChannel.length < length) {
                // Unsliced channel is not empty when it needs to be,
                // does not exist, or is not large enough, so needs to be
                // (re)created
                unslicedChannel = new Float32Array(length);
            }

            channel = unslicedChannel.subarray(0, length);

            if (!lazy && oldChannel) {
                channel.set(oldChannel, offset);
            }

            channelOffset = 0;
        }
        else {
            // We are decreasing the size of the buffer
            if (!unslicedChannel) {
                // Unsliced channel does not exist
                // We can assume that we always have at least one unsliced
                // channel, so we can copy its length
                var unslicedLength = unslicedChannels[0].length;
                unslicedChannel = new Float32Array(unslicedLength);
            }
            // Begin subarray-of-subarray fix
            offset = channelOffset;
            channel = unslicedChannel.subarray(offset, offset + length);
            // End subarray-of-subarray fix
            // Uncomment the following lines when subarray-of-subarray is
            // fixed.
            // TODO: Write version where subarray-of-subarray is used
        }
        channels[i] = channel;
        unslicedChannels[i] = unslicedChannel;
    }

    this.channels = channels.slice(0, numberOfChannels);
    this.unslicedChannels = unslicedChannels.slice(0, numberOfChannels);
    this.length = length;
    this.numberOfChannels = numberOfChannels;
    this.channelOffset = channelOffset;
};

/**
 * Append the data from a second buffer to the end of the buffer
 *
 * @param {AudioletBuffer} buffer The buffer to append to this buffer.
 */
AudioletBuffer.prototype.push = function(buffer) {
    var bufferLength = buffer.length;
    this.resize(this.numberOfChannels, this.length + bufferLength);
    this.setSection(buffer, bufferLength, 0, this.length - bufferLength);
};

/**
 * Remove data from the end of the buffer, placing it in a second buffer.
 *
 * @param {AudioletBuffer} buffer The buffer to move data into.
 */
AudioletBuffer.prototype.pop = function(buffer) {
    var bufferLength = buffer.length;
    var offset = this.length - bufferLength;
    buffer.setSection(this, bufferLength, offset, 0);
    this.resize(this.numberOfChannels, offset);
};

/**
 * Prepend data from a second buffer to the beginning of the buffer.
 *
 * @param {AudioletBuffer} buffer The buffer to prepend to this buffer.
 */
AudioletBuffer.prototype.unshift = function(buffer) {
    var bufferLength = buffer.length;
    this.resize(this.numberOfChannels, this.length + bufferLength, false,
            bufferLength);
    this.setSection(buffer, bufferLength, 0, 0);
};

/**
 * Remove data from the beginning of the buffer, placing it in a second buffer.
 *
 * @param {AudioletBuffer} buffer The buffer to move data into.
 */
AudioletBuffer.prototype.shift = function(buffer) {
    var bufferLength = buffer.length;
    buffer.setSection(this, bufferLength, 0, 0);
    this.resize(this.numberOfChannels, this.length - bufferLength,
            false, bufferLength);
};

/**
 * Make all values in the buffer 0
 */
AudioletBuffer.prototype.zero = function() {
    var numberOfChannels = this.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var channel = this.getChannelData(i);
        var length = this.length;
        for (var j = 0; j < length; j++) {
            channel[j] = 0;
        }
    }
};

/**
 * Copy the buffer into a single Float32Array, with each channel appended to
 * the end of the previous one.
 *
 * @return {Float32Array} The combined array of data.
 */
AudioletBuffer.prototype.combined = function() {
    var channels = this.channels;
    var numberOfChannels = this.numberOfChannels;
    var length = this.length;
    var combined = new Float32Array(numberOfChannels * length);
    for (var i = 0; i < numberOfChannels; i++) {
        combined.set(channels[i], i * length);
    }
    return combined;
};

/**
 * Copy the buffer into a single Float32Array, with the channels interleaved.
 *
 * @return {Float32Array} The interleaved array of data.
 */
AudioletBuffer.prototype.interleaved = function() {
    var channels = this.channels;
    var numberOfChannels = this.numberOfChannels;
    var length = this.length;
    var interleaved = new Float32Array(numberOfChannels * length);
    for (var i = 0; i < length; i++) {
        for (var j = 0; j < numberOfChannels; j++) {
            interleaved[numberOfChannels * i + j] = channels[j][i];
        }
    }
    return interleaved;
};

/**
 * Return a new copy of the buffer.
 *
 * @return {AudioletBuffer} The copy of the buffer.
 */
AudioletBuffer.prototype.copy = function() {
    var buffer = new AudioletBuffer(this.numberOfChannels, this.length);
    buffer.set(this);
    return buffer;
};

/**
 * Load a .wav or .aiff file into the buffer using audiofile.js
 *
 * @param {String} path The path to the file.
 * @param {Boolean} [async=true] Whether to load the file asynchronously.
 * @param {Function} [callback] Function called if the file loaded sucessfully.
 */
AudioletBuffer.prototype.load = function(path, async, callback) {
    var request = new AudioFileRequest(path, async);
    request.onSuccess = function(decoded) {
        this.length = decoded.length;
        this.numberOfChannels = decoded.channels.length;
        this.unslicedChannels = decoded.channels;
        this.channels = decoded.channels;
        this.channelOffset = 0;
        if (callback) {
            callback();
        }
    }.bind(this);

    request.onFailure = function() {
        console.error('Could not load', path);
    }.bind(this);

    request.send();
};

/**
 * A container for collections of connected AudioletNodes.  Groups make it
 * possible to create multiple copies of predefined networks of nodes,
 * without having to manually create and connect up each individual node.
 *
 * From the outside groups look and behave exactly the same as nodes.
 * Internally you can connect nodes directly to the group's inputs and
 * outputs, allowing connection to nodes outside of the group.
 *
 * @constructor
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} numberOfInputs The number of inputs.
 * @param {Number} numberOfOutputs The number of outputs.
 */
var AudioletGroup = function(audiolet, numberOfInputs, numberOfOutputs) {
    this.audiolet = audiolet;
    this.numberOfInputs = numberOfInputs;
    this.numberOfOutputs = numberOfOutputs;

    this.inputs = [];
    for (var i = 0; i < numberOfInputs; i++) {
        this.inputs.push(new PassThroughNode(this.audiolet, 1, 1));
    }

    this.outputs = [];
    for (var i = 0; i < numberOfOutputs; i++) {
        this.outputs.push(new PassThroughNode(this.audiolet, 1, 1));
    }
};

/**
 * Connect the group to another node or group
 *
 * @param {AudioletNode|AudioletGroup} node The node to connect to.
 * @param {Number} [output=0] The index of the output to connect from.
 * @param {Number} [input=0] The index of the input to connect to.
 */
AudioletGroup.prototype.connect = function(node, output, input) {
    this.outputs[output || 0].connect(node, 0, input);
};

/**
 * Disconnect the group from another node or group
 *
 * @param {AudioletNode|AudioletGroup} node The node to disconnect from.
 * @param {Number} [output=0] The index of the output to disconnect.
 * @param {Number} [input=0] The index of the input to disconnect.
 */
AudioletGroup.prototype.disconnect = function(node, output, input) {
    this.outputs[output || 0].disconnect(node, 0, input);
};

/**
 * Remove the group completely from the processing graph, disconnecting all
 * of its inputs and outputs
 */
AudioletGroup.prototype.remove = function() {
    var numberOfInputs = this.inputs.length;
    for (var i = 0; i < numberOfInputs; i++) {
        this.inputs[i].remove();
    }

    var numberOfOutputs = this.outputs.length;
    for (var i = 0; i < numberOfOutputs; i++) {
        this.outputs[i].remove();
    }
};

/*!
 * @depends AudioletGroup.js
 */

/**
 * Group containing all of the components for the Audiolet output chain.  The
 * chain consists of:
 *
 *     Input => Block Size Limiter => Scheduler => UpMixer => Output
 *
 * **Inputs**
 *
 * - Audio
 *
 * @constructor
 * @extends AudioletGroup
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [sampleRate=44100] The sample rate to run at.
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize=8192] A fixed buffer size to use.
 */
var AudioletDestination = function(audiolet, sampleRate, numberOfChannels,
                                   bufferSize) {
    AudioletGroup.call(this, audiolet, 1, 0);

    this.device = new AudioletDevice(audiolet, sampleRate,
            numberOfChannels, bufferSize);
    audiolet.device = this.device; // Shortcut
    this.scheduler = new Scheduler(audiolet);
    audiolet.scheduler = this.scheduler; // Shortcut

    this.blockSizeLimiter = new BlockSizeLimiter(audiolet,
            Math.pow(2, 15));
    audiolet.blockSizeLimiter = this.blockSizeLimiter; // Shortcut

    this.upMixer = new UpMixer(audiolet, this.device.numberOfChannels);

    this.inputs[0].connect(this.blockSizeLimiter);
    this.blockSizeLimiter.connect(this.scheduler);
    this.scheduler.connect(this.upMixer);
    this.upMixer.connect(this.device);
};
extend(AudioletDestination, AudioletGroup);

/**
 * toString
 *
 * @return {String} String representation.
 */
AudioletDestination.prototype.toString = function() {
    return 'Destination';
};

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


/*!
 * @depends AudioletNode.js
 */

/**
 * Audio output device.  Uses sink.js to output to a range of APIs.
 *
 * @constructor
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [sampleRate=44100] The sample rate to run at.
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize=8192] A fixed buffer size to use.
 */
function AudioletDevice(audiolet, sampleRate, numberOfChannels, bufferSize) {
    AudioletNode.call(this, audiolet, 1, 0);

    this.sink = Sink(this.tick.bind(this), numberOfChannels, bufferSize,
                     sampleRate);

    // Re-read the actual values from the sink.  Sample rate especially is
    // liable to change depending on what the soundcard allows.
    this.sampleRate = this.sink.sampleRate;
    this.numberOfChannels = this.sink.channelCount;
    this.bufferSize = this.sink.preBufferSize;

    this.writePosition = 0;
    this.buffer = null;
    this.paused = false;
}
extend(AudioletDevice, AudioletNode);

/**
* Overridden tick function. Pulls data from the input and writes it to the
* device.
*
* @param {Float32Array} buffer Buffer to write data to.
* @param {Number} numberOfChannels Number of channels in the buffer.
*/
AudioletDevice.prototype.tick = function(buffer, numberOfChannels) {
    if (!this.paused) {
        var samplesNeeded = buffer.length / numberOfChannels;
        AudioletNode.prototype.tick.call(this, samplesNeeded,
                                         this.writePosition);
        var interleaved = this.buffer.interleaved();
        var numberOfSamples = interleaved.length;
        for (var i = 0; i < numberOfSamples; i++) {
            buffer[i] = interleaved[i];
        }
        this.writePosition += samplesNeeded;
    }
};

/**
* Make the input buffer available as a member.
*
* @param {AudioletBuffer[]} inputBuffers An array containing the input buffer.
* @param {AudioletBuffer[]} outputBuffers An empty array.
*/
AudioletDevice.prototype.generate = function(inputBuffers, outputBuffers) {
    this.buffer = inputBuffers[0];
};

/**
 * Get the current output position
 *
 * @return {Number} Output position in samples.
 */
AudioletDevice.prototype.getPlaybackTime = function() {
    return this.sink.getPlaybackTime();
};

/**
 * Get the current write position
 *
 * @return {Number} Write position in samples.
 */
AudioletDevice.prototype.getWriteTime = function() {
    return this.writePosition;
};

/**
 * Pause the output stream, and stop everything from ticking.  The playback
 * time will continue to increase, but the write time will be paused.
 */
AudioletDevice.prototype.pause = function() {
    this.paused = true;
};

/**
 * Restart the output stream.
 */
AudioletDevice.prototype.play = function() {
   this.paused = false; 
};

/**
 * toString
 *
 * @return {String} String representation.
 */
AudioletDevice.prototype.toString = function() {
    return 'Audio Output Device';
};

/**
 * Class representing a single input of an AudioletNode
 *
 * @constructor
 * @param {AudioletNode} node The node which the input belongs to.
 * @param {Number} index The index of the input.
 */
var AudioletInput = function(node, index) {
    this.node = node;
    this.index = index;
    this.connectedFrom = [];
    // Minimum sized buffer, which we can resize from accordingly
    this.buffer = new AudioletBuffer(1, 0);
    // Overflow buffer, for feedback loops
    this.overflow = new AudioletBuffer(1, 0);
};

/**
 * Connect the input to an output
 *
 * @param {AudioletOutput} output The output to connect to.
 */
AudioletInput.prototype.connect = function(output) {
    this.connectedFrom.push(output);
};

/**
 * Disconnect the input from an output
 *
 * @param {AudioletOutput} output The output to disconnect from.
 */
AudioletInput.prototype.disconnect = function(output) {
    var numberOfStreams = this.connectedFrom.length;
    for (var i = 0; i < numberOfStreams; i++) {
        if (output == this.connectedFrom[i]) {
            this.connectedFrom.splice(i, 1);
            break;
        }
    }
};

/**
 * Check whether the input is connected
 *
 * @return {Boolean} True if the output is connected.
 */
AudioletInput.prototype.isConnected = function() {
    return (this.connectedFrom.length > 0);
};

/**
 * toString
 *
 * @return {String} String representation.
 */
AudioletInput.prototype.toString = function() {
    return this.node.toString() + 'Input #' + this.index;
};


/**
 * The base audiolet object.  Contains an output node which pulls data from
 * connected nodes.
 *
 * @constructor
 * @param {Number} [sampleRate=44100] The sample rate to run at.
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize] Block size.  If undefined uses a sane default.
 */
var Audiolet = function(sampleRate, numberOfChannels, bufferSize) {
    this.output = new AudioletDestination(this, sampleRate,
                                          numberOfChannels, bufferSize);
};


/**
 * Class representing a single output of an AudioletNode
 *
 * @constructor
 * @param {AudioletNode} node The node which the input belongs to.
 * @param {Number} index The index of the input.
 */
var AudioletOutput = function(node, index) {
    this.node = node;
    this.index = index;
    this.connectedTo = [];
    // External buffer where data pulled from the graph is stored
    this.buffer = new AudioletBuffer(1, 0);
    // Internal buffer for if we are in a feedback loop
    this.feedbackBuffer = new AudioletBuffer(1, 0);
    // Buffer to shift data into if we are in a feedback loop
    this.outputBuffer = new AudioletBuffer(1, 0);

    this.linkedInput = null;
    this.numberOfChannels = 1;

    this.suppliesFeedbackLoop = false;
    this.timestamp = null;
};

/**
 * Connect the output to an input
 *
 * @param {AudioletInput} input The input to connect to.
 */
AudioletOutput.prototype.connect = function(input) {
    this.connectedTo.push(input);
};

/**
 * Disconnect the output from an input
 *
 * @param {AudioletInput} input The input to disconnect from.
 */
AudioletOutput.prototype.disconnect = function(input) {
    var numberOfStreams = this.connectedTo.length;
    for (var i = 0; i < numberOfStreams; i++) {
        if (input == this.connectedTo[i]) {
            this.connectedTo.splice(i, 1);
            break;
        }
    }
};

/**
 * Check whether the input is connected
 *
 * @return {Boolean} True if the output is connected.
 */
AudioletOutput.prototype.isConnected = function() {
    return (this.connectedTo.length > 0);
};

/**
 * Link the output to an input, forcing the output to always contain the
 * same number of channels as the input.
 *
 * @param {AudioletInput} input The input to link to.
 */
AudioletOutput.prototype.linkNumberOfChannels = function(input) {
    this.linkedInput = input;
};

/**
 * Unlink the output from its linked input
 */
AudioletOutput.prototype.unlinkNumberOfChannels = function() {
    this.linkedInput = null;
};

/**
 * Get the number of output channels, taking the value from the input if the
 * output is linked.
 *
 * @return {Number} The number of output channels.
 */
AudioletOutput.prototype.getNumberOfChannels = function() {
    if (this.linkedInput && this.linkedInput.isConnected()) {
        return (this.linkedInput.buffer.numberOfChannels);
    }
    return (this.numberOfChannels);
};

/**
 * Get the output buffer.  This is more complicated than it seems, as in
 * feedback loops we try to get data from the previous tick, which was often
 * a different length to the current tick.  In order to get round this we keepi
 * a fixed length FIFO buffer of the output and limit the size of blocks we
 * request to the size of the buffer.  This means that we never overflow the
 * buffer, so output data is always available.  The price we pay for this is
 * introducing extra latency equal to the length of the FIFO.
 *
 * @param {Number} length The number of samples requested.
 * @return {AudioletBuffer} The output buffer.
 */
AudioletOutput.prototype.getBuffer = function(length) {
    var buffer = this.buffer;
    if (buffer.length == length && !this.suppliesFeedbackLoop) {
        // Buffer not part of a feedback loop, so just return it
        return buffer;
    }
    else {
        // Buffer is part of a feedback loop, so we need to take care
        // of overflows.
        // Because feedback loops have to be connected to more than one
        // node, getBuffer will be called more than once.  To make sure
        // we only generate the output buffer once, store a timestamp.
        if (this.node.timestamp == this.timestamp) {
            // Buffer already generated by a previous getBuffer call
            return this.outputBuffer;
        }
        else {
            this.timestamp = this.node.timestamp;

            var feedbackBuffer = this.feedbackBuffer;
            var outputBuffer = this.outputBuffer;

            if (!this.suppliesFeedbackLoop) {
                this.suppliesFeedbackLoop = true;
                var limiter = this.node.audiolet.blockSizeLimiter;
                feedbackBuffer.resize(this.getNumberOfChannels(),
                                      limiter.maximumBlockSize, true);
            }

            // Resize feedback buffer to the correct number of channels
            feedbackBuffer.resize(this.getNumberOfChannels(),
                                  feedbackBuffer.length);

            // Resize output buffer to the correct size
            outputBuffer.resize(this.getNumberOfChannels(), length, true);

            // Buffer the output, so nodes on a later timestamp (i.e. nodes
            // in a feedback loop connected to this output) can pull
            // any amount up to maximumBlockSize without fear of overflow
            feedbackBuffer.push(buffer);
            feedbackBuffer.shift(outputBuffer);

            return outputBuffer;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
AudioletOutput.prototype.toString = function() {
    return this.node.toString() + 'Output #' + this.index + ' - ';
};


/**
 * AudioletParameters are used to provide either constant or varying values to
 * be used inside AudioletNodes.  AudioletParameters hold a static value, and
 * can also be linked to an AudioletInput.  If a node or group is connected to
 * the linked input, then the dynamic value taken from the node should be
 * prioritised over the stored static value.  If no node is connected then the
 * static value should be used.
 *
 * @constructor
 * @param {AudioletNode} node The node which the parameter is associated with.
 * @param {Number} [inputIndex] The index of the AudioletInput to link to.
 * @param {Number} [value=0] The initial static value to store.
 */
var AudioletParameter = function(node, inputIndex, value) {
    this.node = node;
    if (typeof inputIndex != 'undefined' && inputIndex != null) {
        this.input = node.inputs[inputIndex];
    }
    else {
        this.input = null;
    }
    this.value = value || 0;
};

/**
 * Check whether the static value should be used.
 *
 * @return {Boolean} True if the static value should be used.
 */
AudioletParameter.prototype.isStatic = function() {
    var input = this.input;
    return (input == null ||
            input.connectedFrom.length == 0 ||
            input.buffer.isEmpty);
};

/**
 * Check whether the dynamic values should be used.
 *
 * @return {Boolean} True if the dynamic values should be used.
 */
AudioletParameter.prototype.isDynamic = function() {
    var input = this.input;
    return (input != null &&
            input.connectedFrom.length > 0 &&
            !input.buffer.isEmpty);
};

/**
 * Set the stored static value
 *
 * @param {Number} value The value to store.
 */
AudioletParameter.prototype.setValue = function(value) {
    this.value = value;
};

/**
 * Get the stored static value
 *
 * @return {Number} The stored static value.
 */
AudioletParameter.prototype.getValue = function() {
    return this.value;
};

/**
 * Get the channel containing the dynamic values taken from the linked input
 *
 * @return {Float32Array} The channel containing the dynamic values.
 */
AudioletParameter.prototype.getChannel = function() {
    return this.input.buffer.channels[0];
};

/*!
 * @depends AudioletNode.js
 */

/**
 * Node to limit the size of sample blocks which are processed.  Any larger
 * blocks requested are split into smaller blocks and recombined at the end
 * of a tick call.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} maximumBlockSize The largest allowed block size.
 */
var BlockSizeLimiter = function(audiolet, maximumBlockSize) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.maximumBlockSize = maximumBlockSize;
    this.linkNumberOfOutputChannels(0, 0);
};
extend(BlockSizeLimiter, AudioletNode);

/**
 * Overridden tick method.  Splits any calls with length larger than the
 * maximum block size into chunks smaller than the maximum, combining the
 * chunks in the output buffers.
 *
 * @param {Number} length The number of samples to process.
 * @param {Number} timestamp A timestamp for the block of samples.
 */
BlockSizeLimiter.prototype.tick = function(length, timestamp) {
    var maximumBlockSize = this.maximumBlockSize;
    if (length < maximumBlockSize) {
        // Enough samples from the last tick and buffered, so just tick
        // and recalculate any overflow
        AudioletNode.prototype.tick.call(this, length, timestamp);
    }
    else {
        // Not enough samples available, so we will have to do it in blocks
        // of size maximumBlockSize
        var samplesGenerated = 0;
        var outputBuffers = null;
        while (samplesGenerated < length) {
            var samplesNeeded;
            // If length does not split exactly into the block size,
            // then do the small block size first, so at the end we still
            // have a lastTickSize equal to maximumBlockSize
            var smallBlockSize = length % maximumBlockSize;
            if (samplesGenerated == 0 && smallBlockSize) {
                samplesNeeded = smallBlockSize;
            }
            else {
                samplesNeeded = maximumBlockSize;
            }

            this.tickParents(samplesNeeded, timestamp + samplesGenerated);

            var inputBuffers = this.createInputBuffers(samplesNeeded);
            if (!outputBuffers) {
                outputBuffers = this.createOutputBuffers(length);
            }
            this.generate(inputBuffers, outputBuffers, samplesGenerated);

            samplesGenerated += samplesNeeded;
        }
    }
};

/**
 * Overridden function reading from the input buffers, and putting new values
 * into sections of the output buffers.
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 * @param {Number} offset Sample offset for writing to the output buffers.
 */
BlockSizeLimiter.prototype.generate = function(inputBuffers, outputBuffers,
                                               offset) {
    offset = offset || 0;
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];
    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }
    outputBuffer.setSection(inputBuffer, inputBuffer.length,
                            0, offset);
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BlockSizeLimiter.prototype.toString = function() {
    return 'Block Size Limiter';
};

/*
 * A method for extending a javascript pseudo-class
 * Taken from
 * http://peter.michaux.ca/articles/class-based-inheritance-in-javascript
 *
 * @param {Object} subclass The class to extend.
 * @param {Object} superclass The class to be extended.
 */
function extend(subclass, superclass) {
    function Dummy() {}
    Dummy.prototype = superclass.prototype;
    subclass.prototype = new Dummy();
    subclass.prototype.constructor = subclass;
}

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A type of AudioletNode designed to allow AudioletGroups to exactly replicate
 * the behaviour of AudioletParameters.  By linking one of the group's inputs
 * to the ParameterNode's input, and calling `this.parameterName =
 * parameterNode` in the group's constructor, `this.parameterName` will behave
 * as if it were an AudioletParameter contained within an AudioletNode.
 *
 * **Inputs**
 *
 * - Parameter input
 *
 * **Outputs**
 *
 * - Parameter value
 *
 * **Parameters**
 *
 * - parameter The contained parameter.  Linked to input 0.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} value The initial static value of the parameter.
 */
var ParameterNode = function(audiolet, value) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.parameter = new AudioletParameter(this, 0, value);
};
extend(ParameterNode, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
ParameterNode.prototype.generate = function(inputBuffers, outputBuffers) {
    var outputBuffer = outputBuffers[0];
    var outputChannel = outputBuffer.channels[0];

    // Local processing variables
    var parameterParameter = this.parameter;
    var parameter, parameterChannel;
    if (parameterParameter.isStatic()) {
        parameter = parameterParameter.getValue();
    }
    else {
        parameterChannel = parameterParameter.getChannel();
    }


    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (parameterChannel) {
            parameter = parameterChannel[i];
        }
        outputChannel[i] = parameter;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
ParameterNode.prototype.toString = function() {
    return 'Parameter Node';
};

/*!
 * @depends AudioletNode.js
 */

/**
 * A specialized type of AudioletNode where values from the inputs are passed
 * straight to the corresponding outputs in the most efficient way possible.
 * PassThroughNodes are used in AudioletGroups to provide the inputs and
 * outputs, and can also be used in analysis nodes where no modifications to
 * the incoming audio are made.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} numberOfInputs The number of inputs.
 * @param {Number} numberOfOutputs The number of outputs.
 */
var PassThroughNode = function(audiolet, numberOfInputs, numberOfOutputs) {
    AudioletNode.call(this, audiolet, numberOfInputs, numberOfOutputs);
};
extend(PassThroughNode, AudioletNode);

/**
 * Create output buffers of the correct length, copying any input buffers to
 * the corresponding outputs.
 *
 * @param {Number} length The number of samples for the resulting buffers.
 * @return {AudioletNode[]} The output buffers.
 */
PassThroughNode.prototype.createOutputBuffers = function(length) {
    var outputBuffers = [];
    var numberOfOutputs = this.numberOfOutputs;
    var numberOfInputs = this.numberOfInputs;
    // Copy the inputs buffers straight to the output buffers
    for (var i = 0; i < numberOfOutputs; i++) {
        var output = this.outputs[i];
        if (i < numberOfInputs) {
            // Copy the input buffer straight to the output buffers
            var input = this.inputs[i];
            output.buffer = input.buffer;
        }
        else {
            output.buffer.resize(output.getNumberOfChannels(), length);
        }
        outputBuffers.push(output.buffer);
    }
    return (outputBuffers);
};

/**
 * toString
 *
 * @return {String} String representation.
 */
PassThroughNode.prototype.toString = function() {
    return 'Pass Through Node';
};

/**
 * Priority Queue based on python heapq module
 * http://svn.python.org/view/python/branches/release27-maint/Lib/heapq.py
 *
 * @constructor
 * @param {Object[]} [array] Initial array of values to store.
 * @param {Function} [compare] Compare function.
 */
var PriorityQueue = function(array, compare) {
    if (compare) {
        this.compare = compare;
    }

    if (array) {
        this.heap = array;
        for (var i = 0; i < Math.floor(this.heap.length / 2); i++) {
            this.siftUp(i);
        }
    }
    else {
        this.heap = [];
    }
};

/**
 * Add an item to the queue
 *
 * @param {Object} item The item to add.
 */
PriorityQueue.prototype.push = function(item) {
    this.heap.push(item);
    this.siftDown(0, this.heap.length - 1);
};

/**
 * Remove and return the top item from the queue.
 *
 * @return {Object} The top item.
 */
PriorityQueue.prototype.pop = function() {
    var lastElement, returnItem;
    lastElement = this.heap.pop();
    if (this.heap.length) {
        var returnItem = this.heap[0];
        this.heap[0] = lastElement;
        this.siftUp(0);
    }
    else {
        returnItem = lastElement;
    }
    return (returnItem);
};

/**
 * Return the top item from the queue, without removing it.
 *
 * @return {Object} The top item.
 */
PriorityQueue.prototype.peek = function() {
    return (this.heap[0]);
};

/**
 * Check whether the queue is empty.
 *
 * @return {Boolean} True if the queue is empty.
 */
PriorityQueue.prototype.isEmpty = function() {
    return (this.heap.length == 0);
};


/**
 * Sift item down the queue.
 *
 * @param {Number} startPosition Queue start position.
 * @param {Number} position Item position.
 */
PriorityQueue.prototype.siftDown = function(startPosition, position) {
    var newItem = this.heap[position];
    while (position > startPosition) {
        var parentPosition = (position - 1) >> 1;
        var parent = this.heap[parentPosition];
        if (this.compare(newItem, parent)) {
            this.heap[position] = parent;
            position = parentPosition;
            continue;
        }
        break;
    }
    this.heap[position] = newItem;
};

/**
 * Sift item up the queue.
 *
 * @param {Number} position Item position.
 */
PriorityQueue.prototype.siftUp = function(position) {
    var endPosition = this.heap.length;
    var startPosition = position;
    var newItem = this.heap[position];
    var childPosition = 2 * position + 1;
    while (childPosition < endPosition) {
        var rightPosition = childPosition + 1;
        if (rightPosition < endPosition &&
            !this.compare(this.heap[childPosition],
                          this.heap[rightPosition])) {
            childPosition = rightPosition;
        }
        this.heap[position] = this.heap[childPosition];
        position = childPosition;
        childPosition = 2 * position + 1;
    }
    this.heap[position] = newItem;
    this.siftDown(startPosition, position);
};

/**
 * Default compare function.
 *
 * @param {Number} a First item.
 * @param {Number} b Second item.
 * @return {Boolean} True if a < b.
 */
PriorityQueue.prototype.compare = function(a, b) {
    return (a < b);
};

/*!
 * @depends AudioletNode.js
 */

/**
 * A sample-accurate scheduler built as an AudioletNode.  The scheduler works
 * by storing a queue of events, and subdividing the tick call from the
 * AudioletDevice if an event is scheduled to happen during the tick.  Any
 * buffers obtained in subdivided ticks are finally merged to produce the
 * single buffer expected at the output.  All timing and events are handled in
 * beats, which are converted to sample positions using a master tempo.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [bpm=120] Initial tempo.
 */
var Scheduler = function(audiolet, bpm) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.bpm = bpm || 120;
    this.queue = new PriorityQueue(null, function(a, b) {
        return (a.time < b.time);
    });

    this.time = 0;
    this.beat = 0;
    this.beatInBar = 0;
    this.bar = 0;
    this.seconds = 0;
    this.beatsPerBar = 0;

    this.lastBeatTime = 0;
    this.beatLength = 60 / this.bpm * this.audiolet.device.sampleRate;

    this.emptyBuffer = new AudioletBuffer(1, 1);
};
extend(Scheduler, AudioletNode);

/**
 * Set the tempo of the scheduler.
 *
 * @param {Number} bpm The tempo in beats per minute.
 */
Scheduler.prototype.setTempo = function(bpm) {
    this.bpm = bpm;
    this.beatLength = 60 / this.bpm * this.audiolet.device.sampleRate;
};

/**
 * Add an event relative to the current write position
 *
 * @param {Number} beats How many beats in the future to schedule the event.
 * @param {Function} callback A function called when it is time for the event.
 * @return {Object} The event object.
 */
Scheduler.prototype.addRelative = function(beats, callback) {
    var event = {};
    event.callback = callback;
    event.time = this.time + beats * this.beatLength;
    this.queue.push(event);
    return event;
};

/**
 * Add an event at an absolute beat position
 *
 * @param {Number} beat The beat at which the event should take place.
 * @param {Function} callback A function called when it is time for the event.
 * @return {Object} The event object.
 */
Scheduler.prototype.addAbsolute = function(beat, callback) {
    if (beat < this.beat ||
        beat == this.beat && this.time > this.lastBeatTime) {
        // Nah
        return null;
    }
    var event = {};
    event.callback = callback;
    event.time = this.lastBeatTime + (beat - this.beat) * this.beatLength;
    this.queue.push(event);
    return event;
};

/**
 * Schedule patterns to play, and provide the values generated to a callback.
 * The durationPattern argument can be either a number, giving a constant time
 * between each event, or a pattern, allowing varying time difference.
 *
 * @param {Pattern[]} patterns An array of patterns to play.
 * @param {Pattern|Number} durationPattern The number of beats between events.
 * @param {Function} callback Function called with the generated pattern values.
 * @return {Object} The event object.
 */
Scheduler.prototype.play = function(patterns, durationPattern, callback) {
    var event = {};
    event.patterns = patterns;
    event.durationPattern = durationPattern;
    event.callback = callback;
    // TODO: Quantizing start time
    event.time = this.audiolet.device.getWriteTime();
    this.queue.push(event);
    return event;
};

/**
 * Schedule patterns to play starting at an absolute beat position, 
 * and provide the values generated to a callback.
 * The durationPattern argument can be either a number, giving a constant time
 * between each event, or a pattern, allowing varying time difference.
 *
 * @param {Number} beat The beat at which the event should take place.
 * @param {Pattern[]} patterns An array of patterns to play.
 * @param {Pattern|Number} durationPattern The number of beats between events.
 * @param {Function} callback Function called with the generated pattern values.
 * @return {Object} The event object.
 */
Scheduler.prototype.playAbsolute = function(beat, patterns, durationPattern,
                                            callback) {
    if (beat < this.beat ||
        beat == this.beat && this.time > this.lastBeatTime) {
        // Nah
        return null;
    }
    var event = {};
    event.patterns = patterns;
    event.durationPattern = durationPattern;
    event.callback = callback;
    event.time = this.lastBeatTime + (beat - this.beat) * this.beatLength;
    this.queue.push(event);
    return event;
};


/**
 * Remove a scheduled event from the scheduler
 *
 * @param {Object} event The event to remove.
 */
Scheduler.prototype.remove = function(event) {
    var idx = this.queue.heap.indexOf(event);
    if (idx != -1) {
        this.queue.heap.splice(idx, 1);
        // Recreate queue with event removed
        this.queue = new PriorityQueue(this.queue.heap, function(a, b) {
            return (a.time < b.time);
        });
    }
};

/**
 * Alias for remove, so for simple events we have add/remove, and for patterns
 * we have play/stop.
 *
 * @param {Object} event The event to remove.
 */
Scheduler.prototype.stop = function(event) {
    this.remove(event);
};

/**
 * Overridden tick method.  This is where the scheduler magic of splitting down
 * blocks allows sample-accurate changes to happen, and also where we process
 * the events themselves.
 *
 * @param {Number} length The number of samples to process.
 * @param {Number} timestamp A timestamp for the block of samples.
 */
Scheduler.prototype.tick = function(length, timestamp) {
    // The time at the beginning of the block
    var startTime = this.audiolet.device.getWriteTime();

    // Update the clock so it is correct for the first samples
    this.updateClock(startTime);

    // Don't create the output buffer yet - it needs to be created after
    // the first input buffer so we can work out how many channels it needs
    var outputBuffers = null;

    // Generate the block of samples and carry out events, generating a
    // new sub-block each time an event is carried out
    var lastEventTime = startTime;
    while (!this.queue.isEmpty() &&
           this.queue.peek().time <= startTime + length) {
        var event = this.queue.pop();
        // Event can't take place before the previous event
        var eventTime = Math.floor(Math.max(event.time, lastEventTime));

        // Generate samples to take us to the event
        var timeToEvent = eventTime - lastEventTime;
        if (timeToEvent > 0) {
            var offset = lastEventTime - startTime;
            this.tickParents(timeToEvent,
                             timestamp + offset);

            // Get the summed input
            var inputBuffers = this.createInputBuffers(timeToEvent);

            // Create the output buffer
            if (!outputBuffers) {
                var outputBuffers = this.createOutputBuffers(length);
            }

            // Copy it to the right part of the output
            // Use the generate function so it looks and quacks like an
            // AudioletNode
            this.generate(inputBuffers, outputBuffers, offset);
        }

        // Update the clock so it is correct for the current event
        this.updateClock(eventTime);


        // Set this before processEvent, as that can change the event time
        lastEventTime = eventTime;
        // Carry out the event
        this.processEvent(event);
    }

    // Generate enough samples to complete the block
    var remainingTime = startTime + length - lastEventTime;
    if (remainingTime) {
        this.tickParents(remainingTime,
                         timestamp + lastEventTime - startTime);
        var inputBuffers = this.createInputBuffers(remainingTime);

        // Make sure we have an output buffer
        if (!outputBuffers) {
            var outputBuffers = this.createOutputBuffers(length);
        }

        var offset = lastEventTime - startTime;
        this.generate(inputBuffers, outputBuffers, offset);
    }
};

/**
 * Update the various representations of time within the scheduler.
 *
 * @param {Number} time The current write position in samples.
 */
Scheduler.prototype.updateClock = function(time) {
    this.time = time;
    this.seconds = this.time / this.audiolet.device.sampleRate;
    if (this.time >= this.lastBeatTime + this.beatLength) {
        this.beat += 1;
        this.beatInBar += 1;
        if (this.beatInBar == this.beatsPerBar) {
            this.bar += 1;
            this.beatInBar = 0;
        }
        this.lastBeatTime += this.beatLength;
    }
};

/**
 * Process a single event, grabbing any necessary values, calling the event's
 * callback, and rescheduling it if necessary.
 *
 * @param {Object} event The event to process.
 */
Scheduler.prototype.processEvent = function(event) {
    var durationPattern = event.durationPattern;
    if (durationPattern) {
        // Pattern event
        var args = [];
        var patterns = event.patterns;
        var numberOfPatterns = patterns.length;
        for (var i = 0; i < numberOfPatterns; i++) {
            var pattern = patterns[i];
            var value = pattern.next();
            if (value != null) {
                args.push(value);
            }
            else {
                // Null value for an argument, so don't process the
                // callback or add any further events
                return;
            }
        }
        event.callback.apply(null, args);

        var duration;
        if (durationPattern instanceof Pattern) {
            duration = durationPattern.next();
        }
        else {
            duration = durationPattern;
        }

        if (duration) {
            // Beats -> time
            event.time += duration * this.beatLength;
            this.queue.push(event);
        }
    }
    else {
        // Regular event
        event.callback();
    }
};

/**
 * Overridden function reading from the input buffers, and putting new values
 * into sections of the output buffers.  Also handles buffers which are flagged
 * as being empty, converting them into actual zeroed buffers.
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 * @param {Number} offset Sample offset for writing to the output buffers.
 */
Scheduler.prototype.generate = function(inputBuffers, outputBuffers, offset) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];
    for (var i = 0; i < inputBuffer.numberOfChannels; i++) {
        var inputChannel;
        if (inputBuffer.isEmpty) {
            // Substitute the supposedly empty buffer with an actually
            // empty buffer.  This means that we don't have to  zero
            // buffers in other nodes
            var emptyBuffer = this.emptyBuffer;
            emptyBuffer.resize(inputBuffer.numberOfChannels,
                               inputBuffer.length);
            inputChannel = emptyBuffer.getChannelData(0);
        }
        else {
            inputChannel = inputBuffer.getChannelData(i);
        }
        var outputChannel = outputBuffer.getChannelData(i);
        outputChannel.set(inputChannel, offset);
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Scheduler.prototype.toString = function() {
    return 'Scheduler';
};

/**
 * Bidirectional shim for the renaming of slice to subarray.  Provides
 * backwards compatibility with old browser releases
 */
var Int8Array, Uint8Array, Int16Array, Uint16Array;
var Int32Array, Uint32Array, Float32Array, Float64Array;
var types = [Int8Array, Uint8Array, Int16Array, Uint16Array,
             Int32Array, Uint32Array, Float32Array, Float64Array];
var original, shim;
for (var i = 0; i < types.length; ++i) {
    if (types[i]) {
        if (types[i].prototype.slice === undefined) {
            original = 'subarray';
            shim = 'slice';
        }
        else if (types[i].prototype.subarray === undefined) {
            original = 'slice';
            shim = 'subarray';
        }
        Object.defineProperty(types[i].prototype, shim, {
            value: types[i].prototype[original],
            enumerable: false
        });
    }
}


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A generic envelope consisting of linear transitions of varying duration
 * between a series of values.
 *
 * **Inputs**
 *
 * - Gate
 *
 * **Outputs**
 *
 * - Envelope
 *
 * **Parameters**
 *
 * - gate Gate controlling the envelope.  Values should be 0 (off) or 1 (on).
 * Linked to input 0.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [gate=1] Initial gate value.
 * @param {Number[]} levels An array (of length n) of values to move between.
 * @param {Number[]} times An array of n-1 durations - one for each transition.
 * @param {Number} [releaseStage] Sustain at this stage until the the gate is 0.
 * @param {Function} [onComplete] Function called as the envelope finishes.
 */
var Envelope = function(audiolet, gate, levels, times, releaseStage,
                        onComplete) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.gate = new AudioletParameter(this, 0, gate || 1);

    this.levels = levels;
    this.times = times;
    this.releaseStage = releaseStage;
    this.onComplete = onComplete;

    this.stage = null;
    this.time = null;
    this.changeTime = null;

    this.level = levels[0];
    this.delta = 0;
    this.gateOn = false;
};
extend(Envelope, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Envelope.prototype.generate = function(inputBuffers, outputBuffers) {
    var buffer = outputBuffers[0];
    var channel = buffer.getChannelData(0);

    var gateParameter = this.gate;
    var gate, gateChannel;
    if (gateParameter.isStatic()) {
        gate = gateParameter.getValue();
    }
    else {
        gateChannel = gateParameter.getChannel();
    }
    var releaseStage = this.releaseStage;

    var stage = this.stage;
    var time = this.time;
    var changeTime = this.changeTime;

    var level = this.level;
    var delta = this.delta;
    var gateOn = this.gateOn;

    var stageChanged = false;

    var bufferLength = buffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (gateChannel) {
            gate = gateChannel[i];
        }

        if (gate && !gateOn) {
            // Key pressed
            gateOn = true;
            stage = 0;
            time = 0;
            delta = 0;
            level = this.levels[0];
            if (stage != releaseStage) {
                stageChanged = true;
            }
        }

        if (gateOn && !gate) {
            // Key released
            gateOn = false;
            if (releaseStage != null) {
                // Jump to the release stage
                stage = releaseStage;
                stageChanged = true;
            }
        }

        if (changeTime) {
            // We are not sustaining, and we are playing, so increase the
            // time
            time += 1;
            if (time >= changeTime) {
                // Need to go to the next stage
                stage += 1;
                if (stage != releaseStage) {
                    stageChanged = true;
                }
                else {
                    // If we reach the release stage then sustain the value
                    // until the gate is released rather than moving on
                    // to the next level.
                    changeTime = null;
                    delta = 0;
                }
            }
        }

        if (stageChanged) {
            if (stage != this.times.length) {
                // Actually update the variables
                delta = this.calculateDelta(stage, level);
                changeTime = this.calculateChangeTime(stage, time);
            }
            else {
                // Made it to the end, so finish up
                if (this.onComplete) {
                    this.onComplete();
                }
                stage = null;
                time = null;
                changeTime = null;

                delta = 0;
            }
            stageChanged = false;
        }

        level += delta;
        channel[i] = level;
    }

    this.stage = stage;
    this.time = time;
    this.changeTime = changeTime;

    this.level = level;
    this.delta = delta;
    this.gateOn = gateOn;
};

/**
 * Calculate the change in level needed each sample for a section
 *
 * @param {Number} stage The index of the current stage.
 * @param {Number} level The current level.
 * @return {Number} The change in level.
 */
Envelope.prototype.calculateDelta = function(stage, level) {
    var delta = this.levels[stage + 1] - level;
    var stageTime = this.times[stage] * this.audiolet.device.sampleRate;
    return (delta / stageTime);
};

/**
 * Calculate the time in samples at which the next stage starts
 *
 * @param {Number} stage The index of the current stage.
 * @param {Number} time The current time.
 * @return {Number} The change time.
 */
Envelope.prototype.calculateChangeTime = function(stage, time) {
    var stageTime = this.times[stage] * this.audiolet.device.sampleRate;
    return (time + stageTime);
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Envelope.prototype.toString = function() {
    return 'Envelope';
};

/*!
 * @depends Envelope.js
 */

/**
 * Linear attack-decay-sustain-release envelope
 *
 * **Inputs**
 *
 * - Gate
 *
 * **Outputs**
 *
 * - Envelope
 *
 * **Parameters**
 *
 * - gate The gate turning the envelope on and off.  Value changes from 0 -> 1
 * trigger the envelope.  Value changes from 1 -> 0 make the envelope move to
 * its release stage.  Linked to input 0.
 *
 * @constructor
 * @extends Envelope
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} gate The initial gate value.
 * @param {Number} attack The attack time in seconds.
 * @param {Number} decay The decay time in seconds.
 * @param {Number} sustain The sustain level (between 0 and 1).
 * @param {Number} release The release time in seconds.
 * @param {Function} onComplete A function called after the release stage.
 */
var ADSREnvelope = function(audiolet, gate, attack, decay, sustain, release,
                            onComplete) {
    var levels = [0, 1, sustain, 0];
    var times = [attack, decay, release];
    Envelope.call(this, audiolet, gate, levels, times, 2, onComplete);
};
extend(ADSREnvelope, Envelope);

/**
 * toString
 *
 * @return {String} String representation.
 */
ADSREnvelope.prototype.toString = function() {
    return 'ADSR Envelope';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Generic biquad filter.  The coefficients (a0, a1, a2, b0, b1 and b2) are set
 * using the calculateCoefficients function, which should be overridden and
 * will be called automatically when new values are needed.
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} frequency The initial frequency.
 */
var BiquadFilter = function(audiolet, frequency) {
    AudioletNode.call(this, audiolet, 2, 1);

    // Same number of output channels as input channels
    this.linkNumberOfOutputChannels(0, 0);

    this.frequency = new AudioletParameter(this, 1, frequency || 22100);
    this.lastFrequency = null; // See if we need to recalculate coefficients

    // Delayed values
    this.xValues = [];
    this.yValues = [];

    // Coefficients
    this.b0 = 0;
    this.b1 = 0;
    this.b2 = 0;
    this.a0 = 0;
    this.a1 = 0;
    this.a2 = 0;
};
extend(BiquadFilter, AudioletNode);

/**
 * Calculate the biquad filter coefficients.  This should be overridden.
 *
 * @param {Number} frequency The filter frequency.
 */
BiquadFilter.prototype.calculateCoefficients = function(frequency) {
};

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
BiquadFilter.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var xValueArray = this.xValues;
    var yValueArray = this.yValues;

    var inputChannels = [];
    var outputChannels = [];
    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        inputChannels.push(inputBuffer.getChannelData(i));
        outputChannels.push(outputBuffer.getChannelData(i));
        if (i >= xValueArray.length) {
            xValueArray.push([0, 0]);
            yValueArray.push([0, 0]);
        }
    }

    // Local processing variables
    var frequencyParameter = this.frequency;
    var frequency, frequencyChannel;
    if (frequencyParameter.isStatic()) {
        frequency = frequencyParameter.getValue();
    }
    else {
        frequencyChannel = frequencyParameter.getChannel();
    }


    var lastFrequency = this.lastFrequency;

    var a0 = this.a0;
    var a1 = this.a1;
    var a2 = this.a2;
    var b0 = this.b0;
    var b1 = this.b1;
    var b2 = this.b2;

    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (frequencyChannel) {
            var frequency = frequencyChannel[i];
        }

        if (frequency != lastFrequency) {
            // Recalculate and make the coefficients local
            this.calculateCoefficients(frequency);
            lastFrequency = frequency;
            a0 = this.a0;
            a1 = this.a1;
            a2 = this.a2;
            b0 = this.b0;
            b1 = this.b1;
            b2 = this.b2;
        }

        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannel = inputChannels[j];
            var outputChannel = outputChannels[j];

            var xValues = xValueArray[j];
            var x1 = xValues[0];
            var x2 = xValues[1];
            var yValues = yValueArray[j];
            var y1 = yValues[0];
            var y2 = yValues[1];

            var x0 = inputChannel[i];
            var y0 = (b0 / a0) * x0 +
                     (b1 / a0) * x1 +
                     (b2 / a0) * x2 -
                     (a1 / a0) * y1 -
                     (a2 / a0) * y2;

            outputChannel[i] = y0;


            xValues[0] = x0;
            xValues[1] = x1;
            yValues[0] = y0;
            yValues[1] = y1;
        }
    }
    this.lastFrequency = lastFrequency;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BiquadFilter.prototype.toString = function() {
    return 'Biquad Filter';
};

/*!
 * @depends BiquadFilter.js
 */

/**
 * All-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 *
 * @constructor
 * @extends BiquadFilter
 *
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} frequency The initial frequency.
 */
var AllPassFilter = function(audiolet, frequency) {
    BiquadFilter.call(this, audiolet, frequency);
};
extend(AllPassFilter, BiquadFilter);

/**
 * Calculate the biquad filter coefficients using maths from
 * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
 *
 * @param {Number} frequency The filter frequency.
 */
AllPassFilter.prototype.calculateCoefficients = function(frequency) {
    var w0 = 2 * Math.PI * frequency /
             this.audiolet.device.sampleRate;
    var cosw0 = Math.cos(w0);
    var sinw0 = Math.sin(w0);
    var alpha = sinw0 / (2 / Math.sqrt(2));

    this.b0 = 1 - alpha;
    this.b1 = -2 * cosw0;
    this.b2 = 1 + alpha;
    this.a0 = 1 + alpha;
    this.a1 = -2 * cosw0;
    this.a2 = 1 - alpha;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
AllPassFilter.prototype.toString = function() {
    return 'All Pass Filter';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Amplitude envelope follower
 *
 * **Inputs**
 *
 * - Audio
 * - Attack time
 * - Release time
 *
 * **Outputs**
 *
 * - Amplitude envelope
 *
 * **Parameters**
 *
 * - attack The attack time of the envelope follower.  Linked to input 1.
 * - release The release time of the envelope follower.  Linked to input 2.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [attack=0.01] The initial attack time in seconds.
 * @param {Number} [release=0.01] The initial release time in seconds.
 */
var Amplitude = function(audiolet, attack, release) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);

    this.followers = [];
    var sampleRate = this.audiolet.device.sampleRate;

    //        attack = Math.pow(0.01, 1 / (attack * sampleRate));
    this.attack = new AudioletParameter(this, 1, attack || 0.01);

    //        release = Math.pow(0.01, 1 / (release * sampleRate));
    this.release = new AudioletParameter(this, 2, release || 0.01);
};
extend(Amplitude, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Amplitude.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var followers = this.followers;
    var numberOfFollowers = followers.length;

    // Local processing variables
    var attackParameter = this.attack;
    var attack, attackChannel;
    if (attackParameter.isStatic()) {
        attack = attackParameter.getValue();
    }
    else {
        attackChannel = attackParameter.getChannel();
    }

    // Local processing variables
    var releaseParameter = this.release;
    var release, releaseChannel;
    if (releaseParameter.isStatic()) {
        release = releaseParameter.getValue();
    }
    else {
        releaseChannel = releaseParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i > numberOfFollowers) {
            followers.push(0);
        }
        var follower = followers[i];

        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = Math.abs(inputChannel[j]);
            if (attackChannel) {
                attack = attackChannel[j];
            }
            if (releaseChannel) {
                release = releaseChannel[j];
            }
            if (value > follower) {
                follower = attack * (follower - value) + value;
            }
            else {
                follower = release * (follower - value) + value;
            }
            outputChannel[j] = follower;
        }
        followers[i] = follower;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Amplitude.prototype.toString = function() {
    return ('Amplitude');
};

/*!
 * @depends ../core/PassThroughNode.js
 */

/**
 * Detect potentially hazardous values in the audio stream.  Looks for
 * undefineds, nulls, NaNs and Infinities.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 *
 * @constructor
 * @extends PassThroughNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Function} [callback] Function called if a bad value is detected.
 */
var BadValueDetector = function(audiolet, callback) {
    PassThroughNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);

    if (callback) {
        this.callback = callback;
    }
};
extend(BadValueDetector, PassThroughNode);

/**
 * Default callback.  Logs the value and position of the bad value.
 *
 * @param {Number|Object|'undefined'} value The value detected.
 * @param {Number} channel The index of the channel the value was found in.
 * @param {Number} index The sample index the value was found at.
 */
BadValueDetector.prototype.callback = function(value, channel, index) {
    console.error(value + ' detected at channel ' + channel + ' index ' +
                  index);
};

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
BadValueDetector.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];

    if (inputBuffer.isEmpty) {
        return;
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var channel = inputBuffer.getChannelData(i);

        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = channel[j];
            if (typeof value == 'undefined' ||
                value == null ||
                isNaN(value) ||
                value == Infinity ||
                value == -Infinity) {
                this.callback(value, i, j);
            }
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BadValueDetector.prototype.toString = function() {
    return 'Bad Value Detector';
};

/*!
 * @depends BiquadFilter.js
 */

/**
 * Band-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 *
 * @constructor
 * @extends BiquadFilter
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} frequency The initial frequency.
 */
var BandPassFilter = function(audiolet, frequency) {
    BiquadFilter.call(this, audiolet, frequency);
};
extend(BandPassFilter, BiquadFilter);

/**
 * Calculate the biquad filter coefficients using maths from
 * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
 *
 * @param {Number} frequency The filter frequency.
 */
BandPassFilter.prototype.calculateCoefficients = function(frequency) {
    var w0 = 2 * Math.PI * frequency / this.audiolet.device.sampleRate;
    var cosw0 = Math.cos(w0);
    var sinw0 = Math.sin(w0);
    var alpha = sinw0 / (2 / Math.sqrt(2));

    this.b0 = alpha;
    this.b1 = 0;
    this.b2 = -alpha;
    this.a0 = 1 + alpha;
    this.a1 = -2 * cosw0;
    this.a2 = 1 - alpha;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BandPassFilter.prototype.toString = function() {
    return 'Band Pass Filter';
};

/*!
 * @depends BiquadFilter.js
 */

/**
 * Band-reject filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 *
 * @constructor
 * @extends BiquadFilter
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} frequency The initial frequency.
 */
var BandRejectFilter = function(audiolet, frequency) {
    BiquadFilter.call(this, audiolet, frequency);
};
extend(BandRejectFilter, BiquadFilter);

/**
 * Calculate the biquad filter coefficients using maths from
 * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
 *
 * @param {Number} frequency The filter frequency.
 */
BandRejectFilter.prototype.calculateCoefficients = function(frequency) {
    var w0 = 2 * Math.PI * frequency /
             this.audiolet.device.sampleRate;
    var cosw0 = Math.cos(w0);
    var sinw0 = Math.sin(w0);
    var alpha = sinw0 / (2 / Math.sqrt(2));

    this.b0 = 1;
    this.b1 = -2 * cosw0;
    this.b2 = 1;
    this.a0 = 1 + alpha;
    this.a1 = -2 * cosw0;
    this.a2 = 1 - alpha;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BandRejectFilter.prototype.toString = function() {
    return 'Band Reject Filter';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Reduce the bitrate of incoming audio
 *
 * **Inputs**
 *
 * - Audio 1
 * - Number of bits
 *
 * **Outputs**
 *
 * - Bit Crushed Audio
 *
 * **Parameters**
 *
 * - bits The number of bit to reduce to.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} bits The initial number of bits.
 */
var BitCrusher = function(audiolet, bits) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.bits = new AudioletParameter(this, 1, bits);
};
extend(BitCrusher, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
BitCrusher.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var bitsParameter = this.bits;
    var bits, bitsChannel;
    if (bitsParameter.isStatic()) {
        bits = bitsParameter.getValue();
    }
    else {
        bitsChannel = bitsParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (bitsChannel) {
                bits = bitsChannel[j];
            }
            var maxValue = Math.pow(2, bits) - 1;
            outputChannel[j] = Math.floor(inputChannel[j] * maxValue) /
                               maxValue;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BitCrusher.prototype.toString = function() {
    return 'BitCrusher';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Play the contents of an audio buffer
 *
 * **Inputs**
 *
 * - Playback rate
 * - Restart trigger
 * - Start position
 * - Loop on/off
 *
 * **Outputs**
 *
 * - Audio
 *
 * **Parameters**
 *
 * - playbackRate The rate that the buffer should play at.  Value of 1 plays at
 * the regular rate.  Values > 1 are pitched up.  Values < 1 are pitched down.
 * Linked to input 0.
 * - restartTrigger Changes of value from 0 -> 1 restart the playback from the
 * start position.  Linked to input 1.
 * - startPosition The position at which playback should begin.  Values between
 * 0 (the beginning of the buffer) and 1 (the end of the buffer).  Linked to
 * input 2.
 * - loop Whether the buffer should loop when it reaches the end.  Linked to
 * input 3
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {AudioletBuffer} buffer The buffer to play.
 * @param {Number} [playbackRate=1] The initial playback rate.
 * @param {Number} [startPosition=0] The initial start position.
 * @param {Number} [loop=0] Initial value for whether to loop.
 * @param {Function} [onComplete] Called when the buffer has finished playing.
 */
var BufferPlayer = function(audiolet, buffer, playbackRate, startPosition,
                            loop, onComplete) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.buffer = buffer;
    this.setNumberOfOutputChannels(0, this.buffer.numberOfChannels);
    this.position = startPosition || 0;
    this.playbackRate = new AudioletParameter(this, 0, playbackRate || 1);
    this.restartTrigger = new AudioletParameter(this, 1, 0);
    this.startPosition = new AudioletParameter(this, 2, startPosition || 0);
    this.loop = new AudioletParameter(this, 3, loop || 0);
    this.onComplete = onComplete;

    this.restartTriggerOn = false;
    this.playing = true;
};
extend(BufferPlayer, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
BufferPlayer.prototype.generate = function(inputBuffers, outputBuffers) {
    var outputBuffer = outputBuffers[0];

    // Cache local variables
    var buffer = this.buffer;
    var position = this.position;
    var playing = this.playing;
    var restartTriggerOn = this.restartTriggerOn;

    // Crap load of parameters
    var playbackRateParameter = this.playbackRate;
    var playbackRate, playbackRateChannel;
    if (playbackRateParameter.isStatic()) {
        playbackRate = playbackRateParameter.getValue();
    }
    else {
        playbackRateChannel = playbackRateParameter.getChannel();
    }

    var restartTriggerParameter = this.restartTrigger;
    var restartTrigger, restartTriggerChannel;
    if (restartTriggerParameter.isStatic()) {
        restartTrigger = restartTriggerParameter.getValue();
    }
    else {
        restartTriggerChannel = restartTriggerParameter.getChannel();
    }

    var startPositionParameter = this.startPosition;
    var startPosition, startPositionChannel;
    if (startPositionParameter.isStatic()) {
        startPosition = startPositionParameter.getValue();
    }
    else {
        startPositionChannel = startPositionParameter.getChannel();
    }

    var loopParameter = this.loop;
    var loop, loopChannel;
    if (loopParameter.isStatic()) {
        loop = loopParameter.getValue();
    }
    else {
        loopChannel = loopParameter.getChannel();
    }


    if (buffer.length == 0 || (!restartTriggerChannel && !playing)) {
        // No buffer data, or chance of starting playing in this block, so
        // we can just send an empty buffer and return
        outputBuffer.isEmpty = true;
        return;
    }

    var numberOfChannels = buffer.numberOfChannels;
    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (playbackRateChannel) {
            playbackRate = playbackRateChannel[i];
        }
        if (restartTriggerChannel) {
            restartTrigger = restartTriggerChannel[i];
        }
        if (loopChannel) {
            loop = loopChannel[i];
        }

        if (restartTrigger > 0 && !restartTriggerOn) {
            // Trigger moved from <=0 to >0, so we restart playback from
            // startPosition
            position = startPosition;
            restartTriggerOn = true;
            playing = true;
        }

        if (restartTrigger <= 0 && restartTriggerOn) {
            // Trigger moved back to <= 0
            restartTriggerOn = false;
        }

        if (playing) {
            for (var j = 0; j < numberOfChannels; j++) {
                var inputChannel = buffer.channels[j];
                var outputChannel = outputBuffer.channels[j];
                outputChannel[i] = inputChannel[Math.floor(position)];
            }
            position += playbackRate;
            if (position >= buffer.length) {
                if (loop) {
                    // Back to the start
                    position %= buffer.length;
                }
                else {
                    // Finish playing until a new restart trigger
                    playing = false;
                    if (this.onComplete) {
                        this.onComplete();
                    }
                }
            }
        }
        else {
            // Give zeros until we restart
            for (var j = 0; j < numberOfChannels; j++) {
                var outputChannel = outputBuffer.channels[j];
                outputChannel[i] = 0;
            }
        }
    }

    this.playing = playing;
    this.position = position;
    this.restartTriggerOn = restartTriggerOn;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BufferPlayer.prototype.toString = function() {
    return ('Buffer player');
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Undamped comb filter
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Decay Time
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - decayTime Time for the echoes to decay by 60dB.  Linked to input 0.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 * @param {Number} decayTime The initial decay time.
 */
var CombFilter = function(audiolet, maximumDelayTime, delayTime, decayTime) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
    this.decayTime = new AudioletParameter(this, 2, decayTime);
    var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
    this.buffers = [];
    this.readWriteIndex = 0;
};
extend(CombFilter, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
CombFilter.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var maximumDelayTime = this.maximumDelayTime;
    var sampleRate = this.audiolet.device.sampleRate;

    var delayTimeParameter = this.delayTime;
    var delayTime, delayTimeChannel;
    if (delayTimeParameter.isStatic()) {
        delayTime = Math.floor(delayTimeParameter.getValue() * sampleRate);
    }
    else {
        delayTimeChannel = delayTimeParameter.getChannel();
    }

    var decayTimeParameter = this.decayTime;
    var decayTime, decayTimeChannel;
    if (decayTimeParameter.isStatic()) {
        decayTime = Math.floor(decayTimeParameter.getValue() * sampleRate);
    }
    else {
        decayTimeChannel = decayTimeParameter.getChannel();
    }


    var feedback;
    if (delayTimeParameter.isStatic() && decayTimeParameter.isStatic()) {
        feedback = Math.exp(-3 * delayTime / decayTime);
    }



    var buffers = this.buffers;
    var readWriteIndex = this.readWriteIndex;

    var inputChannels = inputBuffer.channels;
    var outputChannels = outputBuffer.channels;
    var numberOfChannels = inputBuffer.numberOfChannels;
    var numberOfBuffers = buffers.length;
    for (var i = numberOfBuffers; i < numberOfChannels; i++) {
        // Create buffer for channel if it doesn't already exist
        var bufferSize = maximumDelayTime * sampleRate;
        buffers.push(new Float32Array(bufferSize));
    }


    var bufferLength = inputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (delayTimeChannel) {
            delayTime = Math.floor(delayTimeChannel[i] * sampleRate);
        }

        if (decayTimeChannel) {
            decayTime = Math.floor(decayTimeChannel[i] * sampleRate);
        }

        if (delayTimeChannel || decayTimeChannel) {
            feedback = Math.exp(-3 * delayTime / decayTime);
        }

        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannel = inputChannels[j];
            var outputChannel = outputChannels[j];
            var buffer = buffers[j];
            var output = buffer[readWriteIndex];
            outputChannel[i] = output;
            buffer[readWriteIndex] = inputChannel[i] +
                                     feedback * output;
        }

        readWriteIndex += 1;
        if (readWriteIndex >= delayTime) {
            readWriteIndex = 0;
        }
    }
    this.readWriteIndex = readWriteIndex;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
CombFilter.prototype.toString = function() {
    return 'Comb Filter';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Oscillator which reads waveform values from a look-up table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Waveform
 *
 * **Parameters**
 *
 * - frequency The oscillator frequency.  Linked to input 0.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] The initial frequency.
 */
var TableLookupOscillator = function(audiolet, table, frequency) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.table = table;
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.phase = 0;
};
extend(TableLookupOscillator, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
TableLookupOscillator.prototype.generate = function(inputBuffers,
                                                    outputBuffers) {
    var buffer = outputBuffers[0];
    var channel = buffer.getChannelData(0);

    // Make processing variables local
    var sampleRate = this.audiolet.device.sampleRate;
    var table = this.table;
    var tableSize = table.length;
    var phase = this.phase;
    var frequencyParameter = this.frequency;
    var frequency, frequencyChannel;
    if (frequencyParameter.isStatic()) {
        frequency = frequencyParameter.getValue();
    }
    else {
        frequencyChannel = frequencyParameter.getChannel();
    }

    // Processing loop
    var bufferLength = buffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (frequencyChannel) {
            frequency = frequencyChannel[i];
        }
        var step = frequency * tableSize / sampleRate;
        phase += step;
        if (phase >= tableSize) {
            phase %= tableSize;
        }
        channel[i] = table[Math.floor(phase)];
    }
    this.phase = phase;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
TableLookupOscillator.prototype.toString = function() {
    return 'Table Lookup Oscillator';
};


/*!
 * @depends TableLookupOscillator.js
 */

/**
 * Sine wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Sine wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 *
 * @constructor
 * @extends TableLookupOscillator
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Sine = function(audiolet, frequency) {
    TableLookupOscillator.call(this, audiolet, Sine.TABLE, frequency);
};
extend(Sine, TableLookupOscillator);

/**
 * toString
 *
 * @return {String} String representation.
 */
Sine.prototype.toString = function() {
    return 'Sine';
};

/**
 * Sine table
 */
Sine.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Sine.TABLE.push(Math.sin(i * 2 * Math.PI / 8192));
}


/*!
 * @depends ../core/AudioletNode.js
 * @depends Sine.js
 */

/**
 * Equal-power cross-fade between two signals
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 * - Fade Position
 *
 * **Outputs**
 *
 * - Mixed audio
 *
 * **Parameters**
 *
 * - position The fade position.  Values between 0 (Audio 1 only) and 1 (Audio
 * 2 only).  Linked to input 2.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [position=0.5] The initial fade position.
 */
var CrossFade = function(audiolet, position) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.position = new AudioletParameter(this, 2, position || 0.5);
};
extend(CrossFade, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
CrossFade.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBufferA = inputBuffers[0];
    var inputBufferB = inputBuffers[1];
    var outputBuffer = outputBuffers[0];

    var inputChannelsA = inputBufferA.channels;
    var inputChannelsB = inputBufferB.channels;
    var outputChannels = outputBuffer.channels;

    if (inputBufferA.isEmpty && inputBufferB.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var positionParameter = this.position;
    var position, positionChannel;
    if (positionParameter.isStatic()) {
        position = positionParameter.getValue();
    }
    else {
        positionChannel = positionParameter.getChannel();
    }

    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (positionChannel) {
            position = positionChannel[i];
        }

        var tableLength = Sine.TABLE.length / 4;
        var scaledPosition = Math.floor(position * tableLength);
        // TODO: Use sine/cos tables?
        var gainA = Sine.TABLE[scaledPosition + tableLength];
        var gainB = Sine.TABLE[scaledPosition];

        var numberOfChannels = inputBufferA.numberOfChannels;
        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannelA = inputChannelsA[j];
            var inputChannelB = inputChannelsB[j];
            var outputChannel = outputChannels[j];

            var valueA, valueB;
            if (!inputBufferA.isEmpty) {
                valueA = inputChannelA[i];
            }
            else {
                valueA = 0;
            }

            if (!inputBufferB.isEmpty) {
                valueB = inputChannelB[i];
            }
            else {
                valueB = 0;
            }
            outputChannel[i] = valueA * gainA +
                valueB * gainB;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
CrossFade.prototype.toString = function() {
    return 'Cross Fader';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Damped comb filter
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Decay Time
 * - Damping
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - decayTime Time for the echoes to decay by 60dB.  Linked to input 2.
 * - damping The amount of high-frequency damping of echoes.  Linked to input 3.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 * @param {Number} decayTime The initial decay time.
 * @param {Number} damping The initial amount of damping.
 */
var DampedCombFilter = function(audiolet, maximumDelayTime, delayTime,
                                decayTime, damping) {
    AudioletNode.call(this, audiolet, 4, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
    this.decayTime = new AudioletParameter(this, 2, decayTime);
    this.damping = new AudioletParameter(this, 3, damping);
    var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
    this.buffers = [];
    this.readWriteIndex = 0;
    this.filterStore = 0;
};
extend(DampedCombFilter, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
DampedCombFilter.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var maximumDelayTime = this.maximumDelayTime;
    var sampleRate = this.audiolet.device.sampleRate;

    var delayTimeParameter = this.delayTime;
    var delayTime, delayTimeChannel;
    if (delayTimeParameter.isStatic()) {
        delayTime = Math.floor(delayTimeParameter.getValue() * sampleRate);
    }
    else {
        delayTimeChannel = delayTimeParameter.getChannel();
    }

    var decayTimeParameter = this.decayTime;
    var decayTime, decayTimeChannel;
    if (decayTimeParameter.isStatic()) {
        decayTime = Math.floor(decayTimeParameter.getValue() * sampleRate);
    }
    else {
        decayTimeChannel = decayTimeParameter.getChannel();
    }

    var dampingParameter = this.damping;
    var damping, dampingChannel;
    if (dampingParameter.isStatic()) {
        damping = dampingParameter.getValue();
    }
    else {
        dampingChannel = dampingParameter.getChannel();
    }


    var feedback;
    if (delayTimeParameter.isStatic() && decayTimeParameter.isStatic()) {
        feedback = Math.exp(-3 * delayTime / decayTime);
    }



    var buffers = this.buffers;
    var readWriteIndex = this.readWriteIndex;
    var filterStore = this.filterStore;

    var inputChannels = inputBuffer.channels;
    var outputChannels = outputBuffer.channels;
    var numberOfChannels = inputBuffer.numberOfChannels;
    var numberOfBuffers = buffers.length;
    for (var i = numberOfBuffers; i < numberOfChannels; i++) {
        // Create buffer for channel if it doesn't already exist
        var bufferSize = maximumDelayTime * sampleRate;
        buffers.push(new Float32Array(bufferSize));
    }


    var bufferLength = inputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (delayTimeChannel) {
            delayTime = Math.floor(delayTimeChannel[i] * sampleRate);
        }

        if (decayTimeChannel) {
            decayTime = Math.floor(decayTimeChannel[i] * sampleRate);
        }

        if (dampingChannel) {
            damping = dampingChannel[i];
        }

        if (delayTimeChannel || decayTimeChannel) {
            feedback = Math.exp(-3 * delayTime / decayTime);
        }

        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannel = inputChannels[j];
            var outputChannel = outputChannels[j];
            var buffer = buffers[j];
            var output = buffer[readWriteIndex];
            filterStore = (output * (1 - damping)) +
                          (filterStore * damping);
            outputChannel[i] = output;
            buffer[readWriteIndex] = inputChannel[i] +
                                     feedback * filterStore;
        }

        readWriteIndex += 1;
        if (readWriteIndex >= delayTime) {
            readWriteIndex = 0;
        }
    }
    this.readWriteIndex = readWriteIndex;
    this.filterStore = filterStore;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
DampedCombFilter.prototype.toString = function() {
    return 'Damped Comb Filter';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Filter for leaking DC offset.  Maths is taken from
 * https://ccrma.stanford.edu/~jos/filters/DC_Blocker.html
 *
 * **Inputs**
 *
 * - Audio
 * - Filter coefficient
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - coefficient The filter coefficient.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [coefficient=0.995] The initial coefficient.
 */
var DCFilter = function(audiolet, coefficient) {
    AudioletNode.call(this, audiolet, 2, 1);

    // Same number of output channels as input channels
    this.linkNumberOfOutputChannels(0, 0);

    this.coefficient = new AudioletParameter(this, 1, coefficient || 0.995);

    // Delayed values
    this.xValues = [];
    this.yValues = [];
};
extend(DCFilter, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
DCFilter.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var xValues = this.xValues;
    var yValues = this.yValues;

    // Local processing variables
    var coefficientParameter = this.coefficient;
    var coefficient, coefficientChannel;
    if (coefficientParameter.isStatic()) {
        coefficient = coefficientParameter.getValue();
    }
    else {
        coefficientChannel = coefficientParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.channels.length;
    var bufferLength = outputBuffer.length;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.channels[i];
        var outputChannel = outputBuffer.channels[i];

        if (i >= xValues.length) {
            xValues.push(0);
        }
        if (i >= yValues.length) {
            yValues.push(0);
        }

        var lastX = xValues[i];
        var lastY = yValues[i];

        for (var j = 0; j < bufferLength; j++) {
            if (coefficientChannel) {
                var coefficient = coefficientChannel[j];
            }

            var x0 = inputChannel[j];
            var y0 = x0 - lastX + coefficient * lastY;

            outputChannel[j] = y0;

            lastX = x0;
            lastY = y0;
        }
        xValues[i] = lastX;
        yValues[i] = lastY;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
DCFilter.prototype.toString = function() {
    return 'DC Filter';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A simple delay line.
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 *
 * **Outputs**
 *
 * - Delayed audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 */
var Delay = function(audiolet, maximumDelayTime, delayTime) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
    var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
    this.buffers = [];
    this.readWriteIndex = 0;
};
extend(Delay, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Delay.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    // Local processing variables
    var maximumDelayTime = this.maximumDelayTime;
    var sampleRate = this.audiolet.device.sampleRate;

    var delayTimeParameter = this.delayTime;
    var delayTime, delayTimeChannel;
    if (delayTimeParameter.isStatic()) {
        delayTime = Math.floor(delayTimeParameter.getValue() * sampleRate);
    }
    else {
        delayTimeChannel = delayTimeParameter.getChannel();
    }

    var buffers = this.buffers;
    var readWriteIndex = this.readWriteIndex;

    var inputChannels = [];
    var outputChannels = [];
    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        inputChannels.push(inputBuffer.getChannelData(i));
        outputChannels.push(outputBuffer.getChannelData(i));
        // Create buffer for channel if it doesn't already exist
        if (i >= buffers.length) {
            var bufferSize = maximumDelayTime * sampleRate;
            buffers.push(new Float32Array(bufferSize));
        }
    }


    var bufferLength = inputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (delayTimeChannel) {
            delayTime = Math.floor(delayTimeChannel[i] * sampleRate);
        }

        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannel = inputChannels[j];
            var outputChannel = outputChannels[j];
            var buffer = buffers[j];
            outputChannel[i] = buffer[readWriteIndex];
            if (!inputBuffer.isEmpty) {
                buffer[readWriteIndex] = inputChannel[i];
            }
            else {
                buffer[readWriteIndex] = 0;
            }
        }

        readWriteIndex += 1;
        if (readWriteIndex >= delayTime) {
            readWriteIndex = 0;
        }
    }
    this.readWriteIndex = readWriteIndex;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Delay.prototype.toString = function() {
    return 'Delay';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Detect discontinuities in the input stream.  Looks for consecutive samples
 * with a difference larger than a threshold value.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 *
 * @constructor
 * @extends PassThroughNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [threshold=0.2] The threshold value.
 * @param {Function} [callback] Function called if a discontinuity is detected.
 */
var DiscontinuityDetector = function(audiolet, threshold, callback) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);

    this.threshold = threshold || 0.2;
    if (callback) {
        this.callback = callback;
    }
    this.lastValues = [];

};
extend(DiscontinuityDetector, AudioletNode);

/**
 * Default callback.  Logs the size and position of the discontinuity.
 *
 * @param {Number} size The size of the discontinuity.
 * @param {Number} channel The index of the channel the samples were found in.
 * @param {Number} index The sample index the discontinuity was found at.
 */
DiscontinuityDetector.prototype.callback = function(size, channel, index) {
    console.error('Discontinuity of ' + size + ' detected on channel ' +
                  channel + ' index ' + index);
};

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
DiscontinuityDetector.prototype.generate = function(inputBuffers,
                                                    outputBuffers) {
    var inputBuffer = inputBuffers[0];

    if (inputBuffer.isEmpty) {
        this.lastValues = [];
        return;
    }

    var lastValues = this.lastValues;
    var threshold = this.threshold;

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var channel = inputBuffer.getChannelData(i);

        if (i >= lastValues.length) {
            lastValues.push(null);
        }
        var lastValue = lastValues[i];

        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = channel[j];
            if (lastValue != null) {
                if (Math.abs(lastValue - value) > threshold) {
                    this.callback(Math.abs(lastValue - value), i, j);
                }
            }
            lastValue = value;
        }

        lastValues[i] = lastValue;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
DiscontinuityDetector.prototype.toString = function() {
    return 'Discontinuity Detector';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Delay line with feedback
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 * - Feedback
 * - Mix
 *
 * **Outputs**
 *
 * - Delayed audio
 *
 * **Parameters**
 *
 * - delayTime The delay time in seconds.  Linked to input 1.
 * - feedback The amount of feedback.  Linked to input 2.
 * - mix The amount of delay to mix into the dry signal.  Linked to input 3.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} maximumDelayTime The largest allowable delay time.
 * @param {Number} delayTime The initial delay time.
 * @param {Number} feedabck The initial feedback amount.
 * @param {Number} mix The initial mix amount.
 */
var FeedbackDelay = function(audiolet, maximumDelayTime, delayTime, feedback,
                             mix) {
    AudioletNode.call(this, audiolet, 4, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.maximumDelayTime = maximumDelayTime;
    this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
    this.feedback = new AudioletParameter(this, 2, feedback || 0.5);
    this.mix = new AudioletParameter(this, 3, mix || 1);
    var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
    this.buffers = [];
    this.readWriteIndex = 0;
};
extend(FeedbackDelay, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
FeedbackDelay.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    // Local processing variables
    var maximumDelayTime = this.maximumDelayTime;
    var sampleRate = this.audiolet.device.sampleRate;

    var delayTimeParameter = this.delayTime;
    var delayTime, delayTimeChannel;
    if (delayTimeParameter.isStatic()) {
        delayTime = Math.floor(delayTimeParameter.getValue() * sampleRate);
    }
    else {
        delayTimeChannel = delayTimeParameter.getChannel();
    }

    var feedbackParameter = this.feedback;
    var feedback, feedbackChannel;
    if (feedbackParameter.isStatic()) {
        feedback = feedbackParameter.getValue();
    }
    else {
        feedbackChannel = feedbackParameter.getChannel();
    }

    var mixParameter = this.mix;
    var mix, mixChannel;
    if (mixParameter.isStatic()) {
        mix = mixParameter.getValue();
    }
    else {
        mixChannel = mixParameter.getChannel();
    }


    var buffers = this.buffers;
    var readWriteIndex = this.readWriteIndex;

    var inputChannels = inputBuffer.channels;
    var outputChannels = outputBuffer.channels;
    var numberOfChannels = inputBuffer.numberOfChannels;
    var numberOfBuffers = buffers.length;
    for (var i = numberOfBuffers; i < numberOfChannels; i++) {
        // Create buffer for channel if it doesn't already exist
        var bufferSize = maximumDelayTime * sampleRate;
        buffers.push(new Float32Array(bufferSize));
    }


    var bufferLength = inputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (delayTimeChannel) {
            delayTime = Math.floor(delayTimeChannel[i] * sampleRate);
        }
        if (feedbackChannel) {
            feedback = feedbackChannel[i];
        }
        if (mixChannel) {
            mix = mixChannel[i];
        }

        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannel = inputChannels[j];
            var outputChannel = outputChannels[j];
            var buffer = buffers[j];
            var input;
            if (!inputBuffer.isEmpty) {
                input = inputChannel[i];
            }
            else {
                input = 0;
            }
            var output = buffer[readWriteIndex];
            outputChannel[i] = mix * output + (1 - mix) * input;
            buffer[readWriteIndex] = input + feedback * output;
        }

        readWriteIndex += 1;
        if (readWriteIndex >= delayTime) {
            readWriteIndex = 0;
        }
    }
    this.readWriteIndex = readWriteIndex;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
FeedbackDelay.prototype.toString = function() {
    return 'Feedback Delay';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Simple gain control
 *
 * **Inputs**
 *
 * - Audio
 * - Gain
 *
 * **Outputs**
 *
 * - Audio
 *
 * **Parameters**
 *
 * - gain The amount of gain.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [gain=1] Initial gain.
 */
var Gain = function(audiolet, gain) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.gain = new AudioletParameter(this, 1, gain || 1);
};
extend(Gain, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Gain.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var gainParameter = this.gain;
    var gain, gainChannel;
    if (gainParameter.isStatic()) {
        gain = gainParameter.getValue();
    }
    else {
        gainChannel = gainParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (gainChannel) {
                gain = gainChannel[j];
            }
            outputChannel[j] = inputChannel[j] * gain;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Gain.prototype.toString = function() {
    return ('Gain');
};

/*!
 * @depends BiquadFilter.js
 */

/**
 * High-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 *
 * @constructor
 * @extends BiquadFilter
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} frequency The initial frequency.
 */
var HighPassFilter = function(audiolet, frequency) {
    BiquadFilter.call(this, audiolet, frequency);
};
extend(HighPassFilter, BiquadFilter);

/**
 * Calculate the biquad filter coefficients using maths from
 * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
 *
 * @param {Number} frequency The filter frequency.
 */
HighPassFilter.prototype.calculateCoefficients = function(frequency) {
    var w0 = 2 * Math.PI * frequency /
             this.audiolet.device.sampleRate;
    var cosw0 = Math.cos(w0);
    var sinw0 = Math.sin(w0);
    var alpha = sinw0 / (2 / Math.sqrt(2));

    this.b0 = (1 + cosw0) / 2;
    this.b1 = - (1 + cosw0);
    this.b2 = this.b0;
    this.a0 = 1 + alpha;
    this.a1 = -2 * cosw0;
    this.a2 = 1 - alpha;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
HighPassFilter.prototype.toString = function() {
    return 'High Pass Filter';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Exponential lag for smoothing signals.
 *
 * **Inputs**
 *
 * - Value
 * - Lag time
 *
 * **Outputs**
 *
 * - Lagged value
 *
 * **Parameters**
 *
 * - value The value to lag.  Linked to input 0.
 * - lag The 60dB lag time. Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [value=0] The initial value.
 * @param {Number} [lagTime=1] The initial lag time.
 */
var Lag = function(audiolet, value, lagTime) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.value = new AudioletParameter(this, 0, value || 0);
    this.lag = new AudioletParameter(this, 1, lagTime || 1);
    this.lastValue = value || 0;

    this.log001 = Math.log(0.001);
};
extend(Lag, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Lag.prototype.generate = function(inputBuffers, outputBuffers) {
    var outputBuffer = outputBuffers[0];
    var outputChannel = outputBuffer.getChannelData(0);

    var sampleRate = this.audiolet.device.sampleRate;
    var log001 = this.log001;

    var valueParameter = this.value;
    var value, valueChannel;
    if (valueParameter.isStatic()) {
        value = valueParameter.getValue();
    }
    else {
        valueChannel = valueParameter.getChannel();
    }

    var lagParameter = this.lag;
    var lag, lagChannel, coefficient;
    if (lagParameter.isStatic()) {
        lag = lagParameter.getValue();
        coefficient = Math.exp(log001 / (lag * sampleRate));
    }
    else {
        lagChannel = lagParameter.getChannel();
    }

    var lastValue = this.lastValue;

    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (valueChannel) {
            value = valueChannel[i];
            coefficient = Math.exp(log001 / (lag * sampleRate));
        }

        if (lagChannel) {
            lag = lagChannel[i];
        }
        var output = ((1 - coefficient) * value) +
                     (coefficient * lastValue);
        outputChannel[i] = output;
        lastValue = output;
    }
    this.lastValue = lastValue;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Lag.prototype.toString = function() {
    return 'Lag';
};


/*!
 * @depends ../core/AudioletGroup.js
 */

/**
 * A simple (and frankly shoddy) zero-lookahead limiter.
 *
 * **Inputs**
 *
 * - Audio
 * - Threshold
 * - Attack
 * - Release
 *
 * **Outputs**
 *
 * - Limited audio
 *
 * **Parameters**
 *
 * - threshold The limiter threshold.  Linked to input 1.
 * - attack The attack time in seconds. Linked to input 2.
 * - release The release time in seconds.  Linked to input 3.
 *
 * @constructor
 * @extends AudioletGroup
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [threshold=0.95] The initial threshold.
 * @param {Number} [attack=0.01] The initial attack time.
 * @param {Number} [release=0.4] The initial release time.
 */
var Limiter = function(audiolet, threshold, attack, release) {
    AudioletGroup.call(this, audiolet, 4, 1);

    // Parameters
    var attack = attack || 0.01;
    this.attackNode = new ParameterNode(audiolet, attack);
    this.attack = this.attackNode.parameter;

    var release = release || 0.4;
    this.releaseNode = new ParameterNode(audiolet, release);
    this.release = this.releaseNode.parameter;

    this.amplitude = new Amplitude(audiolet);
    this.limitFromAmplitude = new LimitFromAmplitude(audiolet, threshold);
    this.threshold = this.limitFromAmplitude.threshold;

    this.inputs[0].connect(this.amplitude);
    this.inputs[0].connect(this.limitFromAmplitude, 0, 0);
    this.inputs[1].connect(this.limitFromAmplitude, 0, 2);
    this.inputs[2].connect(this.attackNode);
    this.inputs[3].connect(this.releaseNode);

    this.attackNode.connect(this.amplitude, 0, 1);
    this.releaseNode.connect(this.amplitude, 0, 2);

    this.amplitude.connect(this.limitFromAmplitude, 0, 1);
    this.limitFromAmplitude.connect(this.outputs[0]);
};
extend(Limiter, AudioletGroup);

/**
 * toString
 *
 * @return {String} String representation.
 */
Limiter.prototype.toString = function() {
    return 'Limiter';
};

/**
 * Helper node which limits a signal based on an amplitude input.
 *
 * **Inputs**
 *
 * - Audio
 * - Amplitude
 * - Threshold
 *
 * **Outputs**
 *
 * - Limited audio
 *
 * **Parameters**
 *
 * - threshold The limiter threshold.  Linked to input 2.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [threshold=0.95] The initial threshold.
 */
var LimitFromAmplitude = function(audiolet, threshold) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.threshold = new AudioletParameter(this, 2, threshold || 0.95);
};
extend(LimitFromAmplitude, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
LimitFromAmplitude.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var amplitudeBuffer = inputBuffers[1];
    var amplitudeChannel = inputBuffer.getChannelData(0);
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty || amplitudeBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var thresholdParameter = this.threshold;
    var threshold, thresholdChannel;
    if (thresholdParameter.isStatic()) {
        threshold = thresholdParameter.getValue();
    }
    else {
        thresholdChannel = thresholdParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = inputChannel[j];
            var amplitude = amplitudeChannel[j];
            if (thresholdChannel) {
                threshold = thresholdChannel[j];
            }

            var diff = amplitude - threshold;
            if (diff > 0) {
                outputChannel[j] = inputChannel[j] / (1 + diff);
            }
            else {
                outputChannel[j] = inputChannel[j];
            }
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
LimitFromAmplitude.prototype.toString = function() {
    return ('Limit From Amplitude');
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Linear cross-fade between two signals
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 * - Fade Position
 *
 * **Outputs**
 *
 * - Mixed audio
 *
 * **Parameters**
 *
 * - position The fade position.  Values between 0 (Audio 1 only) and 1 (Audio
 * 2 only).  Linked to input 2.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [position=0.5] The initial fade position.
 */
var LinearCrossFade = function(audiolet, position) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.position = new AudioletParameter(this, 2, position || 0.5);
};
extend(LinearCrossFade, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
LinearCrossFade.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBufferA = inputBuffers[0];
    var inputBufferB = inputBuffers[1];
    var outputBuffer = outputBuffers[0];

    var inputChannelsA = inputBufferA.channels;
    var inputChannelsB = inputBufferB.channels;
    var outputChannels = outputBuffer.channels;

    if (inputBufferA.isEmpty || inputBufferB.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var positionParameter = this.position;
    var position, positionChannel;
    if (positionParameter.isStatic()) {
        position = positionParameter.getValue();
    }
    else {
        positionChannel = positionParameter.getChannel();
    }

    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (positionChannel) {
            position = positionChannel[i];
        }

        var gainA = 1 - position;
        var gainB = position;

        var numberOfChannels = inputBufferA.numberOfChannels;
        for (var j = 0; j < numberOfChannels; j++) {
            var inputChannelA = inputChannelsA[j];
            var inputChannelB = inputChannelsB[j];
            var outputChannel = outputChannels[j];

            outputChannel[i] = inputChannelA[i] * gainA +
                               inputChannelB[i] * gainB;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
LinearCrossFade.prototype.toString = function() {
    return 'Linear Cross Fader';
};

/*!
 * @depends BiquadFilter.js
 */

/**
 * Low-pass filter
 *
 * **Inputs**
 *
 * - Audio
 * - Filter frequency
 *
 * **Outputs**
 *
 * - Filtered audio
 *
 * **Parameters**
 *
 * - frequency The filter frequency.  Linked to input 1.
 *
 * @constructor
 * @extends BiquadFilter
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} frequency The initial frequency.
 */
var LowPassFilter = function(audiolet, frequency) {
    BiquadFilter.call(this, audiolet, frequency);
};
extend(LowPassFilter, BiquadFilter);

/**
 * Calculate the biquad filter coefficients using maths from
 * http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
 *
 * @param {Number} frequency The filter frequency.
 */
LowPassFilter.prototype.calculateCoefficients = function(frequency) {
    var w0 = 2 * Math.PI * frequency /
             this.audiolet.device.sampleRate;
    var cosw0 = Math.cos(w0);
    var sinw0 = Math.sin(w0);
    var alpha = sinw0 / (2 / Math.sqrt(2));

    this.b0 = (1 - cosw0) / 2;
    this.b1 = 1 - cosw0;
    this.b2 = this.b0;
    this.a0 = 1 + alpha;
    this.a1 = -2 * cosw0;
    this.a2 = 1 - alpha;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
LowPassFilter.prototype.toString = function() {
    return 'Low Pass Filter';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Position a single-channel input in stereo space
 *
 * **Inputs**
 *
 * - Audio
 * - Pan Position
 *
 * **Outputs**
 *
 * - Panned audio
 *
 * **Parameters**
 *
 * - pan The pan position.  Values between 0 (hard-left) and 1 (hard-right).
 * Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [pan=0.5] The initial pan position.
 */
var Pan = function(audiolet, pan) {
    AudioletNode.call(this, audiolet, 2, 1);
    // Hardcode two output channels
    this.setNumberOfOutputChannels(0, 2);
    if (pan == null) {
        var pan = 0.5;
    }
    this.pan = new AudioletParameter(this, 1, pan);
};
extend(Pan, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Pan.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var inputChannel = inputBuffer.getChannelData(0);
    var leftOutputChannel = outputBuffer.getChannelData(0);
    var rightOutputChannel = outputBuffer.getChannelData(1);

    // Local processing variables
    var panParameter = this.pan;
    var pan, panChannel;
    if (panParameter.isStatic()) {
        pan = panParameter.getValue();
    }
    else {
        panChannel = panParameter.getChannel();
    }

    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (panChannel) {
            pan = panChannel[i];
        }
        var scaledPan = pan * Math.PI / 2;
        var value = inputChannel[i];
        // TODO: Use sine/cos tables?
        leftOutputChannel[i] = value * Math.cos(scaledPan);
        rightOutputChannel[i] = value * Math.sin(scaledPan);
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Pan.prototype.toString = function() {
    return 'Stereo Panner';
};

/*!
 * @depends Envelope.js
 */

/**
 * Simple attack-release envelope
 *
 * **Inputs**
 *
 * - Gate
 *
 * **Outputs**
 *
 * - Envelope
 *
 * **Parameters**
 *
 * - gate The gate controlling the envelope.  Value changes from 0 -> 1
 * trigger the envelope.  Linked to input 0.
 *
 * @constructor
 * @extends Envelope
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} gate The initial gate value.
 * @param {Number} attack The attack time in seconds.
 * @param {Number} release The release time in seconds.
 * @param {Function} [onComplete] A function called after the release stage.
 */
var PercussiveEnvelope = function(audiolet, gate, attack, release,
                                  onComplete) {
    var levels = [0, 1, 0];
    var times = [attack, release];
    Envelope.call(this, audiolet, gate, levels, times, null, onComplete);
};
extend(PercussiveEnvelope, Envelope);

/**
 * toString
 *
 * @return {String} String representation.
 */
PercussiveEnvelope.prototype.toString = function() {
    return 'Percussive Envelope';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Pulse wave oscillator.
 *
 * **Inputs**
 *
 * - Frequency
 * - Pulse width
 *
 * **Outputs**
 *
 * - Waveform
 *
 * **Parameters**
 *
 * - frequency The oscillator frequency.  Linked to input 0.
 * - pulseWidth The pulse width.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] The initial frequency.
 * @param {Number} [pulseWidth=0.5] The initial pulse width.
 */
var Pulse = function(audiolet, frequency, pulseWidth) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.pulseWidth = new AudioletParameter(this, 1, pulseWidth || 0.5);
    this.phase = 0;
};
extend(Pulse, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Pulse.prototype.generate = function(inputBuffers, outputBuffers) {
    var buffer = outputBuffers[0];
    var channel = buffer.getChannelData(0);

    // Make processing variables local
    var sampleRate = this.audiolet.device.sampleRate;
    var phase = this.phase;

    var frequencyParameter = this.frequency;
    var frequency, frequencyChannel;
    if (frequencyParameter.isStatic()) {
        frequency = frequencyParameter.getValue();
    }
    else {
        frequencyChannel = frequencyParameter.getChannel();
    }

    var pulseWidthParameter = this.pulseWidth;
    var pulseWidth, pulseWidthChannel;
    if (pulseWidthParameter.isStatic()) {
        pulseWidth = pulseWidthParameter.getValue();
    }
    else {
        pulseWidthChannel = pulseWidthParameter.getChannel();
    }

    // Processing loop
    var bufferLength = buffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (frequencyChannel) {
            frequency = frequencyChannel[i];
        }
        if (pulseWidthChannel) {
            pulseWidth = pulseWidthChannel[i];
        }

        phase += frequency / sampleRate;
        if (phase > 1) {
            phase %= 1;
        }
        channel[i] = (phase < pulseWidth) ? 1 : -1;
    }
    this.phase = phase;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Pulse.prototype.toString = function() {
    return 'Pulse';
};


/*!
 * @depends ../core/AudioletNode.js
 * @depends ../core/AudioletGroup.js
 */

/**
 * Port of the Freeverb Schrodoer/Moorer reverb model.  See
 * https://ccrma.stanford.edu/~jos/pasp/Freeverb.html for a description of how
 * each part works.  This is an old, slow, crappy version maintained for
 * backwards compatibility.  It is recommended to that you use Reverb instead.
 *
 * **Inputs**
 *
 * - Audio
 * - Mix
 * - Room Size
 * - Damping
 *
 * **Outputs**
 *
 * - Reverberated Audio
 *
 * **Parameters**
 *
 * - mix The wet/dry mix.  Values between 0 and 1.  Linked to input 1.
 * - roomSize The reverb's room size.  Values between 0 and 1.  Linked to input
 * 2.
 * - damping The amount of high-frequency damping.  Values between 0 and 1.
 * Linked to input 3.
 *
 * @constructor
 * @extends AudioletGroup
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [mix=0.33] The initial wet/dry mix.
 * @param {Number} [roomSize=0.5] The initial room size.
 * @param {Number} [damping=0.5] The initial damping amount.
 */
var ReverbB = function(audiolet, mix, roomSize, damping) {
    AudioletGroup.call(this, audiolet, 4, 1);

    // Constants
    this.initialMix = 0.33;
    this.fixedGain = 0.015;
    this.initialDamping = 0.5;
    this.scaleDamping = 0.4;
    this.initialRoomSize = 0.5;
    this.scaleRoom = 0.28;
    this.offsetRoom = 0.7;

    // Parameters: for 44.1k or 48k
    this.combTuning = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
    this.allPassTuning = [556, 441, 341, 225];

    // Controls
    // Room size control
    var roomSize = roomSize || this.initialRoomSize;
    this.roomSizeNode = new ParameterNode(audiolet, roomSize);
    this.roomSizeMulAdd = new MulAdd(audiolet, this.scaleRoom,
                                     this.offsetRoom);

    // Damping control
    var damping = damping || this.initialDamping;
    this.dampingNode = new ParameterNode(audiolet, damping);
    this.dampingMulAdd = new MulAdd(audiolet, this.scaleDamping);

    // Access the controls as if this is an AudioletNode, and they are it's
    // parameters.
    this.roomSize = this.roomSizeNode.parameter;
    this.damping = this.dampingNode.parameter;

    // Initial gain control
    this.gain = new Gain(audiolet, this.fixedGain);

    // Eight comb filters and feedback gain converters
    this.combFilters = [];
    this.fgConverters = [];
    for (var i = 0; i < this.combTuning.length; i++) {
        var delayTime = this.combTuning[i] /
                        this.audiolet.device.sampleRate;
        this.combFilters[i] = new DampedCombFilter(audiolet, delayTime,
                                                   delayTime);

        this.fgConverters[i] = new FeedbackGainToDecayTime(audiolet,
                                                           delayTime);
    }

    // Four allpass filters
    this.allPassFilters = [];
    for (var i = 0; i < this.allPassTuning.length; i++) {
        this.allPassFilters[i] = new AllPassFilter(audiolet,
                                                   this.allPassTuning[i]);
    }

    // Mixer
    var mix = mix || this.initialMix;
    this.mixer = new LinearCrossFade(audiolet, mix);

    this.mix = this.mixer.position;

    // Connect up the controls
    this.inputs[1].connect(this.mixer, 0, 2);

    this.inputs[2].connect(this.roomSizeNode);
    this.roomSizeNode.connect(this.roomSizeMulAdd);

    this.inputs[3].connect(this.dampingNode);
    this.dampingNode.connect(this.dampingMulAdd);

    // Connect up the gain
    this.inputs[0].connect(this.gain);

    // Connect up the comb filters
    for (var i = 0; i < this.combFilters.length; i++) {
        this.gain.connect(this.combFilters[i]);
        this.combFilters[i].connect(this.allPassFilters[0]);

        // Controls
        this.roomSizeMulAdd.connect(this.fgConverters[i]);
        this.fgConverters[i].connect(this.combFilters[i], 0, 2);

        this.dampingMulAdd.connect(this.combFilters[i], 0, 3);
    }

    // Connect up the all pass filters
    var numberOfAllPassFilters = this.allPassFilters.length;
    for (var i = 0; i < numberOfAllPassFilters - 1; i++) {
        this.allPassFilters[i].connect(this.allPassFilters[i + 1]);
    }

    this.inputs[0].connect(this.mixer);
    var lastAllPassIndex = numberOfAllPassFilters - 1;
    this.allPassFilters[lastAllPassIndex].connect(this.mixer, 0, 1);

    this.mixer.connect(this.outputs[0]);
};
extend(ReverbB, AudioletGroup);

/**
 * toString
 *
 * @return {String} String representation.
 */
ReverbB.prototype.toString = function() {
    return 'Reverb B';
};

/**
 * Helper node to convert a feedback gain multiplier to a 60db decay time.
 *
 * **Inputs**
 *
 * - Feedback gain
 *
 * **Outputs**
 *
 * - Decay time
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} delayTime The delay time in seconds
 */
var FeedbackGainToDecayTime = function(audiolet, delayTime) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.delayTime = delayTime;
    this.lastFeedbackGain = null;
    this.decayTime = null;
};
extend(FeedbackGainToDecayTime, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
FeedbackGainToDecayTime.prototype.generate = function(inputBuffers,
                                                      outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];
    var inputChannel = inputBuffer.channels[0];
    var outputChannel = outputBuffer.channels[0];

    var delayTime = this.lastDelayTime;
    var decayTime = this.decayTime;
    var lastFeedbackGain = this.lastFeedbackGain;

    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        var feedbackGain = inputChannel[i];
        if (feedbackGain != lastFeedbackGain) {
            decayTime = - 3 * delayTime / Math.log(feedbackGain);
            lastFeedbackGain = feedbackGain;
        }
        outputChannel[i] = feedbackGain;
    }

    this.decayTime = decayTime;
    this.lastFeedbackGain = lastFeedbackGain;
};

/*!
 * @depends ../core/AudioletNode.js
 * @depends ../core/AudioletGroup.js
 */

/**
 * Port of the Freeverb Schrodoer/Moorer reverb model.  See
 * https://ccrma.stanford.edu/~jos/pasp/Freeverb.html for a description of how
 * each part works.
 *
 * **Inputs**
 *
 * - Audio
 * - Mix
 * - Room Size
 * - Damping
 *
 * **Outputs**
 *
 * - Reverberated Audio
 *
 * **Parameters**
 *
 * - mix The wet/dry mix.  Values between 0 and 1.  Linked to input 1.
 * - roomSize The reverb's room size.  Values between 0 and 1.  Linked to input
 * 2.
 * - damping The amount of high-frequency damping.  Values between 0 and 1.
 * Linked to input 3.
 *
 * @constructor
 * @extends AudioletGroup
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [mix=0.33] The initial wet/dry mix.
 * @param {Number} [roomSize=0.5] The initial room size.
 * @param {Number} [damping=0.5] The initial damping amount.
 */
var Reverb = function(audiolet, mix, roomSize, damping) {
    AudioletNode.call(this, audiolet, 4, 1);

    // Constants
    this.initialMix = 0.33;
    this.fixedGain = 0.015;
    this.initialDamping = 0.5;
    this.scaleDamping = 0.4;
    this.initialRoomSize = 0.5;
    this.scaleRoom = 0.28;
    this.offsetRoom = 0.7;

    // Parameters: for 44.1k or 48k
    this.combTuning = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
    this.allPassTuning = [556, 441, 341, 225];

    // Controls
    // Mix control
    var mix = mix || this.initialMix;
    this.mix = new AudioletParameter(this, 1, mix);

    // Room size control
    var roomSize = roomSize || this.initialRoomSize;
    this.roomSize = new AudioletParameter(this, 2, roomSize);

    // Damping control
    var damping = damping || this.initialDamping;
    this.damping = new AudioletParameter(this, 3, damping);

    // Damped comb filters
    this.combBuffers = [];
    this.combIndices = [];
    this.filterStores = [];

    var numberOfCombs = this.combTuning.length;
    for (var i = 0; i < numberOfCombs; i++) {
        this.combBuffers.push(new Float32Array(this.combTuning[i]));
        this.combIndices.push(0);
        this.filterStores.push(0);
    }

    // All-pass filters
    this.allPassBuffers = [];
    this.allPassIndices = [];

    var numberOfFilters = this.allPassTuning.length;
    for (var i = 0; i < numberOfFilters; i++) {
        this.allPassBuffers.push(new Float32Array(this.allPassTuning[i]));
        this.allPassIndices.push(0);
    }
};
extend(Reverb, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Reverb.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var inputChannel = inputBuffer.channels[0];
    var outputBuffer = outputBuffers[0];
    var outputChannel = outputBuffer.channels[0];

    var mixParameter = this.mix;
    var mix, mixChannel;
    if (mixParameter.isStatic()) {
        mix = mixParameter.getValue();
    }
    else {
        mixChannel = mixParameter.getChannel();
    }

    var roomSizeParameter = this.roomSize;
    var roomSize, roomSizeChannel;
    if (roomSizeParameter.isStatic()) {
        roomSize = roomSizeParameter.getValue();
    }
    else {
        roomSizeChannel = roomSizeParameter.getChannel();
    }

    var dampingParameter = this.damping;
    var damping, dampingChannel;
    if (dampingParameter.isStatic()) {
        damping = dampingParameter.getValue();
    }
    else {
        dampingChannel = dampingParameter.getChannel();
    }

    var numberOfCombs = this.combTuning.length;
    var numberOfFilters = this.allPassTuning.length;

    var gain = this.fixedGain;

    var combBuffers = this.combBuffers;
    var combIndices = this.combIndices;
    var filterStores = this.filterStores;

    var allPassBuffers = this.allPassBuffers;
    var allPassIndices = this.allPassIndices;

    var scaleDamping = this.scaleDamping;

    var scaleRoom = this.scaleRoom;
    var offsetRoom = this.offsetRoom;

    var bufferLength = inputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (mixChannel) {
            mix = mixChannel[i];
        }
        if (roomSizeChannel) {
            roomSize = roomSizeChannel[i];
        }
        if (dampingChannel) {
            damping = dampingChannel[i];
        }

        var value;
        if (!inputBuffer.isEmpty) {
            value = inputChannel[i];
        }
        else {
            value = 0;
        }
        var dryValue = value;

        value *= gain;
        var gainedValue = value;

        var damping = damping * scaleDamping;
        var feedback = roomSize * scaleRoom + offsetRoom;
        for (var j = 0; j < numberOfCombs; j++) {
            var combIndex = combIndices[j];
            var combBuffer = combBuffers[j];
            var filterStore = filterStores[j];

            var output = combBuffer[combIndex];
            filterStore = (output * (1 - damping)) +
                          (filterStore * damping);
            value += output;
            combBuffer[combIndex] = gainedValue + feedback * filterStore;

            combIndex += 1;
            if (combIndex >= combBuffer.length) {
                combIndex = 0;
            }


            combIndices[j] = combIndex;
            filterStores[j] = filterStore;
        }

        for (var j = 0; j < numberOfFilters; j++) {
            var allPassBuffer = allPassBuffers[j];
            var allPassIndex = allPassIndices[j];

            var input = value;
            var bufferValue = allPassBuffer[allPassIndex];
            value = -value + bufferValue;
            allPassBuffer[allPassIndex] = input + (bufferValue * 0.5);

            allPassIndex += 1;
            if (allPassIndex >= allPassBuffer.length) {
                allPassIndex = 0;
            }

            allPassIndices[j] = allPassIndex;
        }

        outputChannel[i] = mix * value + (1 - mix) * dryValue;
    }
};


/**
 * toString
 *
 * @return {String} String representation.
 */
Reverb.prototype.toString = function() {
    return 'Reverb';
};


/*!
 * @depends TableLookupOscillator.js
 */

/**
 * Saw wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Saw wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 *
 * @constructor
 * @extends TableLookupOscillator
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Saw = function(audiolet, frequency) {
    TableLookupOscillator.call(this, audiolet, Saw.TABLE, frequency);
};
extend(Saw, TableLookupOscillator);

/**
 * toString
 *
 * @return {String} String representation.
 */
Saw.prototype.toString = function() {
    return 'Saw';
};

/**
 * Saw table
 */
Saw.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Saw.TABLE.push(((((i - 4096) / 8192) % 1) + 1) % 1 * 2 - 1);
}


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A soft-clipper, which distorts at values over +-0.5.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Clipped audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 */

var SoftClip = function(audiolet) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
};
extend(SoftClip, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
SoftClip.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = inputChannel[j];
            if (value > 0.5) {
                outputChannel[j] = (value - 0.25) / value;
            }
            else if (value < -0.5) {
                outputChannel[j] = (-value - 0.25) / value;
            }
            else {
                outputChannel[j] = value;
            }
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
SoftClip.prototype.toString = function() {
    return ('SoftClip');
};


/*!
 * @depends TableLookupOscillator.js
 */

/**
 * Square wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Square wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 *
 * @constructor
 * @extends TableLookupOscillator
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Square = function(audiolet, frequency) {
    TableLookupOscillator.call(this, audiolet, Square.TABLE, frequency);
};
extend(Square, TableLookupOscillator);

/**
 * toString
 *
 * @return {String} String representation.
 */
Square.prototype.toString = function() {
    return 'Square';
};

/**
 * Square wave table
 */
Square.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Square.TABLE.push(((i - 4096) / 8192) < 0 ? 1 : -1);
}



/*!
 * @depends TableLookupOscillator.js
 */

/**
 * Triangle wave oscillator using a lookup table
 *
 * **Inputs**
 *
 * - Frequency
 *
 * **Outputs**
 *
 * - Triangle wave
 *
 * **Parameters**
 *
 * - frequency The frequency of the oscillator.  Linked to input 0.
 *
 * @constructor
 * @extends TableLookupOscillator
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Triangle = function(audiolet, frequency) {
    TableLookupOscillator.call(this, audiolet, Triangle.TABLE, frequency);
};
extend(Triangle, TableLookupOscillator);

/**
 * toString
 *
 * @return {String} String representation.
 */
Triangle.prototype.toString = function() {
    return 'Triangle';
};

/**
 * Triangle table
 */
Triangle.TABLE = [];
for (var i = 0; i < 8192; i++) {
    // Smelly, but looks right...
    Triangle.TABLE.push(Math.abs(((((i - 2048) / 8192) % 1) + 1) % 1 * 2 - 1) * 2 - 1);
}


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Simple trigger which allows you to set a single sample to be 1 at the start
 * of a processing block
 *
 * **Outputs**
 *
 * - Triggers
 *
 * **Parameters**
 *
 * - trigger Set to 1 to fire a trigger.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [trigger=0] The initial trigger state.
 */
var TriggerControl = function(audiolet, trigger) {
    AudioletNode.call(this, audiolet, 0, 1);
    this.trigger = new AudioletParameter(this, null, trigger || 0);
};
extend(TriggerControl, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
TriggerControl.prototype.generate = function(inputBuffers, outputBuffers) {
    var buffer = outputBuffers[0];
    var channel = buffer.getChannelData(0);

    var triggerParameter = this.trigger;
    var trigger = triggerParameter.getValue();

    var bufferLength = buffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (trigger) {
            channel[i] = 1;
            triggerParameter.setValue(0);
            trigger = 0;
        }
        else {
            channel[i] = 0;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
TriggerControl.prototype.toString = function() {
    return 'Trigger Control';
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Upmix an input to a constant number of output channels
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Upmixed audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} outputChannels The number of output channels.
 */
var UpMixer = function(audiolet, outputChannels) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.outputChannels = outputChannels;
    this.outputs[0].numberOfChannels = outputChannels;
};
extend(UpMixer, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
UpMixer.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var outputChannels = this.outputChannels;

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < outputChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i % numberOfChannels);
        var outputChannel = outputBuffer.getChannelData(i);
        outputChannel.set(inputChannel);
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
UpMixer.prototype.toString = function() {
    return 'UpMixer';
};


var WebKitBufferPlayer = function(audiolet, url) {
    AudioletNode.call(this, audiolet, 0, 1);
    this.isWebKit = this.audiolet.device.sink instanceof Sink.sinks.webkit;

    this.context = this.audiolet.device.sink._context;

    if (this.isWebKit) {
        this.xhr = new XMLHttpRequest();
        this.xhr.open("GET", url, true);
        this.xhr.responseType = "arraybuffer";
        this.xhr.onload = this.onLoad.bind(this);
        this.xhr.send();
    }

    this.ready = false;
};
extend(WebKitBufferPlayer, AudioletNode);

WebKitBufferPlayer.prototype.onLoad = function() {
    this.fileBuffer = this.context.createBuffer(this.xhr.response, false);
    this.setNumberOfOutputChannels(0, this.fileBuffer.numberOfChannels);

    this.jsNode = this.context.createJavaScriptNode(4096, this.fileBuffer.numberOfChannels, 0);
    this.jsNode.onaudioprocess = this.onData.bind(this);

    this.source = this.context.createBufferSource();
    this.source.buffer = this.fileBuffer;

    this.source.connect(this.jsNode);
    this.jsNode.connect(this.context.destination);
    this.source.noteOn(0);

    this.buffer = new AudioletBuffer(this.fileBuffer.numberOfChannels, 1024);
    this.ready = true;
};

WebKitBufferPlayer.prototype.onData = function(event) {
    var oldLength = this.buffer.length;
    var newLength = oldLength + event.inputBuffer.length;
    this.buffer.resize(this.buffer.numberOfChannels, newLength);

    for (var i=0; i<event.inputBuffer.numberOfChannels; i++) {
        var channelA = event.inputBuffer.getChannelData(i);
        var channelB = this.buffer.getChannelData(i);
        var bufferLength = event.inputBuffer.length;
        for (var j=0; j<event.inputBuffer.length; j++) {
            channelB[oldLength + j] = channelA[j];
        }
    }
};

WebKitBufferPlayer.prototype.generate = function(inputBuffers, outputBuffers) {
    var outputBuffer = outputBuffers[0];
    if (!this.ready) {
        outputBuffer.isEmpty = true;
        return;
    }

    if (this.buffer.length > outputBuffer.length) {
        this.buffer.shift(outputBuffer);
    }
    else {
        outputBuffer.isEmpty = true;
    }
};

/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A white noise source
 *
 * **Outputs**
 *
 * - White noise
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 */
var WhiteNoise = function(audiolet) {
    AudioletNode.call(this, audiolet, 0, 1);
};
extend(WhiteNoise, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
WhiteNoise.prototype.generate = function(inputBuffers, outputBuffers) {
    var buffer = outputBuffers[0];
    var channel = buffer.getChannelData(0);

    // Processing loop
    var bufferLength = buffer.length;
    for (var i = 0; i < bufferLength; i++) {
        channel[i] = Math.random() * 2 - 1;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
WhiteNoise.prototype.toString = function() {
    return 'White Noise';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Add values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Summed audio
 *
 * **Parameters**
 *
 * - value The value to add.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [value=0] The initial value to add.
 */
var Add = function(audiolet, value) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new AudioletParameter(this, 1, value || 0);
};
extend(Add, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Add.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var valueParameter = this.value;
    var value, valueChannel;
    if (valueParameter.isStatic()) {
        value = valueParameter.getValue();
    }
    else {
        valueChannel = valueParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (valueChannel) {
                value = valueChannel[j];
            }
            outputChannel[j] = inputChannel[j] + value;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Add.prototype.toString = function() {
    return 'Add';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Divide values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Divided audio
 *
 * **Parameters**
 *
 * - value The value to divide by.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [value=1] The initial value to divide by.
 */
var Divide = function(audiolet, value) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new AudioletParameter(this, 1, value || 1);
};
extend(Divide, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Divide.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var valueParameter = this.value;
    var value, valueChannel;
    if (valueParameter.isStatic()) {
        value = valueParameter.getValue();
    }
    else {
        valueChannel = valueParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (valueChannel) {
                value = valueChannel[j];
            }
            outputChannel[j] = inputChannel[j] / value;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Divide.prototype.toString = function() {
    return 'Divide';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Modulo values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Moduloed audio
 *
 * **Parameters**
 *
 * - value The value to modulo by.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [value=1] The initial value to modulo by.
 */
var Modulo = function(audiolet, value) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new AudioletParameter(this, 1, value || 1);
};
extend(Modulo, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Modulo.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var valueParameter = this.value;
    var value, valueChannel;
    if (valueParameter.isStatic()) {
        value = valueParameter.getValue();
    }
    else {
        valueChannel = valueParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (valueChannel) {
                value = valueChannel[j];
            }
            outputChannel[j] = inputChannel[j] % value;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Modulo.prototype.toString = function() {
    return 'Modulo';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/*
 * Multiply and add values
 *
 * **Inputs**
 *
 * - Audio
 * - Multiply audio
 * - Add audio
 *
 * **Outputs**
 *
 * - MulAdded audio
 *
 * **Parameters**
 *
 * - mul The value to multiply by.  Linked to input 1.
 * - add The value to add.  Linked to input 2.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [mul=1] The initial value to multiply by.
 * @param {Number} [add=0] The initial value to add.
 */
var MulAdd = function(audiolet, mul, add) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.mul = new AudioletParameter(this, 1, mul || 1);
    this.add = new AudioletParameter(this, 2, add || 0);
};
extend(MulAdd, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
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
};

/**
 * toString
 *
 * @return {String} String representation.
 */
MulAdd.prototype.toString = function() {
    return 'Multiplier/Adder';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/*
 * Multiply values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Multiplied audio
 *
 * **Parameters**
 *
 * - value The value to multiply by.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [value=1] The initial value to multiply by.
 */
var Multiply = function(audiolet, value) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new AudioletParameter(this, 1, value || 1);
};
extend(Multiply, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Multiply.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var valueParameter = this.value;
    var value, valueChannel;
    if (valueParameter.isStatic()) {
        value = valueParameter.getValue();
    }
    else {
        valueChannel = valueParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (valueChannel) {
                value = valueChannel[j];
            }
            outputChannel[j] = inputChannel[j] * value;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Multiply.prototype.toString = function() {
    return 'Multiply';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Reciprocal (1/x) of values
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Reciprocal audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 */
var Reciprocal = function(audiolet) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
};
extend(Reciprocal, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Reciprocal.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            outputChannel[j] = 1 / inputChannel[j];
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Reciprocal.prototype.toString = function() {
    return 'Reciprocal';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Subtract values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Subtracted audio
 *
 * **Parameters**
 *
 * - value The value to subtract.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [value=0] The initial value to subtract.
 */
var Subtract = function(audiolet, value) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new AudioletParameter(this, 1, value || 0);
};
extend(Subtract, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Subtract.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    // Local processing variables
    var valueParameter = this.value;
    var value, valueChannel;
    if (valueParameter.isStatic()) {
        value = valueParameter.getValue();
    }
    else {
        valueChannel = valueParameter.getChannel();
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            if (valueChannel) {
                value = valueChannel[j];
            }
            outputChannel[j] = inputChannel[j] - value;
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Subtract.prototype.toString = function() {
    return 'Subtract';
};


/**
 * @depends ../core/AudioletNode.js
 */

/**
 * Hyperbolic tangent of values.  Works nicely as a distortion function.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Tanh audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 */

var Tanh = function(audiolet) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
};
extend(Tanh, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Tanh.prototype.generate = function(inputBuffers, outputBuffers) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];

    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }

    var numberOfChannels = inputBuffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = inputBuffer.getChannelData(i);
        var outputChannel = outputBuffer.getChannelData(i);
        var bufferLength = inputBuffer.length;
        for (var j = 0; j < bufferLength; j++) {
            var value = inputChannel[j];
            outputChannel[j] = (Math.exp(value) - Math.exp(-value)) /
                (Math.exp(value) + Math.exp(-value));
        }
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Tanh.prototype.toString = function() {
    return ('Tanh');
};


/**
 * A generic pattern.  Patterns are simple classes which return the next value
 * in a sequence when the next function is called.  Patterns can be embedded
 * inside other patterns to produce complex sequences of values.  When a
 * pattern is finished its next function returns null.
 *
 * @constructor
 */
var Pattern = function() {
};

/**
 * Default next function.
 *
 * @return {null} Null.
 */
Pattern.prototype.next = function() {
    return null;
};

/**
 * Return the current value of an item contained in a pattern.
 *
 * @param {Pattern|Object} The item.
 * @return {Object} The value of the item.
 */
Pattern.prototype.valueOf = function(item) {
    if (item instanceof Pattern) {
        return (item.next());
    }
    else {
        return (item);
    }
};

/**
 * Default reset function.
 */
Pattern.prototype.reset = function() {
};


/*!
 * @depends Pattern.js
 */

/**
 * Arithmetic sequence.  Adds a value to a running total on each next call.
 *
 * @constructor
 * @extends Pattern
 * @param {Number} start Starting value.
 * @param {Pattern|Number} step Value to add.
 * @param {Number} repeats Number of values to generate.
 */
var PArithmetic = function(start, step, repeats) {
    Pattern.call(this);
    this.start = start;
    this.value = start;
    this.step = step;
    this.repeats = repeats;
    this.position = 0;
};
extend(PArithmetic, Pattern);

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
PArithmetic.prototype.next = function() {
    var returnValue;
    if (this.position == 0) {
        returnValue = this.value;
        this.position += 1;
    }
    else if (this.position < this.repeats) {
        var step = this.valueOf(this.step);
        if (step != null) {
            this.value += step;
            returnValue = this.value;
            this.position += 1;
        }
        else {
            returnValue = null;
        }
    }
    else {
        returnValue = null;
    }
    return (returnValue);
};

/**
 * Reset the pattern
 */
PArithmetic.prototype.reset = function() {
    this.value = this.start;
    this.position = 0;
    if (this.step instanceof Pattern) {
        this.step.reset();
    }
};

/**
 * Supercollider alias
 */
var Pseries = PArithmetic;


/*!
 * @depends Pattern.js
 */

/**
 * Choose a random value from an array.
 *
 * @constructor
 * @extends Pattern
 * @param {Object[]} list Array of items to choose from.
 * @param {Number} [repeats=1] Number of values to generate.
 */
var PChoose = function(list, repeats) {
    Pattern.call(this);
    this.list = list;
    this.repeats = repeats || 1;
    this.position = 0;
};
extend(PChoose, Pattern);

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
PChoose.prototype.next = function() {
    var returnValue;
    if (this.position < this.repeats) {
        var index = Math.floor(Math.random() * this.list.length);
        var item = this.list[index];
        var value = this.valueOf(item);
        if (value != null) {
            if (!(item instanceof Pattern)) {
                this.position += 1;
            }
            returnValue = value;
        }
        else {
            if (item instanceof Pattern) {
                item.reset();
            }
            this.position += 1;
            returnValue = this.next();
        }
    }
    else {
        returnValue = null;
    }
    return (returnValue);
};

/**
 * Reset the pattern
 */
PChoose.prototype.reset = function() {
    this.position = 0;
    for (var i = 0; i < this.list.length; i++) {
        var item = this.list[i];
        if (item instanceof Pattern) {
            item.reset();
        }
    }
};

/**
 * Supercollider alias
 */
var Prand = PChoose;


/*!
 * @depends Pattern.js
 */


/**
 * Geometric sequence.  Multiplies a running total by a value on each next
 * call.
 *
 * @constructor
 * @extends Pattern
 * @param {Number} start Starting value.
 * @param {Pattern|Number} step Value to multiply by.
 * @param {Number} repeats Number of values to generate.
 */
var PGeometric = function(start, step, repeats) {
    Pattern.call(this);
    this.start = start;
    this.value = start;
    this.step = step;
    this.repeats = repeats;
    this.position = 0;
};
extend(PGeometric, Pattern);

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
PGeometric.prototype.next = function() {
    var returnValue;
    if (this.position == 0) {
        returnValue = this.value;
        this.position += 1;
    }
    else if (this.position < this.repeats) {
        var step = this.valueOf(this.step);
        if (step != null) {
            this.value *= step;
            returnValue = this.value;
            this.position += 1;
        }
        else {
            returnValue = null;
        }
    }
    else {
        returnValue = null;
    }
    return (returnValue);
};

/**
 * Reset the pattern
 */
PGeometric.prototype.reset = function() {
    this.value = this.start;
    this.position = 0;
    if (this.step instanceof Pattern) {
        this.step.reset();
    }
};

/**
 * Supercollider alias
 */
var Pgeom = PGeometric;


/*!
 * @depends Pattern.js
 */

/**
 * Proxy pattern.  Holds a pattern which can safely be replaced by a different
 * pattern while it is running.
 *
 *
 * @constructor
 * @extends Pattern
 * @param {Pattern} pattern The initial pattern.
 */
var PProxy = function(pattern) {
    Pattern.call(this);
    if (pattern) {
        this.pattern = pattern;
    }
};
extend(PProxy, Pattern);

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
PProxy.prototype.next = function() {
    var returnValue;
    if (this.pattern) {
        var returnValue = this.pattern.next();
    }
    else {
        returnValue = null;
    }
    return returnValue;
};

/**
 * Alias
 */
var Pp = PProxy;


/*!
 * @depends Pattern.js
 */

/**
 * Sequence of random numbers.
 *
 * @constructor
 * @extends Pattern
 * @param {Number|Pattern} low Lowest possible value.
 * @param {Number|Pattern} high Highest possible value.
 * @param {Number} repeats Number of values to generate.
 */
var PRandom = function(low, high, repeats) {
    Pattern.call(this);
    this.low = low;
    this.high = high;
    this.repeats = repeats;
    this.position = 0;
};
extend(PRandom, Pattern);

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
PRandom.prototype.next = function() {
    var returnValue;
    if (this.position < this.repeats) {
        var low = this.valueOf(this.low);
        var high = this.valueOf(this.high);
        if (low != null && high != null) {
            this.value *= step;
            returnValue = this.value;
            this.position += 1;
        }
        else {
            returnValue = null;
        }
    }
    else {
        returnValue = null;
    }
    return (returnValue);
};

/**
 * Reset the pattern
 */
PRandom.prototype.reset = function() {
    this.position = 0;
};

/**
 * Supercollider alias
 */
var Pwhite = PRandom;


/*!
 * @depends Pattern.js
 */

/**
 * Iterate through a list of values.
 *
 * @constructor
 * @extends Pattern
 * @param {Object[]} list Array of values.
 * @param {Number} [repeats=1] Number of times to loop through the array.
 * @param {Number} [offset=0] Index to start from.
 */
var PSequence = function(list, repeats, offset) {
    Pattern.call(this);
    this.list = list;
    this.repeats = repeats || 1;
    this.position = 0;
    this.offset = offset || 0;
};
extend(PSequence, Pattern);

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
PSequence.prototype.next = function() {
    var returnValue;
    if (this.position < this.repeats * this.list.length) {
        var index = (this.position + this.offset) % this.list.length;
        var item = this.list[index];
        var value = this.valueOf(item);
        if (value != null) {
            if (!(item instanceof Pattern)) {
                this.position += 1;
            }
            returnValue = value;
        }
        else {
            if (item instanceof Pattern) {
                item.reset();
            }
            this.position += 1;
            returnValue = this.next();
        }
    }
    else {
        returnValue = null;
    }
    return (returnValue);
};

/**
 * Reset the pattern
 */
PSequence.prototype.reset = function() {
    this.position = 0;
    for (var i = 0; i < this.list.length; i++) {
        var item = this.list[i];
        if (item instanceof Pattern) {
            item.reset();
        }
    }
};

/**
 * Supercollider alias
 */
var Pseq = PSequence;


/*!
 * @depends Pattern.js
 */

/**
 * Iterate through a list of values.
 *
 * @constructor
 * @extends Pattern
 * @param {Object[]} list Array of values.
 * @param {Number} [repeats=1] Number of values to generate.
 * @param {Number} [offset=0] Index to start from.
 */
var PSeries = function(list, repeats, offset) {
    Pattern.call(this);
    this.list = list;
    this.repeats = repeats || 1;
    this.position = 0;
    this.offset = offset || 0;
};
extend(PSeries, Pattern);

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
PSeries.prototype.next = function() {
    var returnValue;
    if (this.position < this.repeats) {
        var index = (this.position + this.offset) % this.list.length;
        var item = this.list[index];
        var value = this.valueOf(item);
        if (value != null) {
            if (!(item instanceof Pattern)) {
                this.position += 1;
            }
            returnValue = value;
        }
        else {
            if (item instanceof Pattern) {
                item.reset();
            }
            this.position += 1;
            returnValue = this.next();
        }
    }
    else {
        returnValue = null;
    }
    return (returnValue);
};

/**
 * Reset the pattern
 */
PSeries.prototype.reset = function() {
    this.position = 0;
    for (var i = 0; i < this.list.length; i++) {
        var item = this.list[i];
        if (item instanceof Pattern) {
            item.reset();
        }
    }
};

/**
 * Supercollider alias
 */
var Pser = PSeries;


/*!
 * @depends Pattern.js
 */

/**
 * Reorder an array, then iterate through it's values.
 *
 * @constructor
 * @extends Pattern
 * @param {Object[]} list Array of values.
 * @param {Number} repeats Number of times to loop through the array.
 */
var PShuffle = function(list, repeats) {
    Pattern.call(this);
    this.list = [];
    // Shuffle values into new list
    while (list.length) {
        var index = Math.floor(Math.random() * list.length);
        var value = list.splice(index, 1);
        this.list.push(value);
    }
    this.repeats = repeats;
    this.position = 0;
};
extend(PShuffle, Pattern);

/**
 * Generate the next value in the pattern.
 *
 * @return {Number} The next value.
 */
PShuffle.prototype.next = function() {
    var returnValue;
    if (this.position < this.repeats * this.list.length) {
        var index = (this.position + this.offset) % this.list.length;
        var item = this.list[index];
        var value = this.valueOf(item);
        if (value != null) {
            if (!(item instanceof Pattern)) {
                this.position += 1;
            }
            returnValue = value;
        }
        else {
            if (item instanceof Pattern) {
                item.reset();
            }
            this.position += 1;
            returnValue = this.next();
        }
    }
    else {
        returnValue = null;
    }
    return (returnValue);
};

/**
 * Supercollider alias
 */
var Pshuffle = PShuffle;


/**
 * Representation of a generic musical scale.  Can be subclassed to produce
 * specific scales.
 *
 * @constructor
 * @param {Number[]} degrees Array of integer degrees.
 * @param {Tuning} [tuning] The scale's tuning.  Defaults to 12-tone ET.
 */
var Scale = function(degrees, tuning) {
    this.degrees = degrees;
    this.tuning = tuning || new EqualTemperamentTuning(12);
};

/**
 * Get the frequency of a note in the scale.
 *
 * @constructor
 * @param {Number} degree The note's degree.
 * @param {Number} rootFrequency  The root frequency of the scale.
 * @param {Number} octave The octave of the note.
 * @return {Number} The frequency of the note in hz.
 */
Scale.prototype.getFrequency = function(degree, rootFrequency, octave) {
    var frequency = rootFrequency;
    octave += Math.floor(degree / this.degrees.length);
    degree %= this.degrees.length;
    frequency *= Math.pow(this.tuning.octaveRatio, octave);
    frequency *= this.tuning.ratios[this.degrees[degree]];
    return frequency;
};

/*!
 * @depends Scale.js
 */

/**
 * Major scale.
 *
 * @constructor
 * @extends Scale
 */
var MajorScale = function() {
    Scale.call(this, [0, 2, 4, 5, 7, 9, 11]);
};
extend(MajorScale, Scale);

/*!
 * @depends Scale.js
 */

/**
 * Minor scale.
 *
 * @constructor
 * @extends Scale
 */

var MinorScale = function() {
    Scale.call(this, [0, 2, 3, 5, 7, 8, 10]);
};
extend(MinorScale, Scale);

/**
 *  Representation of a generic musical tuning.  Can be subclassed to produce
 * specific tunings.
 *
 * @constructor
 * @param {Number[]} semitones Array of semitone values for the tuning.
 * @param {Number} [octaveRatio=2] Frequency ratio for notes an octave apart.
 */

var Tuning = function(semitones, octaveRatio) {
    this.semitones = semitones;
    this.octaveRatio = octaveRatio || 2;
    this.ratios = [];
    var tuningLength = this.semitones.length;
    for (var i = 0; i < tuningLength; i++) {
        this.ratios.push(Math.pow(2, this.semitones[i] / tuningLength));
    }
};

/*!
 * @depends Tuning.js
 */

/**
 * Equal temperament tuning.
 *
 * @constructor
 * @extends Tuning
 * @param {Number} pitchesPerOctave The number of notes in each octave.
 */
var EqualTemperamentTuning = function(pitchesPerOctave) {
    var semitones = [];
    for (var i = 0; i < pitchesPerOctave; i++) {
        semitones.push(i);
    }
    Tuning.call(this, semitones, 2);
};
extend(EqualTemperamentTuning, Tuning);

(function (global){
/**
 * Creates a Sink according to specified parameters, if possible.
 *
 * @param {Function} readFn A callback to handle the buffer fills.
 * @param {number} channelCount Channel count.
 * @param {number} preBufferSize (Optional) Specifies a pre-buffer size to control the amount of latency.
 * @param {number} sampleRate Sample rate (ms).
*/
function Sink(readFn, channelCount, preBufferSize, sampleRate){
	var	sinks	= Sink.sinks,
		dev;
	for (dev in sinks){
		if (sinks.hasOwnProperty(dev) && sinks[dev].enabled){
			try{
				return new sinks[dev](readFn, channelCount, preBufferSize, sampleRate);
			} catch(e1){}
		}
	}

	throw "No audio sink available.";
}

/**
 * A Recording class for recording sink output.
 *
 * @private
 * @this {Recording}
 * @constructor
 * @param {Object} bindTo The sink to bind the recording to.
*/

function Recording(bindTo){
	this.boundTo = bindTo;
	this.buffers = [];
	bindTo.activeRecordings.push(this);
}

Recording.prototype = {
/**
 * Adds a new buffer to the recording.
 *
 * @param {Array} buffer The buffer to add.
*/
	add: function(buffer){
		this.buffers.push(buffer);
	},
/**
 * Empties the recording.
*/
	clear: function(){
		this.buffers = [];
	},
/**
 * Stops the recording and unbinds it from it's host sink.
*/
	stop: function(){
		var	recordings = this.boundTo.activeRecordings,
			i;
		for (i=0; i<recordings.length; i++){
			if (recordings[i] === this){
				recordings.splice(i--, 1);
			}
		}
	},
/**
 * Joins the recorded buffers into a single buffer.
*/
	join: function(){
		var	bufferLength	= 0,
			bufPos		= 0,
			buffers		= this.buffers,
			newArray,
			n, i, l		= buffers.length;

		for (i=0; i<l; i++){
			bufferLength += buffers[i].length;
		}
		newArray = new Float32Array(bufferLength);
		for (i=0; i<l; i++){
			for (n=0; n<buffers[i].length; n++){
				newArray[bufPos + n] = buffers[i][n];
			}
			bufPos += buffers[i].length;
		}
		return newArray;
	}
};

function SinkClass(){
}

Sink.SinkClass		= SinkClass;

SinkClass.prototype = {
/**
 * The sample rate of the Sink.
*/
	sampleRate: 44100,
/**
 * The channel count of the Sink.
*/
	channelCount: 2,
/**
 * The amount of samples to pre buffer for the sink.
*/
	preBufferSize: 4096,
/**
 * Write position of the sink, as in how many samples have been written per channel.
*/
	writePosition: 0,
/**
 * The default mode of writing to the sink.
*/
	writeMode: 'async',
/**
 * The mode in which the sink asks the sample buffers to be channeled in.
*/
	channelMode: 'interleaved',
/**
 * The previous time of a callback.
*/
	previousHit: 0,
/**
 * The ring buffer array of the sink. If null, ring buffering will not be applied.
*/
	ringBuffer: null,
/**
 * The current position of the ring buffer.
 * @private
*/
	ringOffset: 0,
/**
 * Does the initialization of the sink.
 * @private
*/
	start: function(readFn, channelCount, preBufferSize, sampleRate){
		this.channelCount	= isNaN(channelCount) ? this.channelCount: channelCount;
		this.preBufferSize	= isNaN(preBufferSize) ? this.preBufferSize : preBufferSize;
		this.sampleRate		= isNaN(sampleRate) ? this.sampleRate : sampleRate;
		this.readFn		= readFn;
		this.activeRecordings	= [];
		this.previousHit	= +new Date;
		this.asyncBuffers	= [];
		this.syncBuffers	= [];
	},
/**
 * The method which will handle all the different types of processing applied on a callback.
 * @private
*/
	process: function(soundData, channelCount){
		this.ringBuffer && (this.channelMode === 'interleaved' ? this.ringSpin : this.ringSpinInterleaved).apply(this, arguments);
		this.writeBuffersSync.apply(this, arguments);
		if (this.readFn){
			if (this.channelMode === 'interleaved'){
				this.readFn.apply(this, arguments);
			} else {
				var soundDataSplit = Sink.deinterleave(soundData, this.channelCount);
				this.readFn.apply(this, [soundDataSplit].concat([].slice.call(arguments, 1)));
				Sink.interleave(soundDataSplit, this.channelCount, soundData);
			}
		}
		this.writeBuffersAsync.apply(this, arguments);
		this.recordData.apply(this, arguments);
		this.previousHit = +new Date;
		this.writePosition += soundData.length / channelCount;
	},
/**
 * Starts recording the sink output.
 *
 * @return {Recording} The recording object for the recording started.
*/
	record: function(){
		return new Recording(this);
	},
/**
 * Private method that handles the adding the buffers to all the current recordings.
 *
 * @private
 * @param {Array} buffer The buffer to record.
*/
	recordData: function(buffer){
		var	activeRecs	= this.activeRecordings,
			i, l		= activeRecs.length;
		for (i=0; i<l; i++){
			activeRecs[i].add(buffer);
		}
	},
/**
 * Private method that handles the mixing of asynchronously written buffers.
 *
 * @private
 * @param {Array} buffer The buffer to write to.
*/
	writeBuffersAsync: function(buffer){
		var	buffers		= this.asyncBuffers,
			l		= buffer.length,
			buf,
			bufLength,
			i, n, offset;
		if (buffers){
			for (i=0; i<buffers.length; i++){
				buf		= buffers[i];
				bufLength	= buf.b.length;
				offset		= buf.d;
				buf.d		-= Math.min(offset, l);
				
				for (n=0; n + offset < l && n < bufLength; n++){
					buffer[n + offset] += buf.b[n];
				}
				buf.b = buf.b.subarray(n + offset);
				i >= bufLength && buffers.splice(i--, 1);
			}
		}
	},
/**
 * A private method that handles mixing synchronously written buffers.
 *
 * @private
 * @param {Array} buffer The buffer to write to.
*/
	writeBuffersSync: function(buffer){
		var	buffers		= this.syncBuffers,
			l		= buffer.length,
			i		= 0,
			soff		= 0;
		for(;i<l && buffers.length; i++){
			buffer[i] += buffers[0][soff];
			if (buffers[0].length <= soff){
				buffers.splice(0, 1);
				soff = 0;
				continue;
			}
			soff++;
		}
		if (buffers.length){
			buffers[0] = buffers[0].subarray(soff);
		}
	},
/**
 * Writes a buffer asynchronously on top of the existing signal, after a specified delay.
 *
 * @param {Array} buffer The buffer to write.
 * @param {Number} delay The delay to write after. If not specified, the Sink will calculate a delay to compensate the latency.
 * @return {Number} The number of currently stored asynchronous buffers.
*/
	writeBufferAsync: function(buffer, delay){
		buffer			= this.mode === 'deinterleaved' ? Sink.interleave(buffer, this.channelCount) : buffer;
		var	buffers		= this.asyncBuffers;
		buffers.push({
			b: buffer,
			d: isNaN(delay) ? ~~((+new Date - this.previousHit) / 1000 * this.sampleRate) : delay
		});
		return buffers.length;
	},
/**
 * Writes a buffer synchronously to the output.
 *
 * @param {Array} buffer The buffer to write.
 * @return {Number} The number of currently stored synchronous buffers.
*/
	writeBufferSync: function(buffer){
		buffer			= this.mode === 'deinterleaved' ? Sink.interleave(buffer, this.channelCount) : buffer;
		var	buffers		= this.syncBuffers;
		buffers.push(buffer);
		return buffers.length;
	},
/**
 * Writes a buffer, according to the write mode specified.
 *
 * @param {Array} buffer The buffer to write.
 * @param {Number} delay The delay to write after. If not specified, the Sink will calculate a delay to compensate the latency. (only applicable in asynchronous write mode)
 * @return {Number} The number of currently stored (a)synchronous buffers.
*/
	writeBuffer: function(){
		this[this.writeMode === 'async' ? 'writeBufferAsync' : 'writeBufferSync'].apply(this, arguments);
	},
/**
 * Gets the total amount of yet unwritten samples in the synchronous buffers.
 *
 * @return {Number} The total amount of yet unwritten samples in the synchronous buffers.
*/
	getSyncWriteOffset: function(){
		var	buffers		= this.syncBuffers,
			offset		= 0,
			i;
		for (i=0; i<buffers.length; i++){
			offset += buffers[i].length;
		}
		return offset;
	},
/**
 * Get the current output position, defaults to writePosition - preBufferSize.
 *
 * @return {Number} The position of the write head, in samples, per channel.
*/
	getPlaybackTime: function(){
		return this.writePosition - this.preBufferSize;
	},
/**
 * A private method that applies the ring buffer contents to the specified buffer, while in interleaved mode.
 *
 * @private
 * @param {Array} buffer The buffer to write to.
*/
	ringSpin: function(buffer){
		var	ring	= this.ringBuffer,
			l	= buffer.length,
			m	= ring.length,
			off	= this.ringOffset,
			i;
		for (i=0; i<l; i++){
			buffer[i] += ring[off];
			off = (off + 1) % m;
		}
		this.ringOffset = off;
	},
/**
 * A private method that applies the ring buffer contents to the specified buffer, while in deinterleaved mode.
 *
 * @private
 * @param {Array} buffer The buffers to write to.
*/
	ringSpinDeinterleaved: function(buffer){
		var	ring	= this.ringBuffer,
			l	= buffer.length,
			ch	= ring.length,
			m	= ring[0].length,
			len	= ch * m,
			off	= this.ringOffset,
			i, n;
		for (i=0; i<l; i+=ch){
			for (n=0; n<ch; n++){
				buffer[i + n] += ring[n][off];
			}
			off = (off + 1) % m;
		}
		this.ringOffset = n;
	}
};

/**
 * The container for all the available sinks. Also a decorator function for creating a new Sink class and binding it.
 *
 * @param {String} type The name / type of the Sink.
 * @param {Function} constructor The constructor function for the Sink.
 * @param {Object} prototype The prototype of the Sink. (optional)
 * @param {Boolean} disabled Whether the Sink should be disabled at first.
*/

function sinks(type, constructor, prototype, disabled){
	prototype = prototype || constructor.prototype;
	constructor.prototype = new Sink.SinkClass();
	constructor.prototype.type = type;
	constructor.enabled = !disabled;
	for (disabled in prototype){
		if (prototype.hasOwnProperty(disabled)){
			constructor.prototype[disabled] = prototype[disabled];
		}
	}
	sinks[type] = constructor;
}

/**
 * A Sink class for the Mozilla Audio Data API.
*/

sinks('moz', function(){
	var	self			= this,
		currentWritePosition	= 0,
		tail			= null,
		audioDevice		= new Audio(),
		written, currentPosition, available, soundData,
		timer; // Fix for https://bugzilla.mozilla.org/show_bug.cgi?id=630117
	self.start.apply(self, arguments);
	// TODO: All sampleRate & preBufferSize combinations don't work quite like expected, fix this.
	self.preBufferSize = isNaN(arguments[2]) ? self.sampleRate / 2 : self.preBufferSize;

	function bufferFill(){
		if (tail){
			written = audioDevice.mozWriteAudio(tail);
			currentWritePosition += written;
			if (written < tail.length){
				tail = tail.subarray(written);
				return tail;
			}
			tail = null;
		}

		currentPosition = audioDevice.mozCurrentSampleOffset();
		available = Number(currentPosition + self.preBufferSize * self.channelCount - currentWritePosition);
		if (available > 0){
			soundData = new Float32Array(available);
			self.process(soundData, self.channelCount);
			written = audioDevice.mozWriteAudio(soundData);
			if (written < soundData.length){
				tail = soundData.subarray(written);
			}
			currentWritePosition += written;
		}
	}

	audioDevice.mozSetup(self.channelCount, self.sampleRate);

	self.kill = Sink.doInterval(bufferFill, 20);
	self._bufferFill	= bufferFill;
	self._audio		= audioDevice;
}, {
	getPlaybackTime: function(){
		return this._audio.mozCurrentSampleOffset() / this.channelCount;
	}
});

/**
 * A sink class for the Web Audio API
*/

var fixChrome82795 = [];

sinks('webkit', function(readFn, channelCount, preBufferSize, sampleRate){
	var	self		= this,
		// For now, we have to accept that the AudioContext is at 48000Hz, or whatever it decides.
		context		= new (window.AudioContext || webkitAudioContext)(/*sampleRate*/),
		node		= context.createJavaScriptNode(preBufferSize, 0, channelCount);
	self.start.apply(self, arguments);

	function bufferFill(e){
		var	outputBuffer	= e.outputBuffer,
			channelCount	= outputBuffer.numberOfChannels,
			i, n, l		= outputBuffer.length,
			size		= outputBuffer.size,
			channels	= new Array(channelCount),
			soundData	= new Float32Array(l * channelCount);

		for (i=0; i<channelCount; i++){
			channels[i] = outputBuffer.getChannelData(i);
		}

		self.process(soundData, self.channelCount);

		for (i=0; i<l; i++){
			for (n=0; n < channelCount; n++){
				channels[n][i] = soundData[i * self.channelCount + n];
			}
		}
	}

	node.onaudioprocess = bufferFill;
	node.connect(context.destination);

	self.sampleRate		= context.sampleRate;
	self._context		= context;
	self._node		= node;
	self._callback		= bufferFill;
	/* Keep references in order to avoid garbage collection removing the listeners, working around http://code.google.com/p/chromium/issues/detail?id=82795 */
	// Thanks to @baffo32
	fixChrome82795.push(node);
}, {
	//TODO: Do something here.
	kill: function(){
	},
	getPlaybackTime: function(){
		return this._context.currentTime * this.sampleRate;
	},
});

sinks.webkit.fix82795 = fixChrome82795;

/**
 * A dummy Sink. (No output)
*/

sinks('dummy', function(){
	var 	self		= this;
	self.start.apply(self, arguments);
	
	function bufferFill(){
		var	soundData = new Float32Array(self.preBufferSize * self.channelCount);
		self.process(soundData, self.channelCount);
	}

	self.kill = Sink.doInterval(bufferFill, self.preBufferSize / self.sampleRate * 1000);

	self._callback		= bufferFill;
}, null, true);

Sink.sinks		= Sink.devices = sinks;
Sink.Recording		= Recording;

Sink.doInterval		= function(callback, timeout){
	var	BlobBuilder	= typeof window === 'undefined' ? undefined : window.MozBlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder || window.OBlobBuilder || window.BlobBuilder,
		timer, id, prev;
	if ((Sink.doInterval.backgroundWork || Sink.devices.moz.backgroundWork) && BlobBuilder){
		try{
			prev	= new BlobBuilder();
			prev.append('setInterval(function(){ postMessage("tic"); }, ' + timeout + ');');
			id	= (window.MozURL || window.webkitURL || window.MSURL || window.OURL || window.URL).createObjectURL(prev.getBlob());
			timer	= new Worker(id);
			timer.onmessage = function(){
				callback();
			};
			return function(){
				timer.terminate();
				(window.MozURL || window.webkitURL || window.MSURL || window.OURL || window.URL).revokeObjectURL(id);
			};
		} catch(e){};
	}
	timer = setInterval(callback, timeout);
	return function(){
		clearInterval(timer);
	};
};

Sink.doInterval.backgroundWork = true;

(function(){

/**
 * If method is supplied, adds a new interpolation method to Sink.interpolation, otherwise sets the default interpolation method (Sink.interpolate) to the specified property of Sink.interpolate.
 *
 * @param {String} name The name of the interpolation method to get / set.
 * @param {Function} method The interpolation method. (Optional)
*/

function interpolation(name, method){
	if (name && method){
		interpolation[name] = method;
	} else if (name && interpolation[name] instanceof Function){
		Sink.interpolate = interpolation[name];
	}
	return interpolation[name];
}

Sink.interpolation = interpolation;


/**
 * Interpolates a fractal part position in an array to a sample. (Linear interpolation)
 *
 * @param {Array} arr The sample buffer.
 * @param {number} pos The position to interpolate from.
 * @return {Float32} The interpolated sample.
*/
interpolation('linear', function(arr, pos){
	var	first	= Math.floor(pos),
		second	= first + 1,
		frac	= pos - first;
	second		= second < arr.length ? second : 0;
	return arr[first] * (1 - frac) + arr[second] * frac;
});

/**
 * Interpolates a fractal part position in an array to a sample. (Nearest neighbour interpolation)
 *
 * @param {Array} arr The sample buffer.
 * @param {number} pos The position to interpolate from.
 * @return {Float32} The interpolated sample.
*/
interpolation('nearest', function(arr, pos){
	return pos >= arr.length - 0.5 ? arr[0] : arr[Math.round(pos)];
});

interpolation('linear');

}());


/**
 * Resamples a sample buffer from a frequency to a frequency and / or from a sample rate to a sample rate.
 *
 * @param {Float32Array} buffer The sample buffer to resample.
 * @param {number} fromRate The original sample rate of the buffer, or if the last argument, the speed ratio to convert with.
 * @param {number} fromFrequency The original frequency of the buffer, or if the last argument, used as toRate and the secondary comparison will not be made.
 * @param {number} toRate The sample rate of the created buffer.
 * @param {number} toFrequency The frequency of the created buffer.
*/
Sink.resample	= function(buffer, fromRate /* or speed */, fromFrequency /* or toRate */, toRate, toFrequency){
	var
		argc		= arguments.length,
		speed		= argc === 2 ? fromRate : argc === 3 ? fromRate / fromFrequency : toRate / fromRate * toFrequency / fromFrequency,
		l		= buffer.length,
		length		= Math.ceil(l / speed),
		newBuffer	= new Float32Array(length),
		i, n;
	for (i=0, n=0; i<l; i += speed){
		newBuffer[n++] = Sink.interpolate(buffer, i);
	}
	return newBuffer;
};

/**
 * Splits a sample buffer into those of different channels.
 *
 * @param {Float32Array} buffer The sample buffer to split.
 * @param {number} channelCount The number of channels to split to.
 * @return {Array} An array containing the resulting sample buffers.
*/

Sink.deinterleave = function(buffer, channelCount){
	var	l	= buffer.length,
		size	= l / channelCount,
		ret	= [],
		i, n;
	for (i=0; i<channelCount; i++){
		ret[i] = new Float32Array(size);
		for (n=0; n<size; n++){
			ret[i][n] = buffer[n * channelCount + i];
		}
	}
	return ret;
};

/**
 * Joins an array of sample buffers into a single buffer.
 *
 * @param {Array} buffers The buffers to join.
 * @param {Number} channelCount The number of channels. Defaults to buffers.length
 * @param {Array} buffer The output buffer. (optional)
*/

Sink.interleave = function(buffers, channelCount, buffer){
	channelCount		= channelCount || buffers.length;
	var	l		= buffers[0].length,
		bufferCount	= buffers.length,
		i, n;
	buffer			= buffer || new Float32Array(l * channelCount);
	for (i=0; i<bufferCount; i++){
		for (n=0; n<l; n++){
			buffer[i + n * channelCount] = buffers[i][n];
		}
	}
	return buffer;
};

/**
 * Mixes two or more buffers down to one.
 *
 * @param {Array} buffer The buffer to append the others to.
 * @param {Array} bufferX The buffers to append from.
*/

Sink.mix = function(buffer){
	var	buffers	= [].slice.call(arguments, 1),
		l, i, c;
	for (c=0; c<buffers.length; c++){
		l = Math.max(buffer.length, buffers[c].length);
		for (i=0; i<l; i++){
			buffer[i] += buffers[c][i];
		}
	}
	return buffer;
};

/**
 * Resets a buffer to all zeroes.
 *
 * @param {Array} buffer The buffer to reset.
*/

Sink.resetBuffer = function(buffer){
	var	l	= buffer.length,
		i;
	for (i=0; i<l; i++){
		buffer[i] = 0;
	}
	return buffer;
};

/**
 * Copies the content of an array to another array.
 *
 * @param {Array} buffer The buffer to copy from.
 * @param {Array} result The buffer to copy to. Optional.
*/

Sink.clone = function(buffer, result){
	var	l	= buffer.length,
		i;
	result = result || new Float32Array(l);
	for (i=0; i<l; i++){
		result[i] = buffer[i];
	}
	return result;
};

/**
 * Creates an array of buffers of the specified length and the specified count.
 *
 * @param {Number} length The length of a single channel.
 * @param {Number} channelCount The number of channels.
 * @return {Array} The array of buffers.
*/

Sink.createDeinterleaved = function(length, channelCount){
	var	result	= new Array(channelCount),
		i;
	for (i=0; i<channelCount; i++){
		result[i] = new Float32Array(length);
	}
	return result;
};

global.Sink = Sink;
}(function(){ return this; }()));

