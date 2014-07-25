function AudioFileRequest(url, async) {
    this.url = url;
    if (typeof async == 'undefined' || async == null) {
        async = true;
    }
    this.async = async;
    var splitURL = url.split('.');
    this.extension = splitURL[splitURL.length - 1].toLowerCase();
}

AudioFileRequest.prototype.onSuccess = function(decoded) {
};

AudioFileRequest.prototype.onFailure = function(decoded) {
};


AudioFileRequest.prototype.send = function() {
    if (this.extension != 'wav' &&
        this.extension != 'aiff' &&
        this.extension != 'aif') {
        this.onFailure();
        return;
    }

    var request = new XMLHttpRequest();
    request.open('GET', this.url, this.async);
    request.overrideMimeType('text/plain; charset=x-user-defined');
    request.onreadystatechange = function(event) {
        if (request.readyState == 4) {
            if (request.status == 200 || request.status == 0) {
                this.handleResponse(request.responseText);
            }
            else {
                this.onFailure();
            }
        }
    }.bind(this);
    request.send(null);
};

AudioFileRequest.prototype.handleResponse = function(data) {
    var decoder, decoded;
    if (this.extension == 'wav') {
        decoder = new WAVDecoder();
        decoded = decoder.decode(data);
    }
    else if (this.extension == 'aiff' || this.extension == 'aif') {
        decoder = new AIFFDecoder();
        decoded = decoder.decode(data);
    }
    this.onSuccess(decoded);
};


function Decoder() {
}

Decoder.prototype.readString = function(data, offset, length) {
    return data.slice(offset, offset + length);
};

Decoder.prototype.readIntL = function(data, offset, length) {
    var value = 0;
    for (var i = 0; i < length; i++) {
        value = value + ((data.charCodeAt(offset + i) & 0xFF) *
                         Math.pow(2, 8 * i));
    }
    return value;
};

Decoder.prototype.readChunkHeaderL = function(data, offset) {
    var chunk = {};
    chunk.name = this.readString(data, offset, 4);
    chunk.length = this.readIntL(data, offset + 4, 4);
    return chunk;
};

Decoder.prototype.readIntB = function(data, offset, length) {
    var value = 0;
    for (var i = 0; i < length; i++) {
        value = value + ((data.charCodeAt(offset + i) & 0xFF) *
                         Math.pow(2, 8 * (length - i - 1)));
    }
    return value;
};

Decoder.prototype.readChunkHeaderB = function(data, offset) {
    var chunk = {};
    chunk.name = this.readString(data, offset, 4);
    chunk.length = this.readIntB(data, offset + 4, 4);
    return chunk;
};

Decoder.prototype.readFloatB = function(data, offset) {
    var expon = this.readIntB(data, offset, 2);
    var range = 1 << 16 - 1;
    if (expon >= range) {
        expon |= ~(range - 1);
    }

    var sign = 1;
    if (expon < 0) {
        sign = -1;
        expon += range;
    }

    var himant = this.readIntB(data, offset + 2, 4);
    var lomant = this.readIntB(data, offset + 6, 4);
    var value;
    if (expon == himant == lomant == 0) {
        value = 0;
    }
    else if (expon == 0x7FFF) {
        value = Number.MAX_VALUE;
    }
    else {
        expon -= 16383;
        value = (himant * 0x100000000 + lomant) * Math.pow(2, expon - 63);
    }
    return sign * value;
};

function WAVDecoder(data) {
}

WAVDecoder.prototype.__proto__ = Decoder.prototype;

WAVDecoder.prototype.decode = function(data) {
    var decoded = {};
    var offset = 0;
    // Header
    var chunk = this.readChunkHeaderL(data, offset);
    offset += 8;
    if (chunk.name != 'RIFF') {
        console.error('File is not a WAV');
        return null;
    }

    var fileLength = chunk.length;
    fileLength += 8;

    var wave = this.readString(data, offset, 4);
    offset += 4;
    if (wave != 'WAVE') {
        console.error('File is not a WAV');
        return null;
    }

    while (offset < fileLength) {
        var chunk = this.readChunkHeaderL(data, offset);
        offset += 8;
        if (chunk.name == 'fmt ') {
            // File encoding
            var encoding = this.readIntL(data, offset, 2);
            offset += 2;

            if (encoding != 0x0001) {
                // Only support PCM
                console.error('Cannot decode non-PCM encoded WAV file');
                return null;
            }

            // Number of channels
            var numberOfChannels = this.readIntL(data, offset, 2);
            offset += 2;

            // Sample rate
            var sampleRate = this.readIntL(data, offset, 4);
            offset += 4;

            // Ignore bytes/sec - 4 bytes
            offset += 4;

            // Ignore block align - 2 bytes
            offset += 2;

            // Bit depth
            var bitDepth = this.readIntL(data, offset, 2);
            var bytesPerSample = bitDepth / 8;
            offset += 2;
        }

        else if (chunk.name == 'data') {
            // Data must come after fmt, so we are okay to use it's variables
            // here
            var length = chunk.length / (bytesPerSample * numberOfChannels);
            var channels = [];
            for (var i = 0; i < numberOfChannels; i++) {
                channels.push(new Float32Array(length));
            }

            for (var i = 0; i < numberOfChannels; i++) {
                var channel = channels[i];
                for (var j = 0; j < length; j++) {
                    var index = offset;
                    index += (j * numberOfChannels + i) * bytesPerSample;
                    // Sample
                    var value = this.readIntL(data, index, bytesPerSample);
                    // Scale range from 0 to 2**bitDepth -> -2**(bitDepth-1) to
                    // 2**(bitDepth-1)
                    var range = 1 << bitDepth - 1;
                    if (value >= range) {
                        value |= ~(range - 1);
                    }
                    // Scale range to -1 to 1
                    channel[j] = value / range;
                }
            }
            offset += chunk.length;
        }
        else {
            offset += chunk.length;
        }
    }
    decoded.sampleRate = sampleRate;
    decoded.bitDepth = bitDepth;
    decoded.channels = channels;
    decoded.length = length;
    return decoded;
};


function AIFFDecoder() {
}

AIFFDecoder.prototype.__proto__ = Decoder.prototype;

AIFFDecoder.prototype.decode = function(data) {
    var decoded = {};
    var offset = 0;
    // Header
    var chunk = this.readChunkHeaderB(data, offset);
    offset += 8;
    if (chunk.name != 'FORM') {
        console.error('File is not an AIFF');
        return null;
    }

    var fileLength = chunk.length;
    fileLength += 8;

    var aiff = this.readString(data, offset, 4);
    offset += 4;
    if (aiff != 'AIFF') {
        console.error('File is not an AIFF');
        return null;
    }

    while (offset < fileLength) {
        var chunk = this.readChunkHeaderB(data, offset);
        offset += 8;
        if (chunk.name == 'COMM') {
            // Number of channels
            var numberOfChannels = this.readIntB(data, offset, 2);
            offset += 2;

            // Number of samples
            var length = this.readIntB(data, offset, 4);
            offset += 4;

            var channels = [];
            for (var i = 0; i < numberOfChannels; i++) {
                channels.push(new Float32Array(length));
            }

            // Bit depth
            var bitDepth = this.readIntB(data, offset, 2);
            var bytesPerSample = bitDepth / 8;
            offset += 2;

            // Sample rate
            var sampleRate = this.readFloatB(data, offset);
            offset += 10;
        }
        else if (chunk.name == 'SSND') {
            // Data offset
            var dataOffset = this.readIntB(data, offset, 4);
            offset += 4;

            // Ignore block size
            offset += 4;

            // Skip over data offset
            offset += dataOffset;

            for (var i = 0; i < numberOfChannels; i++) {
                var channel = channels[i];
                for (var j = 0; j < length; j++) {
                    var index = offset;
                    index += (j * numberOfChannels + i) * bytesPerSample;
                    // Sample
                    var value = this.readIntB(data, index, bytesPerSample);
                    // Scale range from 0 to 2**bitDepth -> -2**(bitDepth-1) to
                    // 2**(bitDepth-1)
                    var range = 1 << bitDepth - 1;
                    if (value >= range) {
                        value |= ~(range - 1);
                    }
                    // Scale range to -1 to 1
                    channel[j] = value / range;
                }
            }
            offset += chunk.length - dataOffset - 8;
        }
        else {
            offset += chunk.length;
        }
    }
    decoded.sampleRate = sampleRate;
    decoded.bitDepth = bitDepth;
    decoded.channels = channels;
    decoded.length = length;
    return decoded;
};

/*
 * @depends ../audiofile/audiofile.js
 */

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
 *     Input => Scheduler => UpMixer => Output
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

    this.upMixer = new UpMixer(audiolet, this.device.numberOfChannels);

    this.inputs[0].connect(this.scheduler);
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
 * Process samples a from each channel. This function should not be called
 * manually by users, who should instead rely on automatic ticking from
 * connections to the AudioletDevice.
 */
AudioletNode.prototype.tick = function() {
    this.createInputSamples();
    this.createOutputSamples();

    this.generate();
};

/**
 * Traverse the audio graph, adding this and any parent nodes to the nodes
 * array.
 *
 * @param {AudioletNode[]} nodes Array to add nodes to.
 */
AudioletNode.prototype.traverse = function(nodes) {
    if (nodes.indexOf(this) == -1) {
        nodes.push(this);
        nodes = this.traverseParents(nodes);
    }
    return nodes;
};

/**
 * Call the traverse function on nodes which are connected to the inputs.
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
 * Process a sample for each channel, reading from the inputs and putting new
 * values into the outputs.  Override me!
 */
AudioletNode.prototype.generate = function() {
};

/**
 * Create the input samples by grabbing data from the outputs of connected
 * nodes and summing it.  If no nodes are connected to an input, then
 * give an empty array
 */
AudioletNode.prototype.createInputSamples = function() {
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
AudioletNode.prototype.createOutputSamples = function() {
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

    this.needTraverse = true;
    this.nodes = [];
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
        var input = this.inputs[0];

        var samplesNeeded = buffer.length / numberOfChannels;
        for (var i = 0; i < samplesNeeded; i++) {
            if (this.needTraverse) {
                this.nodes = this.traverse([]);
                this.needTraverse = false;
            }

            // Tick in reverse order up to, but not including this node
            for (var j = this.nodes.length - 1; j > 0; j--) {
                this.nodes[j].tick();
            }
            // Cut down tick to just sum the input samples
            this.createInputSamples();

            for (var j = 0; j < numberOfChannels; j++) {
                buffer[i * numberOfChannels + j] = input.samples[j];
            }

            this.writePosition += 1;
        }
    }
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
    this.samples = [];
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
    if (this.connectedFrom.length == 0) {
        this.samples = [];
    }
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
    this.samples = [];

    this.linkedInput = null;
    this.numberOfChannels = 1;
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
    if (this.linkedInput && this.linkedInput.connectedFrom.length) {
        return (this.linkedInput.samples.length);
    }
    return (this.numberOfChannels);
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
    return (this.input.samples.length == 0);
};

/**
 * Check whether the dynamic values should be used.
 *
 * @return {Boolean} True if the dynamic values should be used.
 */
AudioletParameter.prototype.isDynamic = function() {
    return (this.input.samples.length > 0);
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
    if (this.input != null && this.input.samples.length > 0) {
        return this.input.samples[0];
    }
    else {
        return this.value;
    }
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
 * Process samples
 */
ParameterNode.prototype.generate = function() {
    this.outputs[0].samples[0] = this.parameter.getValue();
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
 * Create output samples for each channel, copying any input samples to
 * the corresponding outputs.
 */
PassThroughNode.prototype.createOutputSamples = function() {
    var numberOfOutputs = this.outputs.length;
    // Copy the inputs buffers straight to the output buffers
    for (var i = 0; i < numberOfOutputs; i++) {
        var input = this.inputs[i];
        var output = this.outputs[i];
        if (input && input.samples.length != 0) {
            // Copy the input buffer straight to the output buffers
            output.samples = input.samples;
        }
        else {
            // Create the correct number of output samples
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
    }
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
 * @depends PassThroughNode.js
 */

/**
 * A sample-accurate scheduler built as an AudioletNode.  The scheduler works
 * by storing a queue of events, and running callback functions when the
 * correct sample is being processed.  All timing and events are handled in
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
 * @extends PassThroughNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [bpm=120] Initial tempo.
 */
var Scheduler = function(audiolet, bpm) {
    PassThroughNode.call(this, audiolet, 1, 1);
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
};
extend(Scheduler, PassThroughNode);

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
 * Overridden tick method.  Process any events which are due to take place
 * either now or previously.
 */
Scheduler.prototype.tick = function() {
    PassThroughNode.prototype.tick.call(this);
    this.tickClock();

    while (!this.queue.isEmpty() &&
           this.queue.peek().time <= this.time) {
        var event = this.queue.pop();
        this.processEvent(event);
    }
};

/**
 * Update the various representations of time within the scheduler.
 */
Scheduler.prototype.tickClock = function() {
    this.time += 1;
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

    this.levels = [];
    for (var i=0; i<levels.length; i++) {
        this.levels.push(new AudioletParameter(this, null, levels[i]));
    }

    this.times = [];
    for (var i=0; i<times.length; i++) {
        this.times.push(new AudioletParameter(this, null, times[i]));
    }

    this.releaseStage = releaseStage;
    this.onComplete = onComplete;

    this.stage = null;
    this.time = null;
    this.changeTime = null;

    this.level = this.levels[0].getValue();
    this.delta = 0;
    this.gateOn = false;
};
extend(Envelope, AudioletNode);

/**
 * Process samples
 */
Envelope.prototype.generate = function() {
    var gate = this.gate.getValue();

    var stageChanged = false;

    if (gate && !this.gateOn) {
        // Key pressed
        this.gateOn = true;
        this.stage = 0;
        this.time = 0;
        this.delta = 0;
        this.level = this.levels[0].getValue();
        if (this.stage != this.releaseStage) {
            stageChanged = true;
        }
    }

    if (this.gateOn && !gate) {
        // Key released
        this.gateOn = false;
        if (this.releaseStage != null) {
            // Jump to the release stage
            this.stage = this.releaseStage;
            stageChanged = true;
        }
    }

    if (this.changeTime) {
        // We are not sustaining, and we are playing, so increase the
        // time
        this.time += 1;
        if (this.time >= this.changeTime) {
            // Need to go to the next stage
            this.stage += 1;
            if (this.stage != this.releaseStage) {
                stageChanged = true;
            }
            else {
                // If we reach the release stage then sustain the value
                // until the gate is released rather than moving on
                // to the next level.
                this.changeTime = null;
                this.delta = 0;
            }
        }
    }

    if (stageChanged) {
//        level = this.levels[stage];
        if (this.stage != this.times.length) {
            // Actually update the variables
            this.delta = this.calculateDelta(this.stage, this.level);
            this.changeTime = this.calculateChangeTime(this.stage, this.time);
        }
        else {
            // Made it to the end, so finish up
            if (this.onComplete) {
                this.onComplete();
            }
            this.stage = null;
            this.time = null;
            this.changeTime = null;

            this.delta = 0;
        }
    }

    this.level += this.delta;
    this.outputs[0].samples[0] = this.level;
};

/**
 * Calculate the change in level needed each sample for a section
 *
 * @param {Number} stage The index of the current stage.
 * @param {Number} level The current level.
 * @return {Number} The change in level.
 */
Envelope.prototype.calculateDelta = function(stage, level) {
    var delta = this.levels[stage + 1].getValue() - level;
    var stageTime = this.times[stage].getValue() *
                    this.audiolet.device.sampleRate;
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
    var stageTime = this.times[stage].getValue() *
                    this.audiolet.device.sampleRate;
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

    this.attack = this.times[0];
    this.decay = this.times[1];
    this.sustain = this.levels[2];
    this.release = this.levels[2];
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
 * Process samples
 */
BiquadFilter.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0]
    var xValueArray = this.xValues;
    var yValueArray = this.yValues;

    var frequency = this.frequency.getValue();

    if (frequency != this.lastFrequency) {
        // Recalculate the coefficients
        this.calculateCoefficients(frequency);
        this.lastFrequency = frequency;
    }

    var a0 = this.a0;
    var a1 = this.a1;
    var a2 = this.a2;
    var b0 = this.b0;
    var b1 = this.b1;
    var b2 = this.b2;

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= xValueArray.length) {
            xValueArray.push([0, 0]);
            yValueArray.push([0, 0]);
        }

        var xValues = xValueArray[i];
        var x1 = xValues[0];
        var x2 = xValues[1];
        var yValues = yValueArray[i];
        var y1 = yValues[0];
        var y2 = yValues[1];

        var x0 = input.samples[i];
        var y0 = (b0 / a0) * x0 +
                 (b1 / a0) * x1 +
                 (b2 / a0) * x2 -
                 (a1 / a0) * y1 -
                 (a2 / a0) * y2;

        output.samples[i] = y0;

        xValues[0] = x0;
        xValues[1] = x1;
        yValues[0] = y0;
        yValues[1] = y1;
    }
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

    this.attack = new AudioletParameter(this, 1, attack || 0.01);
    this.release = new AudioletParameter(this, 2, release || 0.01);
};
extend(Amplitude, AudioletNode);

/**
 * Process samples
 */
Amplitude.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var followers = this.followers;
    var numberOfFollowers = followers.length;

    var sampleRate = this.audiolet.device.sampleRate;

    // Local processing variables
    var attack = this.attack.getValue();
    attack = Math.pow(0.01, 1 / (attack * sampleRate));
    var release = this.release.getValue();
    release = Math.pow(0.01, 1 / (release * sampleRate));

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= numberOfFollowers) {
            followers.push(0);
        }
        var follower = followers[i];

        var value = Math.abs(input.samples[i]);
        if (value > follower) {
            follower = attack * (follower - value) + value;
        }
        else {
            follower = release * (follower - value) + value;
        }
        output.samples[i] = follower;
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
BadValueDetector.prototype.callback = function(value, channel) {
    console.error(value + ' detected at channel ' + channel);
};

/**
 * Process samples
 */
BadValueDetector.prototype.generate = function() {
    var input = this.inputs[0];

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        var value = input.samples[i];
        if (typeof value == 'undefined' ||
            value == null ||
            isNaN(value) ||
            value == Infinity ||
            value == -Infinity) {
            this.callback(value, i);
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
 * Process samples
 */
BitCrusher.prototype.generate = function() {
    var input = this.inputs[0];

    var maxValue = Math.pow(2, this.bits.getValue()) - 1;

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        this.outputs[0].samples[i] = Math.floor(input.samples[i] * maxValue) /
                                     maxValue;
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
 * Process samples
 */
BufferPlayer.prototype.generate = function() {
    var output = this.outputs[0];

    // Cache local variables
    var numberOfChannels = output.samples.length;

    if (this.buffer.length == 0 || !this.playing) {
        // No buffer data, or not playing, so output zeros and return
        for (var i=0; i<numberOfChannels; i++) {
            output.samples[i] = 0;
        }
        return;
    }

    // Crap load of parameters
    var playbackRate = this.playbackRate.getValue();
    var restartTrigger = this.restartTrigger.getValue();
    var startPosition = this.startPosition.getValue();
    var loop = this.loop.getValue();

    if (restartTrigger > 0 && !this.restartTriggerOn) {
        // Trigger moved from <=0 to >0, so we restart playback from
        // startPosition
        this.position = startPosition;
        this.restartTriggerOn = true;
        this.playing = true;
    }

    if (restartTrigger <= 0 && this.restartTriggerOn) {
        // Trigger moved back to <= 0
        this.restartTriggerOn = false;
    }

    var numberOfChannels = this.buffer.channels.length;

    for (var i = 0; i < numberOfChannels; i++) {
        var inputChannel = this.buffer.getChannelData(i);
        output.samples[i] = inputChannel[Math.floor(this.position)];
    }

    this.position += playbackRate;

    if (this.position >= this.buffer.length) {
        if (loop) {
            // Back to the start
            this.position %= this.buffer.length;
        }
        else {
            // Finish playing until a new restart trigger
            this.playing = false;
            if (this.onComplete) {
               this.onComplete();
            }
        }
    }
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
    this.buffers = [];
    this.readWriteIndex = 0;
};
extend(CombFilter, AudioletNode);

/**
 * Process samples
 */
CombFilter.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.audiolet.device.sampleRate;

    var delayTime = this.delayTime.getValue() * sampleRate;
    var decayTime = this.decayTime.getValue() * sampleRate;
    var feedback = Math.exp(-3 * delayTime / decayTime);

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= this.buffers.length) {
            // Create buffer for channel if it doesn't already exist
            var bufferSize = this.maximumDelayTime * sampleRate;
            this.buffers.push(new Float32Array(bufferSize));
        }

        var buffer = this.buffers[i];
        var outputValue = buffer[this.readWriteIndex];
        output.samples[i] = outputValue;
        buffer[this.readWriteIndex] = input.samples[i] + feedback * outputValue;
    }

    this.readWriteIndex += 1;
    if (this.readWriteIndex >= delayTime) {
        this.readWriteIndex = 0;
    }
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
 * Sine wave oscillator
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
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Sine = function(audiolet, frequency) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.phase = 0;
};
extend(Sine, AudioletNode);

/**
 * Process samples
 */
Sine.prototype.generate = function() {
    var output = this.outputs[0];

    var frequency = this.frequency.getValue();
    var sampleRate = this.audiolet.device.sampleRate;

    output.samples[0] = Math.sin(this.phase);

    this.phase += 2 * Math.PI * frequency / sampleRate;
    if (this.phase > 2 * Math.PI) {
        this.phase %= 2 * Math.PI;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Sine.prototype.toString = function() {
    return 'Sine';
};


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
 * Process samples
 */
CrossFade.prototype.generate = function() {
    var inputA = this.inputs[0];
    var inputB = this.inputs[1];
    var output = this.outputs[0];

    // Local processing variables
    var position = this.position.getValue();

    var scaledPosition = position * Math.PI / 2;
    var gainA = Math.cos(scaledPosition);
    var gainB = Math.sin(scaledPosition);

    var numberOfChannels = output.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        var valueA = inputA.samples[i] || 0;
        var valueB = inputB.samples[i] || 0;
        output.samples[i] = valueA * gainA + valueB * gainB;
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
    this.filterStores = [];
};
extend(DampedCombFilter, AudioletNode);

/**
 * Process samples
 */
DampedCombFilter.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.audiolet.device.sampleRate;

    var delayTime = this.delayTime.getValue() * sampleRate;
    var decayTime = this.decayTime.getValue() * sampleRate;
    var damping = this.damping.getValue();
    var feedback = Math.exp(-3 * delayTime / decayTime);

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= this.buffers.length) {
            var bufferSize = this.maximumDelayTime * sampleRate;
            this.buffers.push(new Float32Array(bufferSize));
        }

        if (i >= this.filterStores.length) {
            this.filterStores.push(0);
        }

        var buffer = this.buffers[i];
        var filterStore = this.filterStores[i];

        var outputValue = buffer[this.readWriteIndex];
        filterStore = (outputValue * (1 - damping)) +
                      (filterStore * damping);
        output.samples[i] = outputValue;
        buffer[this.readWriteIndex] = input.samples[i] +
                                      feedback * filterStore;

        this.filterStores[i] = filterStore;
    }

    this.readWriteIndex += 1;
    if (this.readWriteIndex >= delayTime) {
        this.readWriteIndex = 0;
    }
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
 * Process samples
 */
DCFilter.prototype.generate = function() {
    var coefficient = this.coefficient.getValue();
    var input = this.inputs[0];
    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= this.xValues.length) {
            this.xValues.push(0);
        }
        if (i >= this.yValues.length) {
            this.yValues.push(0);
        }

        var x0 = input.samples[i];
        var y0 = x0 - this.xValues[i] + coefficient * this.yValues[i];

        this.outputs[0].samples[i] = y0;

        this.xValues[i] = x0;
        this.yValues[i] = y0;
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
 * Process samples
 */
Delay.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.audiolet.device.sampleRate;

    var delayTime = this.delayTime.getValue() * sampleRate;

    var numberOfChannels = input.samples.length;

    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= this.buffers.length) {
            var bufferSize = this.maximumDelayTime * sampleRate;
            this.buffers.push(new Float32Array(bufferSize));
        }

        var buffer = this.buffers[i];
        output.samples[i] = buffer[this.readWriteIndex];
        buffer[this.readWriteIndex] = input.samples[i];
    }

    this.readWriteIndex += 1;
    if (this.readWriteIndex >= delayTime) {
        this.readWriteIndex = 0;
    }
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
DiscontinuityDetector.prototype.callback = function(size, channel) {
    console.error('Discontinuity of ' + size + ' detected on channel ' +
                  channel);
};

/**
 * Process samples
 */
DiscontinuityDetector.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= this.lastValues.length) {
            this.lastValues.push(0);
        }

        var value = input.samples[i];
        var diff = Math.abs(this.lastValues[i] - value);
        if (diff > this.threshold) {
            this.callback(diff, i);
        }

        this.lastValues[i] = value;
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
 * Process samples
 */
FeedbackDelay.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.audiolet.output.device.sampleRate;

    var delayTime = this.delayTime.getValue() * sampleRate;
    var feedback = this.feedback.getValue();
    var mix = this.mix.getValue();

    var numberOfChannels = input.samples.length;
    var numberOfBuffers = this.buffers.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= numberOfBuffers) {
            // Create buffer for channel if it doesn't already exist
            var bufferSize = this.maximumDelayTime * sampleRate;
            this.buffers.push(new Float32Array(bufferSize));
        }

        var buffer = this.buffers[i];

        var inputSample = input.samples[i];
        var bufferSample = buffer[this.readWriteIndex];

        output.samples[i] = mix * bufferSample + (1 - mix) * inputSample;
        buffer[this.readWriteIndex] = inputSample + feedback * bufferSample;
    }

    this.readWriteIndex += 1;
    if (this.readWriteIndex >= delayTime) {
        this.readWriteIndex = 0;
    }
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
 * Fast Fourier Transform
 *
 * **Inputs**
 *
 * - Audio
 * - Delay Time
 *
 * **Outputs**
 *
 * - Fourier transformed audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} bufferSize The FFT buffer size.
 */
var FFT = function(audiolet, bufferSize) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.bufferSize = bufferSize;
    this.readWriteIndex = 0;

    this.buffer = new Float32Array(this.bufferSize);

    this.realBuffer = new Float32Array(this.bufferSize);
    this.imaginaryBuffer = new Float32Array(this.bufferSize);

    this.reverseTable = new Uint32Array(this.bufferSize);
    this.calculateReverseTable();
};
extend(FFT, AudioletNode);

/**
 * Process samples
 */
FFT.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    if (input.samples.length == 0) {
        return;
    }

    this.buffer[this.readWriteIndex] = input.samples[0];
    output.samples[0] = [this.realBuffer[this.readWriteIndex],
                         this.imaginaryBuffer[this.readWriteIndex]];

    this.readWriteIndex += 1;
    if (this.readWriteIndex >= this.bufferSize) {
        this.transform();
        this.readWriteIndex = 0;
    }
};

/**
 * Precalculate the reverse table.
 * TODO: Split the function out so it can be reused in FFT and IFFT
 */
FFT.prototype.calculateReverseTable = function() {
    var limit = 1;
    var bit = this.bufferSize >> 1;

    while (limit < this.bufferSize) {
        for (var i = 0; i < limit; i++) {
            this.reverseTable[i + limit] = this.reverseTable[i] + bit;
        }

        limit = limit << 1;
        bit = bit >> 1;
    }
};


/**
 * Calculate the FFT for the saved buffer
 */
FFT.prototype.transform = function() {
    for (var i = 0; i < this.bufferSize; i++) {
        this.realBuffer[i] = this.buffer[this.reverseTable[i]];
        this.imaginaryBuffer[i] = 0;
    }

    var halfSize = 1;

    while (halfSize < this.bufferSize) {
        var phaseShiftStepReal = Math.cos(-Math.PI / halfSize);
        var phaseShiftStepImag = Math.sin(-Math.PI / halfSize);

        var currentPhaseShiftReal = 1;
        var currentPhaseShiftImag = 0;

        for (var fftStep = 0; fftStep < halfSize; fftStep++) {
            var i = fftStep;

            while (i < this.bufferSize) {
                var off = i + halfSize;
                var tr = (currentPhaseShiftReal * this.realBuffer[off]) -
                         (currentPhaseShiftImag * this.imaginaryBuffer[off]);
                var ti = (currentPhaseShiftReal * this.imaginaryBuffer[off]) +
                         (currentPhaseShiftImag * this.realBuffer[off]);

                this.realBuffer[off] = this.realBuffer[i] - tr;
                this.imaginaryBuffer[off] = this.imaginaryBuffer[i] - ti;
                this.realBuffer[i] += tr;
                this.imaginaryBuffer[i] += ti;

                i += halfSize << 1;
            }

            var tmpReal = currentPhaseShiftReal;
            currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) -
                                    (currentPhaseShiftImag *
                                     phaseShiftStepImag);
            currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) +
                                    (currentPhaseShiftImag *
                                     phaseShiftStepReal);
        }

        halfSize = halfSize << 1;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
FFT.prototype.toString = function() {
    return 'FFT';
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
 * Process samples
 */
Multiply.prototype.generate = function() {
    var value = this.value.getValue();
    var input = this.inputs[0];
    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        this.outputs[0].samples[i] = input.samples[i] * value;
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
 * @depends ../operators/Multiply.js
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
    // Same DSP as operators/Multiply.js, but different parameter name
    Multiply.call(this, audiolet, gain);
    this.gain = this.value;
};
extend(Gain, Multiply);

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
 * Inverse Fast Fourier Transform.  Code liberally stolen with kind permission
 * of Corben Brook from DSP.js (https://github.com/corbanbrook/dsp.js).
 *
 * **Inputs**
 *
 * - Fourier transformed audio
 * - Delay Time
 *
 * **Outputs**
 *
 * - Audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} bufferSize The FFT buffer size.
 */
var IFFT = function(audiolet, bufferSize) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.bufferSize = bufferSize;
    this.readWriteIndex = 0;

    this.buffer = new Float32Array(this.bufferSize);

    this.realBuffer = new Float32Array(this.bufferSize);
    this.imaginaryBuffer = new Float32Array(this.bufferSize);

    this.reverseTable = new Uint32Array(this.bufferSize);
    this.calculateReverseTable();

    this.reverseReal = new Float32Array(this.bufferSize);
    this.reverseImaginary = new Float32Array(this.bufferSize);
};
extend(IFFT, AudioletNode);

/**
 * Process samples
 */
IFFT.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    if (!input.samples.length) {
        return;
    }

    var values = input.samples[0];
    this.realBuffer[this.readWriteIndex] = values[0];
    this.imaginaryBuffer[this.readWriteIndex] = values[1];
    output.samples[0] = this.buffer[this.readWriteIndex];

    this.readWriteIndex += 1;
    if (this.readWriteIndex >= this.bufferSize) {
        this.transform();
        this.readWriteIndex = 0;
    }
};

/**
 * Precalculate the reverse table.
 * TODO: Split the function out so it can be reused in FFT and IFFT
 */
IFFT.prototype.calculateReverseTable = function() {
    var limit = 1;
    var bit = this.bufferSize >> 1;

    while (limit < this.bufferSize) {
        for (var i = 0; i < limit; i++) {
            this.reverseTable[i + limit] = this.reverseTable[i] + bit;
        }

        limit = limit << 1;
        bit = bit >> 1;
    }
};

/**
 * Calculate the inverse FFT for the saved real and imaginary buffers
 */
IFFT.prototype.transform = function() {
    var halfSize = 1;

    for (var i = 0; i < this.bufferSize; i++) {
        this.imaginaryBuffer[i] *= -1;
    }

    for (var i = 0; i < this.bufferSize; i++) {
        this.reverseReal[i] = this.realBuffer[this.reverseTable[i]];
        this.reverseImaginary[i] = this.imaginaryBuffer[this.reverseTable[i]];
    }

    this.realBuffer.set(this.reverseReal);
    this.imaginaryBuffer.set(this.reverseImaginary);


    while (halfSize < this.bufferSize) {
        var phaseShiftStepReal = Math.cos(-Math.PI / halfSize);
        var phaseShiftStepImag = Math.sin(-Math.PI / halfSize);
        var currentPhaseShiftReal = 1;
        var currentPhaseShiftImag = 0;

        for (var fftStep = 0; fftStep < halfSize; fftStep++) {
            i = fftStep;

            while (i < this.bufferSize) {
                var off = i + halfSize;
                var tr = (currentPhaseShiftReal * this.realBuffer[off]) -
                         (currentPhaseShiftImag * this.imaginaryBuffer[off]);
                var ti = (currentPhaseShiftReal * this.imaginaryBuffer[off]) +
                         (currentPhaseShiftImag * this.realBuffer[off]);

                this.realBuffer[off] = this.realBuffer[i] - tr;
                this.imaginaryBuffer[off] = this.imaginaryBuffer[i] - ti;
                this.realBuffer[i] += tr;
                this.imaginaryBuffer[i] += ti;

                i += halfSize << 1;
            }

            var tmpReal = currentPhaseShiftReal;
            currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) -
                                    (currentPhaseShiftImag *
                                     phaseShiftStepImag);
            currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) +
                                    (currentPhaseShiftImag *
                                     phaseShiftStepReal);
        }

        halfSize = halfSize << 1;
    }

    for (i = 0; i < this.bufferSize; i++) {
        this.buffer[i] = this.realBuffer[i] / this.bufferSize;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
IFFT.prototype.toString = function() {
    return 'IFFT';
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
    this.lastValue = 0;

    this.log001 = Math.log(0.001);
};
extend(Lag, AudioletNode);

/**
 * Process samples
 */
Lag.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.audiolet.device.sampleRate;

    var value = this.value.getValue();
    var lag = this.lag.getValue();
    var coefficient = Math.exp(this.log001 / (lag * sampleRate));

    var outputValue = ((1 - coefficient) * value) +
                      (coefficient * this.lastValue);
    output.samples[0] = outputValue;
    this.lastValue = outputValue;
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
    AudioletNode.call(this, audiolet, 4, 1);
    this.linkNumberOfOutputChannels(0, 0);

    // Parameters
    this.threshold = new AudioletParameter(this, 1, threshold || 0.95);
    this.attack = new AudioletParameter(this, 2, attack || 0.01);
    this.release = new AudioletParameter(this, 2, release || 0.4);

    this.followers = [];
};
extend(Limiter, AudioletNode);

/**
 * Process samples
 */
Limiter.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var sampleRate = this.audiolet.device.sampleRate;

    // Local processing variables
    var attack = Math.pow(0.01, 1 / (this.attack.getValue() *
                                     sampleRate));
    var release = Math.pow(0.01, 1 / (this.release.getValue() *
                                      sampleRate));

    var threshold = this.threshold.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        if (i >= this.followers.length) {
            this.followers.push(0);
        }

        var follower = this.followers[i];

        var value = input.samples[i];

        // Calculate amplitude envelope
        var absValue = Math.abs(value);
        if (absValue > follower) {
            follower = attack * (follower - absValue) + absValue;
        }
        else {
            follower = release * (follower - absValue) + absValue;
        }

        var diff = follower - threshold;
        if (diff > 0) {
            output.samples[i] = value / (1 + diff);
        }
        else {
            output.samples[i] = value;
        }

        this.followers[i] = follower;
    }
};


/**
 * toString
 *
 * @return {String} String representation.
 */
Limiter.prototype.toString = function() {
    return 'Limiter';
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
 * Process samples
 */
LinearCrossFade.prototype.generate = function() {
    var inputA = this.inputs[0];
    var inputB = this.inputs[1];
    var output = this.outputs[0];

    var position = this.position.getValue();

    var gainA = 1 - position;
    var gainB = position;

    var numberOfChannels = output.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        var valueA = inputA.samples[i] || 0;
        var valueB = inputB.samples[i] || 0;
        output.samples[i] = valueA * gainA + valueB * gainB;
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
 * Process samples
 */
Pan.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var pan = this.pan.getValue();

    var value = input.samples[0] || 0;
    var scaledPan = pan * Math.PI / 2;
    output.samples[0] = value * Math.cos(scaledPan);
    output.samples[1] = value * Math.sin(scaledPan);
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

    this.attack = this.times[0];
    this.release = this.times[1];
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
 * Process samples
 */
Pulse.prototype.generate = function() {
    var pulseWidth = this.pulseWidth.getValue();
    this.outputs[0].samples[0] = (this.phase < pulseWidth) ? 1 : -1;

    var frequency = this.frequency.getValue();
    var sampleRate = this.audiolet.device.sampleRate;
    this.phase += frequency / sampleRate;
    if (this.phase > 1) {
        this.phase %= 1;
    }
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
 * Process samples
 */
Reverb.prototype.generate = function() {
    var mix = this.mix.getValue();
    var roomSize = this.roomSize.getValue();
    var damping = this.damping.getValue();

    var numberOfCombs = this.combTuning.length;
    var numberOfFilters = this.allPassTuning.length;

    var value = this.inputs[0].samples[0] || 0;
    var dryValue = value;

    value *= this.fixedGain;
    var gainedValue = value;

    var damping = damping * this.scaleDamping;
    var feedback = roomSize * this.scaleRoom + this.offsetRoom;

    for (var i = 0; i < numberOfCombs; i++) {
        var combIndex = this.combIndices[i];
        var combBuffer = this.combBuffers[i];
        var filterStore = this.filterStores[i];

        var output = combBuffer[combIndex];
        filterStore = (output * (1 - damping)) +
                      (filterStore * damping);
        value += output;
        combBuffer[combIndex] = gainedValue + feedback * filterStore;

        combIndex += 1;
        if (combIndex >= combBuffer.length) {
            combIndex = 0;
        }

        this.combIndices[i] = combIndex;
        this.filterStores[i] = filterStore;
    }

    for (var i = 0; i < numberOfFilters; i++) {
        var allPassBuffer = this.allPassBuffers[i];
        var allPassIndex = this.allPassIndices[i];

        var input = value;
        var bufferValue = allPassBuffer[allPassIndex];
        value = -value + bufferValue;
        allPassBuffer[allPassIndex] = input + (bufferValue * 0.5);

        allPassIndex += 1;
        if (allPassIndex >= allPassBuffer.length) {
            allPassIndex = 0;
        }

        this.allPassIndices[i] = allPassIndex;
    }

    this.outputs[0].samples[0] = mix * value + (1 - mix) * dryValue;
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
 * @depends ../core/AudioletNode.js
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
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Saw = function(audiolet, frequency) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.phase = 0;
};
extend(Saw, AudioletNode);

/**
 * Process samples
 */
Saw.prototype.generate = function() {
    var output = this.outputs[0];
    var frequency = this.frequency.getValue();
    var sampleRate = this.audiolet.device.sampleRate;

    output.samples[0] = ((this.phase / 2 + 0.25) % 0.5 - 0.25) * 4;
    this.phase += frequency / sampleRate;

    if (this.phase > 1) {
        this.phase %= 1;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Saw.prototype.toString = function() {
    return 'Saw';
};


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
 * Process samples
 */
SoftClip.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        var value = input.samples[i];
        if (value > 0.5 || value < -0.5) {
            output.samples[i] = (Math.abs(value) - 0.25) / value;
        }
        else {
            output.samples[i] = value;
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
 * @depends ../core/AudioletNode.js
 */

/**
 * Square wave oscillator
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
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Square = function(audiolet, frequency) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.phase = 0;
};
extend(Square, AudioletNode);

/**
 * Process samples
 */
Square.prototype.generate = function() {
    var output = this.outputs[0];

    var frequency = this.frequency.getValue();
    var sampleRate = this.audiolet.device.sampleRate;

    output.samples[0] = this.phase > 0.5 ? 1 : -1;

    this.phase += frequency / sampleRate;
    if (this.phase > 1) {
        this.phase %= 1;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Square.prototype.toString = function() {
    return 'Square';
};


/*!
 * @depends ../core/AudioletNode.js
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
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [frequency=440] Initial frequency.
 */
var Triangle = function(audiolet, frequency) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.frequency = new AudioletParameter(this, 0, frequency || 440);
    this.phase = 0;
};
extend(Triangle, AudioletNode);

/**
 * Process samples
 */
Triangle.prototype.generate = function() {
    var output = this.outputs[0];

    var frequency = this.frequency.getValue();
    var sampleRate = this.audiolet.device.sampleRate;

    output.samples[0] = 1 - 4 * Math.abs((this.phase + 0.25) % 1 - 0.5);

    this.phase += frequency / sampleRate;
    if (this.phase > 1) {
        this.phase %= 1;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Triangle.prototype.toString = function() {
    return 'Triangle';
};


/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Simple trigger which allows you to set a single sample to be 1 and then
 * resets itself.
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
 * Process samples
 */
TriggerControl.prototype.generate = function() {
    if (this.trigger.getValue() > 0) {
        this.outputs[0].samples[0] = 1;
        this.trigger.setValue(0);
    }
    else {
        this.outputs[0].samples[0] = 0;
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
    this.outputs[0].numberOfChannels = outputChannels;
};
extend(UpMixer, AudioletNode);

/**
 * Process samples
 */
UpMixer.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var numberOfInputChannels = input.samples.length;
    var numberOfOutputChannels = output.samples.length;

    if (numberOfInputChannels == numberOfOutputChannels) {
        output.samples = input.samples;
    }
    else {
        for (var i = 0; i < numberOfOutputChannels; i++) {
            output.samples[i] = input.samples[i % numberOfInputChannels];
        }
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


var WebKitBufferPlayer = function(audiolet, onComplete) {
    AudioletNode.call(this, audiolet, 0, 1);
    this.onComplete = onComplete;
    this.isWebKit = this.audiolet.device.sink instanceof Sink.sinks.webkit;
    this.ready = false;

    // Until we are loaded, output no channels.
    this.setNumberOfOutputChannels(0, 0);

    if (!this.isWebKit) {
        return;
    }

    this.context = this.audiolet.device.sink._context;
    this.jsNode = null;
    this.source = null;

    this.ready = false;
    this.loaded = false;

    this.buffers = [];
    this.readPosition = 0;

    this.endTime = null;
};
extend(WebKitBufferPlayer, AudioletNode);

WebKitBufferPlayer.prototype.load = function(url, onLoad, onError) {
    if (!this.isWebKit) {
        return;
    }

    this.stop();

    // Request the new file
    this.xhr = new XMLHttpRequest();
    this.xhr.open("GET", url, true);
    this.xhr.responseType = "arraybuffer";
    this.xhr.onload = this.onLoad.bind(this, onLoad, onError);
    this.xhr.onerror = onError;
    this.xhr.send();
};

WebKitBufferPlayer.prototype.stop = function() {
    this.ready = false;
    this.loaded = false;

    this.buffers = [];
    this.readPosition = 0;
    this.endTime = null;

    this.setNumberOfOutputChannels(0);

    this.disconnectWebKitNodes();
};

WebKitBufferPlayer.prototype.disconnectWebKitNodes = function() {
    if (this.source && this.jsNode) {
        this.source.disconnect(this.jsNode);
        this.jsNode.disconnect(this.context.destination);
        this.source = null;
        this.jsNode = null;
    }
};

WebKitBufferPlayer.prototype.onLoad = function(onLoad, onError) {
    // Load the buffer into memory for decoding
//    this.fileBuffer = this.context.createBuffer(this.xhr.response, false);
    this.context.decodeAudioData(this.xhr.response, function(buffer) {
        this.onDecode(buffer);
        onLoad();
    }.bind(this), onError);
};

WebKitBufferPlayer.prototype.onDecode = function(buffer) {
    this.fileBuffer = buffer;

    // Create the WebKit buffer source for playback
    this.source = this.context.createBufferSource();
    this.source.buffer = this.fileBuffer;

    // Make sure we are outputting the right number of channels on Audiolet's
    // side
    var numberOfChannels = this.fileBuffer.numberOfChannels;
    this.setNumberOfOutputChannels(0, numberOfChannels);

    // Create the JavaScript node for reading the data into Audiolet
    this.jsNode = this.context.createJavaScriptNode(4096, numberOfChannels, 0);
    this.jsNode.onaudioprocess = this.onData.bind(this);

    // Connect it all up
    this.source.connect(this.jsNode);
    this.jsNode.connect(this.context.destination);
    this.source.noteOn(0);
    this.endTime = this.context.currentTime + this.fileBuffer.duration;

    this.loaded = true;
};

WebKitBufferPlayer.prototype.onData = function(event) {
    if (this.loaded) {
        this.ready = true;
    }

    var numberOfChannels = event.inputBuffer.numberOfChannels;

    for (var i=0; i<numberOfChannels; i++) {
        this.buffers[i] = event.inputBuffer.getChannelData(i);
        this.readPosition = 0;
    }
};

WebKitBufferPlayer.prototype.generate = function() {
    if (!this.ready) {
        return;
    }

    var output = this.outputs[0];

    var numberOfChannels = output.samples.length;
    for (var i=0; i<numberOfChannels; i++) {
        output.samples[i] = this.buffers[i][this.readPosition];
    }
    this.readPosition += 1;

    if (this.context.currentTime > this.endTime) {
        this.stop();
        this.onComplete();
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
 * Process samples
 */
WhiteNoise.prototype.generate = function() {
    this.outputs[0].samples[0] = Math.random() * 2 - 1;
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
 * Process samples
 */
Add.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var value = this.value.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] + value;
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
 * Process samples
 */
Divide.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var value = this.value.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] / value;
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
 * Process samples
 */
Modulo.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var value = this.value.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] % value;
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
 * Process samples
 */
MulAdd.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var mul = this.mul.getValue();
    var add = this.add.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] * mul + add;
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
 * Process samples
 */
Reciprocal.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = 1 / input.samples[i];
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
 * Process samples
 */
Subtract.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var value = this.value.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] - value;
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
 * Process samples
 */
Tanh.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        var value = input.samples[i];
        output.samples[i] = (Math.exp(value) - Math.exp(-value)) /
                            (Math.exp(value) + Math.exp(-value));
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
            returnValue = low + Math.random() * (high - low);
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

var Sink = this.Sink = function (global) {

/**
 * Creates a Sink according to specified parameters, if possible.
 *
 * @class
 *
 * @arg =!readFn
 * @arg =!channelCount
 * @arg =!bufferSize
 * @arg =!sampleRate
 *
 * @param {Function} readFn A callback to handle the buffer fills.
 * @param {Number} channelCount Channel count.
 * @param {Number} bufferSize (Optional) Specifies a pre-buffer size to control the amount of latency.
 * @param {Number} sampleRate Sample rate (ms).
 * @param {Number} default=0 writePosition Write position of the sink, as in how many samples have been written per channel.
 * @param {String} default=async writeMode The default mode of writing to the sink.
 * @param {String} default=interleaved channelMode The mode in which the sink asks the sample buffers to be channeled in.
 * @param {Number} default=0 previousHit The previous time of a callback.
 * @param {Buffer} default=null ringBuffer The ring buffer array of the sink. If null, ring buffering will not be applied.
 * @param {Number} default=0 ringOffset The current position of the ring buffer.
*/
function Sink (readFn, channelCount, bufferSize, sampleRate) {
	var	sinks	= Sink.sinks.list,
		i;
	for (i=0; i<sinks.length; i++) {
		if (sinks[i].enabled) {
			try {
				return new sinks[i](readFn, channelCount, bufferSize, sampleRate);
			} catch(e1){}
		}
	}

	throw Sink.Error(0x02);
}

function SinkClass () {
}

Sink.SinkClass = SinkClass;

SinkClass.prototype = Sink.prototype = {
	sampleRate: 44100,
	channelCount: 2,
	bufferSize: 4096,

	writePosition: 0,
	previousHit: 0,
	ringOffset: 0,

	channelMode: 'interleaved',
	isReady: false,

/**
 * Does the initialization of the sink.
 * @method Sink
*/
	start: function (readFn, channelCount, bufferSize, sampleRate) {
		this.channelCount	= isNaN(channelCount) || channelCount === null ? this.channelCount: channelCount;
		this.bufferSize		= isNaN(bufferSize) || bufferSize === null ? this.bufferSize : bufferSize;
		this.sampleRate		= isNaN(sampleRate) || sampleRate === null ? this.sampleRate : sampleRate;
		this.readFn		= readFn;
		this.activeRecordings	= [];
		this.previousHit	= +new Date();
		Sink.EventEmitter.call(this);
		Sink.emit('init', [this].concat([].slice.call(arguments)));
	},
/**
 * The method which will handle all the different types of processing applied on a callback.
 * @method Sink
*/
	process: function (soundData, channelCount) {
		this.emit('preprocess', arguments);

		if (this.ringBuffer) {
			(this.channelMode === 'interleaved' ? this.ringSpin : this.ringSpinInterleaved).apply(this, arguments);
		}

		if (this.channelMode === 'interleaved') {
			this.emit('audioprocess', arguments);

			if (this.readFn) {
				this.readFn.apply(this, arguments);
			}
		} else {
			var	soundDataSplit	= Sink.deinterleave(soundData, this.channelCount),
				args		= [soundDataSplit].concat([].slice.call(arguments, 1));
			this.emit('audioprocess', args);

			if (this.readFn) {
				this.readFn.apply(this, args);
			}

			Sink.interleave(soundDataSplit, this.channelCount, soundData);
		}
		this.emit('postprocess', arguments);
		this.previousHit = +new Date();
		this.writePosition += soundData.length / channelCount;
	},
/**
 * Get the current output position, defaults to writePosition - bufferSize.
 *
 * @method Sink
 *
 * @return {Number} The position of the write head, in samples, per channel.
*/
	getPlaybackTime: function () {
		return this.writePosition - this.bufferSize;
	},
/**
 * Internal method to send the ready signal if not ready yet.
 * @method Sink
*/
	ready: function () {
		if (this.isReady) return;

		this.isReady = true;
		this.emit('ready', []);
	}
};

/**
 * The container for all the available sinks. Also a decorator function for creating a new Sink class and binding it.
 *
 * @method Sink
 * @static
 *
 * @arg {String} type The name / type of the Sink.
 * @arg {Function} constructor The constructor function for the Sink.
 * @arg {Object} prototype The prototype of the Sink. (optional)
 * @arg {Boolean} disabled Whether the Sink should be disabled at first.
*/

function sinks (type, constructor, prototype, disabled, priority) {
	prototype = prototype || constructor.prototype;
	constructor.prototype = new Sink.SinkClass();
	constructor.prototype.type = type;
	constructor.enabled = !disabled;

	var k;
	for (k in prototype) {
		if (prototype.hasOwnProperty(k)) {
			constructor.prototype[k] = prototype[k];
		}
	}

	sinks[type] = constructor;
	sinks.list[priority ? 'unshift' : 'push'](constructor);
}

Sink.sinks = Sink.devices = sinks;
Sink.sinks.list = [];

Sink.singleton = function () {
	var sink = Sink.apply(null, arguments);

	Sink.singleton = function () {
		return sink;
	};

	return sink;
};

global.Sink = Sink;

return Sink;

}(function (){ return this; }());
void function (Sink) {

/**
 * A light event emitter.
 *
 * @class
 * @static Sink
*/
function EventEmitter () {
	var k;
	for (k in EventEmitter.prototype) {
		if (EventEmitter.prototype.hasOwnProperty(k)) {
			this[k] = EventEmitter.prototype[k];
		}
	}
	this._listeners = {};
}

EventEmitter.prototype = {
	_listeners: null,
/**
 * Emits an event.
 *
 * @method EventEmitter
 *
 * @arg {String} name The name of the event to emit.
 * @arg {Array} args The arguments to pass to the event handlers.
*/
	emit: function (name, args) {
		if (this._listeners[name]) {
			for (var i=0; i<this._listeners[name].length; i++) {
				this._listeners[name][i].apply(this, args);
			}
		}
		return this;
	},
/**
 * Adds an event listener to an event.
 *
 * @method EventEmitter
 *
 * @arg {String} name The name of the event.
 * @arg {Function} listener The event listener to attach to the event.
*/
	on: function (name, listener) {
		this._listeners[name] = this._listeners[name] || [];
		this._listeners[name].push(listener);
		return this;
	},
/**
 * Adds an event listener to an event.
 *
 * @method EventEmitter
 *
 * @arg {String} name The name of the event.
 * @arg {Function} !listener The event listener to remove from the event. If not specified, will delete all.
*/
	off: function (name, listener) {
		if (this._listeners[name]) {
			if (!listener) {
				delete this._listeners[name];
				return this;
			}

			for (var i=0; i<this._listeners[name].length; i++) {
				if (this._listeners[name][i] === listener) {
					this._listeners[name].splice(i--, 1);
				}
			}

			if (!this._listeners[name].length) {
				delete this._listeners[name];
			}
		}
		return this;
	}
};

Sink.EventEmitter = EventEmitter;

EventEmitter.call(Sink);

}(this.Sink);
void function (Sink) {

/**
 * Creates a timer with consistent (ie. not clamped) intervals even in background tabs.
 * Uses inline workers to achieve this. If not available, will revert to regular timers.
 *
 * @static Sink
 * @name doInterval
 *
 * @arg {Function} callback The callback to trigger on timer hit.
 * @arg {Number} timeout The interval between timer hits.
 *
 * @return {Function} A function to cancel the timer.
*/

Sink.doInterval = function (callback, timeout) {
	var timer, kill;

	function create (noWorker) {
		if (Sink.inlineWorker.working && !noWorker) {
			timer = Sink.inlineWorker('setInterval(function (){ postMessage("tic"); }, ' + timeout + ');');
			timer.onmessage = function (){
				callback();
			};
			kill = function () {
				timer.terminate();
			};
		} else {
			timer = setInterval(callback, timeout);
			kill = function (){
				clearInterval(timer);
			};
		}
	}

	if (Sink.inlineWorker.ready) {
		create();
	} else {
		Sink.inlineWorker.on('ready', function () {
			create();
		});
	}

	return function () {
		if (!kill) {
			if (!Sink.inlineWorker.ready) {
				Sink.inlineWorker.on('ready', function () {
					if (kill) kill();
				});
			}
		} else {
			kill();
		}
	};
};

}(this.Sink);
void function (Sink) {

var _Blob, _BlobBuilder, _URL, _btoa;

void function (prefixes, urlPrefixes) {
	function find (name, prefixes) {
		var b, a = prefixes.slice();

		for (b=a.shift(); typeof b !== 'undefined'; b=a.shift()) {
			b = Function('return typeof ' + b + name +
				'=== "undefined" ? undefined : ' +
				b + name)();

			if (b) return b;
		}
	}

	_Blob = find('Blob', prefixes);
	_BlobBuilder = find('BlobBuilder', prefixes);
	_URL = find('URL', urlPrefixes);
	_btoa = find('btoa', ['']);
}([
	'',
	'Moz',
	'WebKit',
	'MS'
], [
	'',
	'webkit'
]);

var createBlob = _Blob && _URL && function (content, type) {
	return _URL.createObjectURL(new _Blob([content], { type: type }));
};

var createBlobBuilder = _BlobBuilder && _URL && function (content, type) {
	var bb = new _BlobBuilder();
	bb.append(content);

	return _URL.createObjectURL(bb.getBlob(type));
};

var createData = _btoa && function (content, type) {
	return 'data:' + type + ';base64,' + _btoa(content);
};

var createDynURL =
	createBlob ||
	createBlobBuilder ||
	createData;

if (!createDynURL) return;

if (createBlob) createDynURL.createBlob = createBlob;
if (createBlobBuilder) createDynURL.createBlobBuilder = createBlobBuilder;
if (createData) createDynURL.createData = createData;

if (_Blob) createDynURL.Blob = _Blob;
if (_BlobBuilder) createDynURL.BlobBuilder = _BlobBuilder;
if (_URL) createDynURL.URL = _URL;

Sink.createDynURL = createDynURL;

Sink.revokeDynURL = function (url) {
	if (typeof url === 'string' && url.indexOf('data:') === 0) {
		return false;
	} else {
		return _URL.revokeObjectURL(url);
	}
};

}(this.Sink);
void function (Sink) {

/*
 * A Sink-specific error class.
 *
 * @class
 * @static Sink
 * @name Error
 *
 * @arg =code
 *
 * @param {Number} code The error code.
 * @param {String} message A brief description of the error.
 * @param {String} explanation A more verbose explanation of why the error occured and how to fix.
*/

function SinkError(code) {
	if (!SinkError.hasOwnProperty(code)) throw SinkError(1);
	if (!(this instanceof SinkError)) return new SinkError(code);

	var k;
	for (k in SinkError[code]) {
		if (SinkError[code].hasOwnProperty(k)) {
			this[k] = SinkError[code][k];
		}
	}

	this.code = code;
}

SinkError.prototype = new Error();

SinkError.prototype.toString = function () {
	return 'SinkError 0x' + this.code.toString(16) + ': ' + this.message;
};

SinkError[0x01] = {
	message: 'No such error code.',
	explanation: 'The error code does not exist.'
};
SinkError[0x02] = {
	message: 'No audio sink available.',
	explanation: 'The audio device may be busy, or no supported output API is available for this browser.'
};

SinkError[0x10] = {
	message: 'Buffer underflow.',
	explanation: 'Trying to recover...'
};
SinkError[0x11] = {
	message: 'Critical recovery fail.',
	explanation: 'The buffer underflow has reached a critical point, trying to recover, but will probably fail anyway.'
};
SinkError[0x12] = {
	message: 'Buffer size too large.',
	explanation: 'Unable to allocate the buffer due to excessive length, please try a smaller buffer. Buffer size should probably be smaller than the sample rate.'
};

Sink.Error = SinkError;

}(this.Sink);
void function (Sink) {

/**
 * Creates an inline worker using a data/blob URL, if possible.
 *
 * @static Sink
 *
 * @arg {String} script
 *
 * @return {Worker} A web worker, or null if impossible to create.
*/

var define = Object.defineProperty ? function (obj, name, value) {
	Object.defineProperty(obj, name, {
		value: value,
		configurable: true,
		writable: true
	});
} : function (obj, name, value) {
	obj[name] = value;
};

function terminate () {
	define(this, 'terminate', this._terminate);

	Sink.revokeDynURL(this._url);

	delete this._url;
	delete this._terminate;
	return this.terminate();
}

function inlineWorker (script) {
	function wrap (type, content, typeName) {
		try {
			var url = type(content, 'text/javascript');
			var worker = new Worker(url);

			define(worker, '_url', url);
			define(worker, '_terminate', worker.terminate);
			define(worker, 'terminate', terminate);

			if (inlineWorker.type) return worker;

			inlineWorker.type = typeName;
			inlineWorker.createURL = type;

			return worker;
		} catch (e) {
			return null;
		}
	}

	var createDynURL = Sink.createDynURL;
	var worker;

	if (inlineWorker.createURL) {
		return wrap(inlineWorker.createURL, script, inlineWorker.type);
	}

	worker = wrap(createDynURL.createBlob, script, 'blob');
	if (worker) return worker;

	worker = wrap(createDynURL.createBlobBuilder, script, 'blobbuilder');
	if (worker) return worker;

	worker = wrap(createDynURL.createData, script, 'data');

	return worker;
}

Sink.EventEmitter.call(inlineWorker);

inlineWorker.test = function () {
	inlineWorker.ready = inlineWorker.working = false;
	inlineWorker.type = '';
	inlineWorker.createURL = null;

	var worker = inlineWorker('this.onmessage=function(e){postMessage(e.data)}');
	var data = 'inlineWorker';

	function ready (success) {
		if (inlineWorker.ready) return;

		inlineWorker.ready = true;
		inlineWorker.working = success;
		inlineWorker.emit('ready', [success]);
		inlineWorker.off('ready');

		if (success && worker) {
			worker.terminate();
		}

		worker = null;
	}

	if (!worker) {
		setTimeout(function () {
			ready(false);
		}, 0);
	} else {
		worker.onmessage = function (e) {
			ready(e.data === data);
		};

		worker.postMessage(data);

		setTimeout(function () {
			ready(false);
		}, 1000);
	}
};

Sink.inlineWorker = inlineWorker;

inlineWorker.test();

}(this.Sink);
void function (Sink) {

/**
 * A Sink class for the Mozilla Audio Data API.
*/

Sink.sinks('audiodata', function () {
	var	self			= this,
		currentWritePosition	= 0,
		tail			= null,
		audioDevice		= new Audio(),
		written, currentPosition, available, soundData, prevPos,
		timer; // Fix for https://bugzilla.mozilla.org/show_bug.cgi?id=630117
	self.start.apply(self, arguments);
	self.preBufferSize = isNaN(arguments[4]) || arguments[4] === null ? this.preBufferSize : arguments[4];

	function bufferFill() {
		if (tail) {
			written = audioDevice.mozWriteAudio(tail);
			currentWritePosition += written;
			if (written < tail.length){
				tail = tail.subarray(written);
				return tail;
			}
			tail = null;
		}

		currentPosition = audioDevice.mozCurrentSampleOffset();
		available = Number(currentPosition + (prevPos !== currentPosition ? self.bufferSize : self.preBufferSize) * self.channelCount - currentWritePosition);

		if (currentPosition === prevPos) {
			self.emit('error', [Sink.Error(0x10)]);
		}

		if (available > 0 || prevPos === currentPosition){
			self.ready();

			try {
				soundData = new Float32Array(prevPos === currentPosition ? self.preBufferSize * self.channelCount :
					self.forceBufferSize ? available < self.bufferSize * 2 ? self.bufferSize * 2 : available : available);
			} catch(e) {
				self.emit('error', [Sink.Error(0x12)]);
				self.kill();
				return;
			}
			self.process(soundData, self.channelCount);
			written = self._audio.mozWriteAudio(soundData);
			if (written < soundData.length){
				tail = soundData.subarray(written);
			}
			currentWritePosition += written;
		}
		prevPos = currentPosition;
	}

	audioDevice.mozSetup(self.channelCount, self.sampleRate);

	this._timers = [];

	this._timers.push(Sink.doInterval(function () {
		// Check for complete death of the output
		if (+new Date() - self.previousHit > 2000) {
			self._audio = audioDevice = new Audio();
			audioDevice.mozSetup(self.channelCount, self.sampleRate);
			currentWritePosition = 0;
			self.emit('error', [Sink.Error(0x11)]);
		}
	}, 1000));

	this._timers.push(Sink.doInterval(bufferFill, self.interval));

	self._bufferFill	= bufferFill;
	self._audio		= audioDevice;
}, {
	// These are somewhat safe values...
	bufferSize: 24576,
	preBufferSize: 24576,
	forceBufferSize: false,
	interval: 100,

	kill: function () {
		while (this._timers.length) {
			this._timers.shift()();
		}

		this.emit('kill');
	},

	getPlaybackTime: function () {
		return this._audio.mozCurrentSampleOffset() / this.channelCount;
	}
}, false, true);

Sink.sinks.moz = Sink.sinks.audiodata;

}(this.Sink);
void function (Sink) {

/**
 * A dummy Sink. (No output)
*/

Sink.sinks('dummy', function () {
	var	self = this;
	self.start.apply(self, arguments);

	function bufferFill () {
		var	soundData = new Float32Array(self.bufferSize * self.channelCount);
		self.process(soundData, self.channelCount);
	}

	self._kill = Sink.doInterval(bufferFill, self.bufferSize / self.sampleRate * 1000);

	self._callback		= bufferFill;
}, {
	kill: function () {
		this._kill();
		this.emit('kill');
	}
}, true);

}(this.Sink);
(function (Sink, sinks) {

sinks = Sink.sinks;

function newAudio (src) {
	var audio = document.createElement('audio');
	if (src) {
		audio.src = src;
	}
	return audio;
}

/* TODO: Implement a <BGSOUND> hack for IE8. */

/**
 * A sink class for WAV data URLs
 * Relies on pcmdata.js and utils to be present.
 * Thanks to grantgalitz and others for the idea.
*/
sinks('wav', function () {
	var	self			= this,
		audio			= new sinks.wav.wavAudio(),
		PCMData			= typeof PCMData === 'undefined' ? audioLib.PCMData : PCMData;
	self.start.apply(self, arguments);
	var	soundData		= new Float32Array(self.bufferSize * self.channelCount),
		zeroData		= new Float32Array(self.bufferSize * self.channelCount);

	if (!newAudio().canPlayType('audio/wav; codecs=1') || !btoa) throw 0;

	function bufferFill () {
		if (self._audio.hasNextFrame) return;

		self.ready();

		Sink.memcpy(zeroData, 0, soundData, 0);
		self.process(soundData, self.channelCount);

		self._audio.setSource('data:audio/wav;base64,' + btoa(
			audioLib.PCMData.encode({
				data:		soundData,
				sampleRate:	self.sampleRate,
				channelCount:	self.channelCount,
				bytesPerSample:	self.quality
			})
		));

		if (!self._audio.currentFrame.src) self._audio.nextClip();
	}

	self.kill		= Sink.doInterval(bufferFill, 40);
	self._bufferFill	= bufferFill;
	self._audio		= audio;
}, {
	quality: 1,
	bufferSize: 22050,

	getPlaybackTime: function () {
		var audio = this._audio;
		return (audio.currentFrame ? audio.currentFrame.currentTime * this.sampleRate : 0) + audio.samples;
	}
});

function wavAudio () {
	var self = this;

	self.currentFrame	= newAudio();
	self.nextFrame		= newAudio();

	self._onended		= function () {
		self.samples += self.bufferSize;
		self.nextClip();
	};
}

wavAudio.prototype = {
	samples:	0,
	nextFrame:	null,
	currentFrame:	null,
	_onended:	null,
	hasNextFrame:	false,

	nextClip: function () {
		var	curFrame	= this.currentFrame;
		this.currentFrame	= this.nextFrame;
		this.nextFrame		= curFrame;
		this.hasNextFrame	= false;
		this.currentFrame.play();
	},

	setSource: function (src) {
		this.nextFrame.src = src;
		this.nextFrame.addEventListener('ended', this._onended, true);

		this.hasNextFrame = true;
	}
};

sinks.wav.wavAudio = wavAudio;

}(this.Sink));
 (function (sinks, fixChrome82795) {

var AudioContext = typeof window === 'undefined' ? null : window.webkitAudioContext || window.AudioContext;

/**
 * A sink class for the Web Audio API
*/

sinks('webaudio', function (readFn, channelCount, bufferSize, sampleRate) {
	var	self		= this,
		context		= sinks.webaudio.getContext(),
		node		= null,
		soundData	= null,
		zeroBuffer	= null;
	self.start.apply(self, arguments);
    node = context.createScriptProcessor(self.bufferSize, self.channelCount, self.channelCount);

	function bufferFill(e) {
		var	outputBuffer	= e.outputBuffer,
			channelCount	= outputBuffer.numberOfChannels,
			i, n, l		= outputBuffer.length,
			size		= outputBuffer.size,
			channels	= new Array(channelCount),
			tail;

		self.ready();

		soundData	= soundData && soundData.length === l * channelCount ? soundData : new Float32Array(l * channelCount);
		zeroBuffer	= zeroBuffer && zeroBuffer.length === soundData.length ? zeroBuffer : new Float32Array(l * channelCount);
		soundData.set(zeroBuffer);

		for (i=0; i<channelCount; i++) {
			channels[i] = outputBuffer.getChannelData(i);
		}

		self.process(soundData, self.channelCount);

		for (i=0; i<l; i++) {
			for (n=0; n < channelCount; n++) {
				channels[n][i] = soundData[i * self.channelCount + n];
			}
		}
	}

	self.sampleRate = context.sampleRate;

	node.onaudioprocess = bufferFill;
	node.connect(context.destination);

	self._context		= context;
	self._node		= node;
	self._callback		= bufferFill;
	/* Keep references in order to avoid garbage collection removing the listeners, working around http://code.google.com/p/chromium/issues/detail?id=82795 */
	// Thanks to @baffo32
	fixChrome82795.push(node);
}, {
	kill: function () {
		this._node.disconnect(0);

		for (var i=0; i<fixChrome82795.length; i++) {
			if (fixChrome82795[i] === this._node) {
				fixChrome82795.splice(i--, 1);
			}
		}

		this._node = this._context = null;
		this.emit('kill');
	},

	getPlaybackTime: function () {
		return this._context.currentTime * this.sampleRate;
	}
}, false, true);

sinks.webkit = sinks.webaudio;

sinks.webaudio.fix82795 = fixChrome82795;

sinks.webaudio.getContext = function () {
	// For now, we have to accept that the AudioContext is at 48000Hz, or whatever it decides.
	var context = new AudioContext(/*sampleRate*/);

	sinks.webaudio.getContext = function () {
		return context;
	};

	return context;
};

}(this.Sink.sinks, []));
(function (Sink) {

/**
 * A Sink class for the Media Streams Processing API and/or Web Audio API in a Web Worker.
*/

Sink.sinks('worker', function () {
	var	self		= this,
		global		= (function(){ return this; }()),
		soundData	= null,
		outBuffer	= null,
		zeroBuffer	= null;
	self.start.apply(self, arguments);

	// Let's see if we're in a worker.

	importScripts();

	function mspBufferFill (e) {
		if (!self.isReady) {
			self.initMSP(e);
		}

		self.ready();

		var	channelCount	= self.channelCount,
			l		= e.audioLength,
			n, i;

		soundData	= soundData && soundData.length === l * channelCount ? soundData : new Float32Array(l * channelCount);
		outBuffer	= outBuffer && outBuffer.length === soundData.length ? outBuffer : new Float32Array(l * channelCount);
		zeroBuffer	= zeroBuffer && zeroBuffer.length === soundData.length ? zeroBuffer : new Float32Array(l * channelCount);

		soundData.set(zeroBuffer);
		outBuffer.set(zeroBuffer);

		self.process(soundData, self.channelCount);

		for (n=0; n<channelCount; n++) {
			for (i=0; i<l; i++) {
				outBuffer[n * e.audioLength + i] = soundData[n + i * channelCount];
			}
		}

		e.writeAudio(outBuffer);
	}

	function waBufferFill(e) {
		if (!self.isReady) {
			self.initWA(e);
		}

		self.ready();

		var	outputBuffer	= e.outputBuffer,
			channelCount	= outputBuffer.numberOfChannels,
			i, n, l		= outputBuffer.length,
			size		= outputBuffer.size,
			channels	= new Array(channelCount),
			tail;

		soundData	= soundData && soundData.length === l * channelCount ? soundData : new Float32Array(l * channelCount);
		zeroBuffer	= zeroBuffer && zeroBuffer.length === soundData.length ? zeroBuffer : new Float32Array(l * channelCount);
		soundData.set(zeroBuffer);

		for (i=0; i<channelCount; i++) {
			channels[i] = outputBuffer.getChannelData(i);
		}

		self.process(soundData, self.channelCount);

		for (i=0; i<l; i++) {
			for (n=0; n < channelCount; n++) {
				channels[n][i] = soundData[i * self.channelCount + n];
			}
		}
	}

	global.onprocessmedia	= mspBufferFill;
	global.onaudioprocess	= waBufferFill;

	self._mspBufferFill	= mspBufferFill;
	self._waBufferFill	= waBufferFill;

}, {
	ready: false,

	initMSP: function (e) {
		this.channelCount	= e.audioChannels;
		this.sampleRate		= e.audioSampleRate;
		this.bufferSize		= e.audioLength * this.channelCount;
		this.ready		= true;
		this.emit('ready', []);
	},

	initWA: function (e) {
		var b = e.outputBuffer;
		this.channelCount	= b.numberOfChannels;
		this.sampleRate		= b.sampleRate;
		this.bufferSize		= b.length * this.channelCount;
		this.ready		= true;
		this.emit('ready', []);
	}
});

}(this.Sink));
(function (Sink) {

/**
 * Splits a sample buffer into those of different channels.
 *
 * @static Sink
 * @name deinterleave
 *
 * @arg {Buffer} buffer The sample buffer to split.
 * @arg {Number} channelCount The number of channels to split to.
 *
 * @return {Array} An array containing the resulting sample buffers.
*/

Sink.deinterleave = function (buffer, channelCount) {
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
 * @static Sink
 * @name resample
 *
 * @arg {Array} buffers The buffers to join.
 * @arg {Number} !channelCount The number of channels. Defaults to buffers.length
 * @arg {Buffer} !buffer The output buffer.
 *
 * @return {Buffer} The interleaved buffer created.
*/

Sink.interleave = function (buffers, channelCount, buffer) {
	channelCount		= channelCount || buffers.length;
	var	l		= buffers[0].length,
		bufferCount	= buffers.length,
		i, n;
	buffer			= buffer || new Float32Array(l * channelCount);
	for (i=0; i<bufferCount; i++) {
		for (n=0; n<l; n++) {
			buffer[i + n * channelCount] = buffers[i][n];
		}
	}
	return buffer;
};

/**
 * Mixes two or more buffers down to one.
 *
 * @static Sink
 * @name mix
 *
 * @arg {Buffer} buffer The buffer to append the others to.
 * @arg {Buffer} bufferX The buffers to append from.
 *
 * @return {Buffer} The mixed buffer.
*/

Sink.mix = function (buffer) {
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
 * @static Sink
 * @name resetBuffer
 *
 * @arg {Buffer} buffer The buffer to reset.
 *
 * @return {Buffer} The 0-reset buffer.
*/

Sink.resetBuffer = function (buffer) {
	var	l	= buffer.length,
		i;
	for (i=0; i<l; i++){
		buffer[i] = 0;
	}
	return buffer;
};

/**
 * Copies the content of a buffer to another buffer.
 *
 * @static Sink
 * @name clone
 *
 * @arg {Buffer} buffer The buffer to copy from.
 * @arg {Buffer} !result The buffer to copy to.
 *
 * @return {Buffer} A clone of the buffer.
*/

Sink.clone = function (buffer, result) {
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
 * @static Sink
 * @name createDeinterleaved
 *
 * @arg {Number} length The length of a single channel.
 * @arg {Number} channelCount The number of channels.
 * @return {Array} The array of buffers.
*/

Sink.createDeinterleaved = function (length, channelCount) {
	var	result	= new Array(channelCount),
		i;
	for (i=0; i<channelCount; i++){
		result[i] = new Float32Array(length);
	}
	return result;
};

Sink.memcpy = function (src, srcOffset, dst, dstOffset, length) {
	src	= src.subarray || src.slice ? src : src.buffer;
	dst	= dst.subarray || dst.slice ? dst : dst.buffer;

	src	= srcOffset ? src.subarray ?
		src.subarray(srcOffset, length && srcOffset + length) :
		src.slice(srcOffset, length && srcOffset + length) : src;

	if (dst.set) {
		dst.set(src, dstOffset);
	} else {
		for (var i=0; i<src.length; i++) {
			dst[i + dstOffset] = src[i];
		}
	}

	return dst;
};

Sink.memslice = function (buffer, offset, length) {
	return buffer.subarray ? buffer.subarray(offset, length) : buffer.slice(offset, length);
};

Sink.mempad = function (buffer, out, offset) {
	out = out.length ? out : new (buffer.constructor)(out);
	Sink.memcpy(buffer, 0, out, offset);
	return out;
};

Sink.linspace = function (start, end, out) {
	var l, i, n, step;
	out	= out.length ? (l=out.length) && out : Array(l=out);
	step	= (end - start) / --l;
	for (n=start+step, i=1; i<l; i++, n+=step) {
		out[i] = n;
	}
	out[0]	= start;
	out[l]	= end;
	return out;
};

Sink.ftoi = function (input, bitCount, output) {
	var i, mask = Math.pow(2, bitCount - 1);

	output = output || new (input.constructor)(input.length);

	for (i=0; i<input.length; i++) {
		output[i] = ~~(mask * input[i]);
	}

	return output;
};

}(this.Sink));
(function (Sink) {

function Proxy (bufferSize, channelCount) {
	Sink.EventEmitter.call(this);

	this.bufferSize		= isNaN(bufferSize) || bufferSize === null ? this.bufferSize : bufferSize;
	this.channelCount	= isNaN(channelCount) || channelCount === null ? this.channelCount : channelCount;

	var self = this;
	this.callback = function () {
		return self.process.apply(self, arguments);
	};

	this.resetBuffer();
}

Proxy.prototype = {
	buffer: null,
	zeroBuffer: null,
	parentSink: null,
	bufferSize: 4096,
	channelCount: 2,
	offset: null,

	resetBuffer: function () {
		this.buffer	= new Float32Array(this.bufferSize);
		this.zeroBuffer	= new Float32Array(this.bufferSize);
	},

	process: function (buffer, channelCount) {
		if (this.offset === null) {
			this.loadBuffer();
		}

		for (var i=0; i<buffer.length; i++) {
			if (this.offset >= this.buffer.length) {
				this.loadBuffer();
			}

			buffer[i] = this.buffer[this.offset++];
		}
	},

	loadBuffer: function () {
		this.offset = 0;
		Sink.memcpy(this.zeroBuffer, 0, this.buffer, 0);
		this.emit('audioprocess', [this.buffer, this.channelCount]);
	}
};

Sink.Proxy = Proxy;

/**
 * Creates a proxy callback system for the sink instance.
 * Requires Sink utils.
 *
 * @method Sink
 * @method createProxy
 *
 * @arg {Number} !bufferSize The buffer size for the proxy.
*/
Sink.prototype.createProxy = function (bufferSize) {
	var	proxy		= new Sink.Proxy(bufferSize, this.channelCount);
	proxy.parentSink	= this;

	this.on('audioprocess', proxy.callback);

	return proxy;
};

}(this.Sink));
(function (Sink) {

(function(){

/**
 * If method is supplied, adds a new interpolation method to Sink.interpolation, otherwise sets the default interpolation method (Sink.interpolate) to the specified property of Sink.interpolate.
 *
 * @arg {String} name The name of the interpolation method to get / set.
 * @arg {Function} !method The interpolation method.
*/

function interpolation(name, method) {
	if (name && method) {
		interpolation[name] = method;
	} else if (name && interpolation[name] instanceof Function) {
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
interpolation('linear', function (arr, pos) {
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
interpolation('nearest', function (arr, pos) {
	return pos >= arr.length - 0.5 ? arr[0] : arr[Math.round(pos)];
});

interpolation('linear');

}());


/**
 * Resamples a sample buffer from a frequency to a frequency and / or from a sample rate to a sample rate.
 *
 * @static Sink
 * @name resample
 *
 * @arg {Buffer} buffer The sample buffer to resample.
 * @arg {Number} fromRate The original sample rate of the buffer, or if the last argument, the speed ratio to convert with.
 * @arg {Number} fromFrequency The original frequency of the buffer, or if the last argument, used as toRate and the secondary comparison will not be made.
 * @arg {Number} toRate The sample rate of the created buffer.
 * @arg {Number} toFrequency The frequency of the created buffer.
 *
 * @return The new resampled buffer.
*/
Sink.resample	= function (buffer, fromRate /* or speed */, fromFrequency /* or toRate */, toRate, toFrequency) {
	var
		argc		= arguments.length,
		speed		= argc === 2 ? fromRate : argc === 3 ? fromRate / fromFrequency : toRate / fromRate * toFrequency / fromFrequency,
		l		= buffer.length,
		length		= Math.ceil(l / speed),
		newBuffer	= new Float32Array(length),
		i, n;
	for (i=0, n=0; i<l; i += speed) {
		newBuffer[n++] = Sink.interpolate(buffer, i);
	}
	return newBuffer;
};

}(this.Sink));
void function (Sink) {

Sink.on('init', function (sink) {
	sink.activeRecordings = [];
	sink.on('postprocess', sink.recordData);
});

Sink.prototype.activeRecordings = null;

/**
 * Starts recording the sink output.
 *
 * @method Sink
 * @name record
 *
 * @return {Recording} The recording object for the recording started.
*/
Sink.prototype.record = function () {
	var recording = new Sink.Recording(this);
	this.emit('record', [recording]);
	return recording;
};
/**
 * Private method that handles the adding the buffers to all the current recordings.
 *
 * @method Sink
 * @method recordData
 *
 * @arg {Array} buffer The buffer to record.
*/
Sink.prototype.recordData = function (buffer) {
	var	activeRecs	= this.activeRecordings,
		i, l		= activeRecs.length;
	for (i=0; i<l; i++) {
		activeRecs[i].add(buffer);
	}
};

/**
 * A Recording class for recording sink output.
 *
 * @class
 * @static Sink
 * @arg {Object} bindTo The sink to bind the recording to.
*/

function Recording (bindTo) {
	this.boundTo = bindTo;
	this.buffers = [];
	bindTo.activeRecordings.push(this);
}

Recording.prototype = {
/**
 * Adds a new buffer to the recording.
 *
 * @arg {Array} buffer The buffer to add.
 *
 * @method Recording
*/
	add: function (buffer) {
		this.buffers.push(buffer);
	},
/**
 * Empties the recording.
 *
 * @method Recording
*/
	clear: function () {
		this.buffers = [];
	},
/**
 * Stops the recording and unbinds it from it's host sink.
 *
 * @method Recording
*/
	stop: function () {
		var	recordings = this.boundTo.activeRecordings,
			i;
		for (i=0; i<recordings.length; i++) {
			if (recordings[i] === this) {
				recordings.splice(i--, 1);
			}
		}
	},
/**
 * Joins the recorded buffers into a single buffer.
 *
 * @method Recording
*/
	join: function () {
		var	bufferLength	= 0,
			bufPos		= 0,
			buffers		= this.buffers,
			newArray,
			n, i, l		= buffers.length;

		for (i=0; i<l; i++) {
			bufferLength += buffers[i].length;
		}
		newArray = new Float32Array(bufferLength);
		for (i=0; i<l; i++) {
			for (n=0; n<buffers[i].length; n++) {
				newArray[bufPos + n] = buffers[i][n];
			}
			bufPos += buffers[i].length;
		}
		return newArray;
	}
};

Sink.Recording = Recording;

}(this.Sink);
void function (Sink) {

function processRingBuffer () {
	if (this.ringBuffer) {
		(this.channelMode === 'interleaved' ? this.ringSpin : this.ringSpinInterleaved).apply(this, arguments);
	}
}

Sink.on('init', function (sink) {
	sink.on('preprocess', processRingBuffer);
});

Sink.prototype.ringBuffer = null;

/**
 * A private method that applies the ring buffer contents to the specified buffer, while in interleaved mode.
 *
 * @method Sink
 * @name ringSpin
 *
 * @arg {Array} buffer The buffer to write to.
*/
Sink.prototype.ringSpin = function (buffer) {
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
};

/**
 * A private method that applies the ring buffer contents to the specified buffer, while in deinterleaved mode.
 *
 * @method Sink
 * @name ringSpinDeinterleaved
 *
 * @param {Array} buffer The buffers to write to.
*/
Sink.prototype.ringSpinDeinterleaved = function (buffer) {
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
};

}(this.Sink);
void function (Sink, proto) {

proto = Sink.prototype;

Sink.on('init', function (sink) {
	sink.asyncBuffers	= [];
	sink.syncBuffers	= [];
	sink.on('preprocess', sink.writeBuffersSync);
	sink.on('postprocess', sink.writeBuffersAsync);
});

proto.writeMode		= 'async';
proto.asyncBuffers	= proto.syncBuffers = null;

/**
 * Private method that handles the mixing of asynchronously written buffers.
 *
 * @method Sink
 * @name writeBuffersAsync
 *
 * @arg {Array} buffer The buffer to write to.
*/
proto.writeBuffersAsync = function (buffer) {
	var	buffers		= this.asyncBuffers,
		l		= buffer.length,
		buf,
		bufLength,
		i, n, offset;
	if (buffers) {
		for (i=0; i<buffers.length; i++) {
			buf		= buffers[i];
			bufLength	= buf.b.length;
			offset		= buf.d;
			buf.d		-= Math.min(offset, l);

			for (n=0; n + offset < l && n < bufLength; n++) {
				buffer[n + offset] += buf.b[n];
			}
			buf.b = buf.b.subarray(n + offset);
			if (i >= bufLength) {
				buffers.splice(i--, 1);
			}
		}
	}
};

/**
 * A private method that handles mixing synchronously written buffers.
 *
 * @method Sink
 * @name writeBuffersSync
 *
 * @arg {Array} buffer The buffer to write to.
*/
proto.writeBuffersSync = function (buffer) {
	var	buffers		= this.syncBuffers,
		l		= buffer.length,
		i		= 0,
		soff		= 0;
	for (;i<l && buffers.length; i++) {
		buffer[i] += buffers[0][soff];
		if (buffers[0].length <= soff){
			buffers.splice(0, 1);
			soff = 0;
			continue;
		}
		soff++;
	}
	if (buffers.length) {
		buffers[0] = buffers[0].subarray(soff);
	}
};

/**
 * Writes a buffer asynchronously on top of the existing signal, after a specified delay.
 *
 * @method Sink
 * @name writeBufferAsync
 *
 * @arg {Array} buffer The buffer to write.
 * @arg {Number} delay The delay to write after. If not specified, the Sink will calculate a delay to compensate the latency.
 * @return {Number} The number of currently stored asynchronous buffers.
*/
proto.writeBufferAsync = function (buffer, delay) {
	buffer			= this.mode === 'deinterleaved' ? Sink.interleave(buffer, this.channelCount) : buffer;
	var	buffers		= this.asyncBuffers;
	buffers.push({
		b: buffer,
		d: isNaN(delay) ? ~~((+new Date() - this.previousHit) / 1000 * this.sampleRate) : delay
	});
	return buffers.length;
};

/**
 * Writes a buffer synchronously to the output.
 *
 * @method Sink
 * @name writeBufferSync
 *
 * @param {Array} buffer The buffer to write.
 * @return {Number} The number of currently stored synchronous buffers.
*/
proto.writeBufferSync = function (buffer) {
	buffer			= this.mode === 'deinterleaved' ? Sink.interleave(buffer, this.channelCount) : buffer;
	var	buffers		= this.syncBuffers;
	buffers.push(buffer);
	return buffers.length;
};

/**
 * Writes a buffer, according to the write mode specified.
 *
 * @method Sink
 * @name writeBuffer
 *
 * @arg {Array} buffer The buffer to write.
 * @arg {Number} delay The delay to write after. If not specified, the Sink will calculate a delay to compensate the latency. (only applicable in asynchronous write mode)
 * @return {Number} The number of currently stored (a)synchronous buffers.
*/
proto.writeBuffer = function () {
	return this[this.writeMode === 'async' ? 'writeBufferAsync' : 'writeBufferSync'].apply(this, arguments);
};

/**
 * Gets the total amount of yet unwritten samples in the synchronous buffers.
 *
 * @method Sink
 * @name getSyncWriteOffset
 *
 * @return {Number} The total amount of yet unwritten samples in the synchronous buffers.
*/
proto.getSyncWriteOffset = function () {
	var	buffers		= this.syncBuffers,
		offset		= 0,
		i;
	for (i=0; i<buffers.length; i++) {
		offset += buffers[i].length;
	}
	return offset;
};

} (this.Sink);

