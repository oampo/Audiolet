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
        var inputPin = node.inputs[input || 0];
        inputPin.disconnect(outputPin);
        outputPin.disconnect(inputPin);
    },

    setNumberOfOutputChannels: function(output, numberOfChannels) {
        this.outputs[output].numberOfChannels = numberOfChannels;
    },

    linkNumberOfOutputChannels: function(output, input) {
        this.outputs[output].linkNumberOfChannels(this.inputs[input]);
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
        // Sane default - pass along any empty flags
        var numberOfInputs = inputBuffers.length;
        var numberOfOutputs = outputBuffers.length;
        for (var i = 0; i < numberOfInputs; i++) {
            if (i < numberOfOutputs && inputBuffers[i].isEmpty) {
                outputBuffers[i].isEmpty = true;
            }
        }
    },

    createInputBuffers: function(length) {
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
    },

    createOutputBuffers: function(length) {
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
    },

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


/**
 * @depends AudioletNode.js
 */
var AbstractAudioletDevice = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 0]);
        this.audiolet = audiolet;
        this.buffer = null;
    },

    generate: function(inputBuffers, outputBuffers) {
        this.buffer = inputBuffers[0];
    },

    getPlaybackTime: function() {
        return 0;
    },

    getWriteTime: function() {
        return 0;
    },

    toString: function() {
        return 'Device';
    }
});


/**
 * @depends AbstractAudioletDevice.js
 */

var AudioDataAPIDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);

        this.sampleRate = sampleRate || 44100.0;
        this.numberOfChannels = numberOfChannels || 2;
        if (bufferSize) {
            this.bufferSize = bufferSize;
            this.autoLatency = false;
        }
        else {
            this.bufferSize = this.sampleRate * 0.02;
            this.autoLatency = true;
        }

        this.output = new Audio();
        this.baseOverflow = null;
        this.overflow = null;
        this.overflowOffset = 0;
        this.writePosition = 0;

        this.output.mozSetup(this.numberOfChannels, this.sampleRate);

        this.started = new Date().valueOf();
        this.interval = this.tick.periodical(10, this);
    },

    tick: function() {
        var outputPosition = this.output.mozCurrentSampleOffset();
        // Check if some data was not written in previous attempts
        var numSamplesWritten;
        if (this.overflow) {
            numSamplesWritten = this.output.mozWriteAudio(this.overflow);
            if (numSamplesWritten == 0) return;
            this.writePosition += numSamplesWritten;
            if (numSamplesWritten < this.overflow.length) {
                // Not all the data was written, saving the tail for writing
                // the next time fillBuffer is called
                // Begin broken subarray-of-subarray fix
                this.overflowOffset += numSamplesWritten;
                this.overflow = this.baseOverflow.subarray(this.overflowOffset);
                // End broken subarray-of-subarray fix
                // Uncomment the following line when subarray-of-subarray is
                // sorted
                //this.overflow = this.overflow.subarray(numSamplesWritten);
                return;
            }
            this.overflow = null;
        }

        var samplesNeeded = outputPosition +
                            (this.bufferSize * this.numberOfChannels) -
                            this.writePosition;

        if (this.autoLatency) {
            var delta = (new Date().valueOf() - this.started) / 1000;
            this.bufferSize = this.sampleRate * delta;
            if (outputPosition) {
                this.autoLatency = false;
            }
        }

        if (samplesNeeded >= this.numberOfChannels) {
            // Samples needed per channel
            samplesNeeded = Math.floor(samplesNeeded / this.numberOfChannels);
            // Request some sound data from the callback function.
            AudioletNode.prototype.tick.apply(this, [samplesNeeded,
                                                     this.getWriteTime()]);
            var buffer = this.buffer.interleaved();

            // Writing the data.
            numSamplesWritten = this.output.mozWriteAudio(buffer);
            this.writePosition += numSamplesWritten;
            if (numSamplesWritten < buffer.length) {
                // Not all the data was written, saving the tail.
                // Begin broken subarray-of-subarray fix
                this.baseOverflow = buffer;
                this.overflowOffset = numSamplesWritten;
                // End broken subarray-of-subarray fix
                this.overflow = buffer.subarray(numSamplesWritten);
            }
        }
    },

    getPlaybackTime: function() {
        return this.output.mozCurrentSampleOffset() / this.numberOfChannels;
    },

    getWriteTime: function() {
        return this.writePosition / this.numberOfChannels;
    },

    toString: function() {
        return 'Audio Data API Device';
    }
});


var AudioletBuffer = new Class({
    initialize: function(numberOfChannels, length) {
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
    },

    getChannelData: function(channel) {
        return (this.channels[channel]);
    },

    set: function(buffer) {
        var numberOfChannels = buffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            this.channels[i].set(buffer.getChannelData(i));
        }
    },

    setSection: function(buffer, length, inputOffset, outputOffset) {
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
            /*
            var channel1 = this.getChannelData(i).subarray(outputOffset,
                                                           outputOffset +
                                                           length);
            var channel2 = buffer.getChannelData(i).subarray(inputOffset,
                                                             inputOffset +
                                                             length);
            */
            channel1.set(channel2);
        }
    },

    add: function(buffer) {
        var length = this.length;
        var numberOfChannels = buffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel1 = this.getChannelData(i);
            var channel2 = buffer.getChannelData(i);
            for (var j = 0; j < length; j++) {
                channel1[j] += channel2[j];
            }
        }
    },

    addSection: function(buffer, length, inputOffset, outputOffset) {
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
    },

    resize: function(numberOfChannels, length, lazy, offset) {
        offset = offset || 0;
        // Local variables
        var channels = this.channels;
        var unslicedChannels = this.unslicedChannels;

        var oldLength = this.length;
        var channelOffset = this.channelOffset + offset;

        for (var i=0; i < numberOfChannels; i++) {
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
    },

    push: function(buffer) {
        var bufferLength = buffer.length;
        this.resize(this.numberOfChannels, this.length + bufferLength);
        this.setSection(buffer, bufferLength, 0, this.length - bufferLength);
    },

    pop: function(buffer) {
        var bufferLength = buffer.length;
        var offset = this.length - bufferLength;
        buffer.setSection(this, bufferLength, offset, 0);
        this.resize(this.numberOfChannels, offset);
    },

    unshift: function(buffer) {
        var bufferLength = buffer.length;
        this.resize(this.numberOfChannels, this.length + bufferLength, false,
                    bufferLength);
        this.setSection(buffer, bufferLength, 0, 0);
    },

    shift: function(buffer) {
        var bufferLength = buffer.length;
        buffer.setSection(this, bufferLength, 0, 0);
        this.resize(this.numberOfChannels, this.length - bufferLength,
                    false, bufferLength);
    },

    zero: function() {
       var numberOfChannels = this.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel = this.getChannelData(i);
            var length = this.length;
            for (var j = 0; j < length; j++) {
                channel[j] = 0;
            }
        }
    },

    combined: function() {
        var channels = this.channels;
        var numberOfChannels = this.numberOfChannels;
        var length = this.length;
        var combined = new Float32Array(numberOfChannels * length);
        for (var i = 0; i < numberOfChannels; i++) {
            combined.set(channels[i], i * length);
        }
        return combined;
    },

    interleaved: function() {
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
    },

    copy: function() {
        var buffer = new AudioletBuffer(this.numberOfChannels, this.length);
        buffer.set(this);
        return buffer;
    },

    load: function(path, async, callback) {
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
        }.bind(this)
        
        request.send();
    }
});

var AudioletGroup = new Class({
    initialize: function(audiolet, numberOfInputs, numberOfOutputs) {
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
    },

    connect: function(node, output, input) {
        this.outputs[output || 0].connect(node, 0, input);
    },

    disconnect: function(node, output, input) {
        this.outputs[output || 0].disconnect(node, 0, input);
    },

    remove: function() {
        var numberOfInputs = this.inputs.length;
        for (var i = 0; i < numberOfInputs; i++) {
            this.inputs[i].remove();
        }

        var numberOfOutputs = this.outputs.length;
        for (var i = 0; i < numberOfOutputs; i++) {
            this.outputs[i].remove();
        }
    }
});

/**
 * @depends AudioletGroup.js
 */

var AudioletDestination = new Class({
    Extends: AudioletGroup,
    initialize: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AudioletGroup.prototype.initialize.apply(this, [audiolet, 1, 0]);

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
    },

    toString: function() {
        return "Destination";
    }
});

function AudioletDevice(audiolet, sampleRate, numberOfChannels, bufferSize) {
    // Mozilla?
    var tmpAudio = new Audio();
    var haveAudioDataAPI = (typeof tmpAudio.mozSetup == 'function');
    tmpAudio = null;
    if (haveAudioDataAPI) {
        return (new AudioDataAPIDevice(audiolet, sampleRate, numberOfChannels,
                                       bufferSize));
    }
    // Webkit?
    else if (typeof AudioContext != 'undefined' ||
             typeof webkitAudioContext != 'undefined') {
        return (new WebAudioAPIDevice(audiolet, sampleRate, numberOfChannels,
                                      bufferSize));
    }
    else {
        return (new DummyDevice(audiolet, sampleRate, numberOfChannels,
                                bufferSize));
    }
}


var AudioletInput = new Class({
    initialize: function(node, index) {
        this.node = node;
        this.index = index;
        this.connectedFrom = [];
        // Minimum sized buffer, which we can resize from accordingly
        this.buffer = new AudioletBuffer(1, 0);
        // Overflow buffer, for feedback loops
        this.overflow = new AudioletBuffer(1, 0);
    },

    connect: function(output) {
        this.connectedFrom.push(output);
    },

    disconnect: function(output) {
        var numberOfStreams = this.connectedFrom.length;
        for (var i = 0; i < numberOfStreams; i++) {
            if (output == this.connectedFrom[i]) {
                this.connectedFrom.splice(i, 1);
                break;
            }
        }
    },

    isConnected: function() {
        return (this.connectedFrom.length > 0);
    },

    toString: function() {
        return this.node.toString() + 'Input #' + this.index;
    }
});


var Audiolet = new Class({
    initialize: function(sampleRate, numberOfChannels, bufferSize) {
        this.output = new AudioletDestination(this, sampleRate,
                                              numberOfChannels, bufferSize);
    }
});


var AudioletOutput = new Class({
    initialize: function(node, index) {
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
    },

    connect: function(input) {
        this.connectedTo.push(input);
    },

    disconnect: function(input) {
        var numberOfStreams = this.connectedTo.length;
        for (var i = 0; i < numberOfStreams; i++) {
            if (input == this.connectedTo[i]) {
                this.connectedTo.splice(i, 1);
                break;
            }
        }
    },

    isConnected: function() {
        return (this.connectedTo.length > 0);
    },

    linkNumberOfChannels: function(input) {
        this.linkedInput = input;
    },

    unlinkNumberOfChannels: function() {
        this.linkedInput = null;
    },

    getNumberOfChannels: function() {
        if (this.linkedInput && this.linkedInput.isConnected()) {
            return (this.linkedInput.buffer.numberOfChannels);
        }
        return (this.numberOfChannels);
    },

    getBuffer: function(length) {
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
    },

    toString: function() {
        return this.node.toString() + 'Output #' + this.index + ' - ';
    }
});


var AudioletParameter = new Class({
    initialize: function(node, inputIndex, value) {
        this.node = node;
        if (typeof inputIndex != 'undefined' && inputIndex != null) {
            this.input = node.inputs[inputIndex];
        }
        else {
            this.input = null;
        }
        this.value = value || 0;
    },

    isStatic: function() {
        var input = this.input;
        return (!(input &&
                  input.connectedFrom.length &&
                  !(input.buffer.isEmpty)));
    },

    isDynamic: function() {
        var input = this.input;
        return (input && input.connectedFrom.length && !(input.buffer.isEmpty));
    },

    setValue: function(value) {
        this.value = value;
    },

    getValue: function() {
        return this.value;
    },

    getChannel: function() {
        return this.input.buffer.channels[0];
    }
});

/**
 * @depends AudioletNode.js
 */

var BlockSizeLimiter = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, maximumBlockSize) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.maximumBlockSize = maximumBlockSize;
        this.linkNumberOfOutputChannels(0, 0);
    },


    tick: function(length, timestamp) {
        var maximumBlockSize = this.maximumBlockSize;
        if (length < maximumBlockSize) {
            // Enough samples from the last tick and buffered, so just tick
            // and recalculate any overflow
            AudioletNode.prototype.tick.apply(this, [length, timestamp]);
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
    },

    generate: function(inputBuffers, outputBuffers, offset) {
        offset = offset || 0;
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];
        if (inputBuffer.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }
        outputBuffer.setSection(inputBuffer, inputBuffer.length,
                                0, offset);
    },

    toString: function() {
        return 'Block Size Limiter';
    }
});

/**
 * @depends AbstractAudioletDevice.js
 */

var DummyDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);

        this.sampleRate = sampleRate || 44100.0;
        this.numberOfChannels = numberOfChannels || 2;
        this.bufferSize = bufferSize || 8192;

        this.writePosition = 0;

        this.tick.periodical(1000 * this.bufferSize / this.sampleRate, this);
    },

    tick: function() {
        AudioletNode.prototype.tick.apply(this, [this.bufferSize,
                                                 this.writePosition]);
        this.writePosition += this.bufferSize;
    },

    getPlaybackTime: function() {
        return this.writePosition - this.bufferSize;
    },

    getWriteTime: function() {
        return this.writePosition;
    },

    toString: function() {
        return 'Dummy Device';
    }
});


/**
 * @depends ../core/AudioletNode.js
 */

var ParameterNode = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, value) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.parameter = new AudioletParameter(this, 0, value);
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Parameter Node';
    }
});


/**
 * @depends AudioletNode.js
 */

var PassThroughNode = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, numberOfInputs, numberOfOutputs) {
        AudioletNode.prototype.initialize.apply(this, [audiolet,
                                                       numberOfInputs,
                                                       numberOfOutputs]);
    },

    createOutputBuffers: function(length) {
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
    },

    toString: function() {
        return 'Pass Through Node';
    }
});


// Priority Queue based on python heapq module
// http://svn.python.org/view/python/branches/release27-maint/Lib/heapq.py
var PriorityQueue = new Class({
    initialize: function(array, compare) {
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
    },

    push: function(item) {
        this.heap.push(item);
        this.siftDown(0, this.heap.length - 1);
    },


    pop: function() {
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
    },

    peek: function() {
        return (this.heap[0]);
    },

    isEmpty: function() {
        return (this.heap.length == 0);
    },

    siftDown: function(startPosition, position) {
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
    },

    siftUp: function(position) {
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
    },

    compare: function(a, b) {
        return (a < b);
    }
});

/**
 * @depends AudioletNode.js
 */

var Scheduler = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, bpm) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
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
    },

    setTempo: function(bpm) {
        this.bpm = bpm;
        this.beatLength = 60 / this.bpm * this.audiolet.device.sampleRate;
    },

    addRelative: function(beats, callback) {
        var event = {};
        event.callback = callback;
        event.time = this.time + beats * this.beatLength;
        this.queue.push(event);
        return event;
    },

    addAbsolute: function(beat, callback) {
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
    },

    play: function(patterns, durationPattern, callback) {
        var event = {};
        event.patterns = patterns;
        event.durationPattern = durationPattern;
        event.callback = callback;
        // TODO: Quantizing start time
        event.time = this.audiolet.device.getWriteTime();
        this.queue.push(event);
        return event;
    },

    remove: function(event) {
        this.queue.heap.erase(event); 
        // Recreate queue with event removed
        this.queue = new PriorityQueue(this.queue.heap, function(a, b) {
            return (a.time < b.time);
        });
    },

    stop: function(event) {
        this.remove(event);
    },

    tick: function(length, timestamp) {
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
    },

    updateClock: function(time) {
        this.time = time;
        this.seconds = this.time * this.audiolet.device.sampleRate;
        if (this.time >= this.lastBeatTime + this.beatLength) {
            this.beat += 1;
            this.beatInBar += 1;
            if (this.beatInBar == this.beatsPerBar) {
                this.bar += 1;
                this.beatInBar = 0;
            }
            this.lastBeatTime += this.beatLength;
        }
    },

    processEvent: function(event) {
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
            if (instanceOf(durationPattern, Pattern)) {
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
    },

    generate: function(inputBuffers, outputBuffers, offset) {
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
    },

    toString: function() {
        return 'Scheduler';
    }
});

// Shim for subarray/slice
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


/**
 * @depends AbstractAudioletDevice.js
 */

var WebAudioAPIDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);

        this.numberOfChannels = numberOfChannels || 2;
        this.bufferSize = bufferSize || 8192;

        // AudioContext is called webkitAudioContext in the current
        // implementation, so look for either
        if (typeof AudioContext != 'undefined') {
            this.context = new AudioContext();
        }
        else {
            // Must be webkitAudioContext
            this.context = new webkitAudioContext();
        }

        // Ignore specified sample rate, and use whatever the context gives us
        this.sampleRate = this.context.sampleRate;

        this.node = this.context.createJavaScriptNode(this.bufferSize, 1,
                                                           1);

        this.node.onaudioprocess = this.tick.bind(this);
        this.node.connect(this.context.destination);
        this.writePosition = 0;
    },

    tick: function(event) {
        var buffer = event.outputBuffer;
        var samplesNeeded = buffer.length;
        AudioletNode.prototype.tick.apply(this, [samplesNeeded,
                                                 this.getWriteTime()]);
        var numberOfChannels = buffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel = buffer.getChannelData(i);
            channel.set(this.buffer.getChannelData(i));
        }
        this.writePosition += samplesNeeded;
    },

    getPlaybackTime: function() {
        return this.context.currentTime * this.sampleRate;
    },

    getWriteTime: function() {
        return this.writePosition;
    },

    toString: function() {
        return 'Web Audio API Device';
    }
});


/**
 * @depends ../core/AudioletNode.js
 */
var Envelope = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, gate, levels, times, releaseStage,
                         onComplete) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.gate = new AudioletParameter(this, 0, gate || 1);

        this.levels = levels;
        this.times = times;
        this.releaseStage = releaseStage;
        this.onComplete = onComplete;

        this.stage = null;
        this.time = null;
        this.changeTime = null;

        this.level = 0;
        this.delta = 0;
        this.gateOn = false;
    },

    generate: function(inputBuffers, outputBuffers) {
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
                stageChanged = true;
            }

            if (gateOn && !gate) {
                // Key released
                gateOn = false;
                if (releaseStage) {
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
                level = this.levels[stage];
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
    },

    calculateDelta: function(stage, level) {
        var delta = this.levels[stage + 1] - level;
        var stageTime = this.times[stage] * this.audiolet.device.sampleRate;
        return (delta / stageTime);
    },

    calculateChangeTime: function(stage, time) {
        var stageTime = this.times[stage] * this.audiolet.device.sampleRate;
        return (time + stageTime);
    },

    toString: function() {
        return 'Envelope';
    }
});

/**
 * @depends Envelope.js
 */
var ADSREnvelope = new Class({
    Extends: Envelope,
    initialize: function(audiolet, gate, attack, decay, sustain, release,
                         onComplete) {
        var levels = [0, 1, sustain, 0];
        var times = [attack, decay, release];
        Envelope.prototype.initialize.apply(this, [audiolet, gate, levels,
                                                   times, 2, onComplete]);
    },

    toString: function() {
        return 'ADSR Envelope';
    }
});


/**
 * @depends ../core/AudioletNode.js
 */

// Maths from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
var BiquadFilter = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, frequency) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);

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
    },

    // Overwrite me
    calculateCoefficients: function(frequency) {
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];

        if (inputBuffer.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }

        var inputChannels = [];
        var outputChannels = [];
        var numberOfChannels = inputBuffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            inputChannels.push(inputBuffer.getChannelData(i));
            outputChannels.push(outputBuffer.getChannelData(i));
            if (i >= this.xValues.length) {
                this.xValues.push([0, 0]);
                this.yValues.push([0, 0]);
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

                var xValues = this.xValues[j];
                var x1 = xValues[0];
                var x2 = xValues[1];
                var yValues = this.yValues[j];
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
    },

    toString: function() {
        return 'Biquad Filter';
    }
});

/**
 * @depends BiquadFilter.js
 */

// Maths from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
var AllPassFilter = new Class({
    Extends: BiquadFilter,
    initialize: function(audiolet, frequency) {
        BiquadFilter.prototype.initialize.apply(this, [audiolet, frequency]);
    },

    calculateCoefficients: function(frequency) {
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
    },

    toString: function() {
        return 'All Pass Filter';
    }
});

/**
 * @depends ../core/AudioletNode.js
 */

var Amplitude = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, attack, release) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.linkNumberOfOutputChannels(0, 0);

        this.followers = [];
        var sampleRate = this.audiolet.device.sampleRate;

        attack = attack || 0.01;
        this.attack = Math.pow(0.01, 1 / (attack * sampleRate));
        release = release || 0.01;
        this.release = Math.pow(0.01, 1 / (release * sampleRate));
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];

        if (inputBuffer.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }

        var followers = this.followers;
        var numberOfFollowers = followers.length;

        var attack = this.attack;
        var release = this.release;

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
                var value = inputChannel[j];
                if (i > follower) {
                    follower = attack * (follower - value) + value;
                }
                else {
                    follower = release * (follower - value) + value;
                }
                outputChannel[j] = follower;
            }
            followers[i] = follower;
        }
    },

    toString: function() {
        return ('Amplitude');
    }
});


/**
 * @depends ../core/PassThroughNode.js
 */

var BadValueDetector = new Class({
    Extends: PassThroughNode,
    initialize: function(audiolet, callback) {
        PassThroughNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.linkNumberOfOutputChannels(0, 0);

        if (callback) {
            this.callback = callback;
        }
    },

    // Override me
    callback: function(value, channel, index) {
        console.error(value + " detected at channel " + channel + " index "
                      + index);
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Bad Value Detector';
    }
});


/**
 * @depends BiquadFilter.js
 */

// Maths from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
var BandPassFilter = new Class({
    Extends: BiquadFilter,
    initialize: function(audiolet, frequency) {
        BiquadFilter.prototype.initialize.apply(this, [audiolet, frequency]);
    },

    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency /
                 this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = alpha;
        this.b1 = 0;
        this.b2 = -alpha;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    toString: function() {
        return 'Band Pass Filter';
    }
});

/**
 * @depends BiquadFilter.js
 */

// Maths from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
var BandRejectFilter = new Class({
    Extends: BiquadFilter,
    initialize: function(audiolet, frequency) {
        BiquadFilter.prototype.initialize.apply(this, [audiolet, frequency]);
    },

    calculateCoefficients: function(frequency) {
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
    },

    toString: function() {
        return 'Band Reject Filter';
    }
});

/**
 * @depends ../core/AudioletNode.js
 */

var BufferPlayer = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, buffer, playbackRate, startPosition, loop) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 3, 1]);
        this.buffer = buffer;
        this.setNumberOfOutputChannels(0, this.buffer.numberOfChannels);
        this.position = startPosition || 0;
        this.playbackRate = new AudioletParameter(this, 0, playbackRate || 1);
        this.restartTrigger = new AudioletParameter(this, 1, 0);
        this.startPosition = new AudioletParameter(this, 2, startPosition || 0);
        this.loop = new AudioletParameter(this, 3, loop || 0);

        this.restartTriggerOn = false;
        this.playing = true;
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return ('Buffer player');
    }
});


/**
 * @depends ../core/AudioletNode.js
 */

var CombFilter = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, maximumDelayTime, delayTime, decayTime) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 3, 1]);
        this.linkNumberOfOutputChannels(0, 0);
        this.maximumDelayTime = maximumDelayTime;
        this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
        this.decayTime = new AudioletParameter(this, 2, decayTime);
        var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
        this.buffers = [];
        this.readWriteIndex = 0;
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Comb Filter';
    }
});


/**
 * @depends ../core/AudioletNode.js
 */

var CrossFade = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, position) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 3, 1]);
        this.linkNumberOfOutputChannels(0, 0);
        this.position = new AudioletParameter(this, 2, position || 0.5);
    },

    generate: function(inputBuffers, outputBuffers) {
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
            var scaledPosition = position * Math.PI / 2;
            // TODO: Use sine/cos tables?
            var gainA = Math.cos(scaledPosition);
            var gainB = Math.sin(scaledPosition);

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
    },

    toString: function() {
        return 'Cross Fader';
    }
});

/**
 * @depends ../core/AudioletNode.js
 */

var DampedCombFilter = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, maximumDelayTime, delayTime, decayTime,
                         damping) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 4, 1]);
        this.linkNumberOfOutputChannels(0, 0);
        this.maximumDelayTime = maximumDelayTime;
        this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
        this.decayTime = new AudioletParameter(this, 2, decayTime);
        this.damping = new AudioletParameter(this, 3, damping);
        var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
        this.buffers = [];
        this.readWriteIndex = 0;
        this.filterStore = 0;
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Damped Comb Filter';
    }
});


/**
 * @depends ../core/AudioletNode.js
 */

var Delay = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, maximumDelayTime, delayTime) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);
        this.linkNumberOfOutputChannels(0, 0);
        this.maximumDelayTime = maximumDelayTime;
        this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
        var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
        this.buffers = [];
        this.readWriteIndex = 0;
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Delay';
    }
});


/**
 * @depends ../core/AudioletNode.js
 */

var DiscontinuityDetector = new Class({
    Extends: PassThroughNode,
    initialize: function(audiolet, threshold, callback) {
        PassThroughNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.linkNumberOfOutputChannels(0, 0);

        this.threshold = threshold || 0.2;
        if (callback) {
            this.callback = callback;
        }
        this.lastValues = [];

    },

    // Override me
    callback: function(size, channel, index) {
        console.error("Discontinuity of " + size + " detected on channel " +
                      channel + " index " + index);
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Discontinuity Detector';
    }
});


/**
 * @depends ../core/AudioletNode.js
 */

var Gain = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, gain) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);
        this.linkNumberOfOutputChannels(0, 0);
        this.gain = new AudioletParameter(this, 1, gain || 1);
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return ('Gain');
    }
});


/**
 * @depends BiquadFilter.js
 */

// Maths from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
var HighPassFilter = new Class({
    Extends: BiquadFilter,
    initialize: function(audiolet, frequency) {
        BiquadFilter.prototype.initialize.apply(this, [audiolet, frequency]);
    },

    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency /
                 this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = (1 + cosw0) / 2;
        this.b1 = - (1 + cosw0);
        this.b2 = this.b1;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    toString: function() {
        return 'High Pass Filter';
    }
});

/**
 * @depends ../core/AudioletNode.js
 */
/*
var Lag = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, value, lagTime) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);
        this.value = new AudioletParameter(this, 0, value || 0);
        this.lag = new AudioletParameter(this, 1, lagTime || 1);
    },

    generate: function(inputBuffers, outputBuffers) {
        var outputBuffer = outputBuffers[0];

        var lagParameter = this.lag;
        var lag, lagChannel;
        if (lagParameter.isStatic()) {
            lag = lagParameter.getValue();
        }
        else {
            lagChannel = lagParameter.getChannel();
        }

        var bufferLength = outputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            if (lagChannel) {
                lag = lagChannel[i];
            }

            for (var j = 0; j < numberOfChannels; j++) {
                var inputChannel = inputChannels[j];
                var outputChannel = outputChannels[j];
                var buffer = buffers[j];
                outputChannel[i] = buffer[readWriteIndex];
                buffer[readWriteIndex] = inputChannel[i];
            }

            readWriteIndex += 1;
            if (readWriteIndex >= delayTime) {
                readWriteIndex = 0;
            }
        }
        this.readWriteIndex = readWriteIndex;
    },

    toString: function() {
        return 'Delay';
    }
});
*/


/**
 * @depends ../core/AudioletNode.js
 */

var LinearCrossFade = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, position) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 3, 1]);
        this.linkNumberOfOutputChannels(0, 0);
        this.position = new AudioletParameter(this, 2, position || 0.5);
    },

    generate: function(inputBuffers, outputBuffers) {
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

            var gainA = position;
            var gainB = 1 - position;

            var numberOfChannels = inputBufferA.numberOfChannels;
            for (var j = 0; j < numberOfChannels; j++) {
                var inputChannelA = inputChannelsA[j];
                var inputChannelB = inputChannelsB[j];
                var outputChannel = outputChannels[j];

                outputChannel[i] = inputChannelA[i] * gainA +
                                   inputChannelB[i] * gainB;
            }
        }
    },

    toString: function() {
        return 'Linear Cross Fader';
    }
});

/**
 * @depends BiquadFilter.js
 */

// Maths from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
var LowPassFilter = new Class({
    Extends: BiquadFilter,
    initialize: function(audiolet, frequency) {
        BiquadFilter.prototype.initialize.apply(this, [audiolet, frequency]);
    },

    calculateCoefficients: function(frequency) {
        var w0 = 2 * Math.PI * frequency /
                 this.audiolet.device.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = (1 - cosw0) / 2;
        this.b1 = 1 - cosw0;
        this.b2 = this.b1;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    },

    toString: function() {
        return 'Low Pass Filter';
    }
});

/**
 * @depends ../core/AudioletNode.js
 */

var MulAdd = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, mul, add) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 3, 1]);
        this.linkNumberOfOutputChannels(0, 0);
        this.mul = new AudioletParameter(this, 1, mul || 1);
        this.add = new AudioletParameter(this, 2, add || 0);
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Multiplier/Adder';
    }
});


/**
 * @depends ../core/AudioletNode.js
 */

var Pan = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);
        // Hardcode two output channels
        this.setNumberOfOutputChannels(0, 2);
        this.pan = new AudioletParameter(this, 1, 0.5);
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Stereo Panner';
    }
});

/**
 * @depends Envelope.js
 */
var PercussiveEnvelope = new Class({
    Extends: Envelope,
    initialize: function(audiolet, gate, attack, release, onComplete) {
        var levels = [0, 1, 0];
        var times = [attack, release];
        Envelope.prototype.initialize.apply(this, [audiolet, gate, levels,
                                                   times, null, onComplete]);
    },

    toString: function() {
        return 'Percussive Envelope';
    }
});



/**
 * @depends ../core/AudioletGroup.js
 */

// Schroder/Moorer Reverb Unit based on Freeverb
// https://ccrma.stanford.edu/~jos/pasp/Freeverb.html has a good description
// of how it all works

var Reverb = new Class({
    Extends: AudioletGroup,

    // Constants
    initialMix: 0.33,
    fixedGain: 0.015,
    initialDamping: 0.5,
    scaleDamping: 0.4,
    initialRoom: 0.5,
    scaleRoom: 0.28,
    offsetRoom: 0.7,

    // Parameters: for 44.1k or 48k
    combTuning: [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617],
    allPassTuning: [556, 441, 341, 225],

    initialize: function(audiolet, mix, roomSize, damping) {
        AudioletGroup.prototype.initialize.apply(this, [audiolet, 4, 1]);

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
        this.inputs[1].connect(this.mixer, 0, 1);

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
    },

    toString: function() {
        return 'Reverb';
    }

});

// Converts a feedback gain multiplier to a 60db decay time
var FeedbackGainToDecayTime = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, delayTime) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.delayTime = delayTime;
        this.lastFeedbackGain = null;
        this.decayTime = null;
    },

    generate: function(inputBuffers, outputBuffers) {
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
    }
});

/**
 * @depends ../core/AudioletNode.js
 */
var TableLookupOscillator = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, table, frequency) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.table = table;
        this.frequency = new AudioletParameter(this, 0, frequency || 440);
        this.phase = 0;
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Table Lookup Oscillator';
    }
});


/**
 * @depends TableLookupOscillator.js
 */
var Saw = new Class({
    Extends: TableLookupOscillator,
    initialize: function(audiolet, frequency) {
        TableLookupOscillator.prototype.initialize.apply(this, [audiolet,
                                                                Saw.TABLE,
                                                                frequency]);
    },

    toString: function() {
        return 'Saw';
    }
});

Saw.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Saw.TABLE.push(((((i - 4096) / 8192) % 1) + 1) % 1 * 2 - 1);
}


/**
 * @depends TableLookupOscillator.js
 */
var Sine = new Class({
    Extends: TableLookupOscillator,
    initialize: function(audiolet, frequency) {
        TableLookupOscillator.prototype.initialize.apply(this, [audiolet,
                                                                Sine.TABLE,
                                                                frequency]);
    },

    toString: function() {
        return 'Sine';
    }
});

Sine.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Sine.TABLE.push(Math.sin(i * 2 * Math.PI / 8192));
}


/**
 * @depends ../core/AudioletNode.js
 */

var SoftClip = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.linkNumberOfOutputChannels(0, 0);
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return ('SoftClip');
    }
});


/**
 * @depends TableLookupOscillator.js
 */
var Square = new Class({
    Extends: TableLookupOscillator,
    initialize: function(audiolet, frequency) {
        TableLookupOscillator.prototype.initialize.apply(this, [audiolet,
                                                                Square.TABLE,
                                                                frequency]);
    },

    toString: function() {
        return 'Square';
    }
});

Square.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Square.TABLE.push(((i - 4096) / 8192) < 0 ? 1 : -1);
}



/**
 * @depends ../core/AudioletNode.js
 */

var Tanh = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.linkNumberOfOutputChannels(0, 0);
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return ('Tanh');
    }
});


/**
 * @depends TableLookupOscillator.js
 */
var Triangle = new Class({
    Extends: TableLookupOscillator,
    initialize: function(audiolet, frequency) {
        TableLookupOscillator.prototype.initialize.apply(this, [audiolet,
                                                                Triangle.TABLE,
                                                                frequency]);
    },

    toString: function() {
        return 'Triangle';
    }
});

Triangle.TABLE = [];
for (var i = 0; i < 8192; i++) {
    // Smelly, but looks right...
    Triangle.TABLE.push(Math.abs(((((i - 2048) / 8192) % 1) + 1) % 1 * 2 - 1) * 2 - 1);
}


/**
 * @depends ../core/AudioletNode.js
 */

var TriggerControl = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, trigger) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 0, 1]);
        this.trigger = new AudioletParameter(this, null, trigger || 0);
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'Trigger Control';
    }
});

/**
 * @depends ../core/AudioletNode.js
 */

var UpMixer = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, outputChannels) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.outputChannels = outputChannels;
        this.outputs[0].numberOfChannels = outputChannels;
    },

    generate: function(inputBuffers, outputBuffers) {
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
    },

    toString: function() {
        return 'UpMixer';
    }
});


/**
 * @depends ../core/AudioletNode.js
 */
var WhiteNoise = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 0, 1]);
    },

    generate: function(inputBuffers, outputBuffers) {
        var buffer = outputBuffers[0];
        var channel = buffer.getChannelData(0);

        // Processing loop
        var bufferLength = buffer.length;
        for (var i = 0; i < bufferLength; i++) {
            channel[i] = Math.random() * 2 - 1;
        }
    },

    toString: function() {
        return 'White Noise';
    }
});


var Pattern = new Class({
    initialize: function() {
    },

    next: function() {
        return null;
    },

    valueOf: function(item) {
        if (instanceOf(item, Pattern)) {
           return (item.next());
        }
        else {
            return (item);
        }
    },

    reset: function() {
    }
});


/**
 * @depends Pattern.js
 */

var PArithmetic = new Class({
    Extends: Pattern,
    initialize: function(start, step, repeats) {
        Pattern.prototype.initialize.apply(this);
        this.start = start;
        this.value = start;
        this.step = step;
        this.repeats = repeats;
        this.position = 0;
    },

    next: function() {
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
    },

    reset: function() {
        this.value = this.start;
        this.position = 0;
        if (instanceOf(this.step, Pattern)) {
            this.step.reset();
        }
    }
});

var Pseries = PArithmetic;


/**
 * @depends Pattern.js
 */

var PChoose = new Class({
    Extends: Pattern,
    initialize: function(list, repeats) {
        Pattern.prototype.initialize.apply(this);
        this.list = list;
        this.repeats = repeats || 1;
        this.position = 0;
    },

    next: function() {
        var returnValue;
        if (this.position < this.repeats) {
            var index = Math.floor(Math.random() * this.list.length);
            var item = this.list[index];
            var value = this.valueOf(item);
            if (value != null) {
                if (!instanceOf(item, Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                if (instanceOf(item, Pattern)) {
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
    },

    reset: function() {
        this.position = 0;
        for (var i = 0; i < this.list.length; i++) {
            var item = this.list[i];
            if (instanceOf(item, Pattern)) {
                item.reset();
            }
        }
    }
});
var Prand = PChoose;


/**
 * @depends Pattern.js
 */

var PGeometric = new Class({
    Extends: Pattern,
    initialize: function(start, step, repeats) {
        Pattern.prototype.initialize(this);
        this.start = start;
        this.value = start;
        this.step = step;
        this.repeats = repeats;
        this.position = 0;
    },

    next: function() {
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
    },

    reset: function() {
        this.value = this.start;
        this.position = 0;
        if (instanceOf(this.step, Pattern)) {
            this.step.reset();
        }
    }
});
var Pgeom = PGeometric;


/**
 * @depends Pattern.js
 */

var PProxy = new Class({
    Extends: Pattern,
    initialize: function(pattern) {
        Pattern.prototype.initialize(this);
        if (pattern) {
            this.pattern = pattern;
        }
    },

    next: function() {
        var returnValue;
        if (this.pattern) {
            var returnValue = this.pattern.next();
        }
        else {
            returnValue = null;
        }
        return returnValue;
    }
});
var Pp = PProxy;


/**
 * @depends Pattern.js
 */

var PRandom = new Class({
    Extends: Pattern,
    initialize: function(low, high, repeats) {
        Pattern.prototype.initialize(this);
        this.low = low;
        this.high = high;
        this.repeats = repeats;
        this.position = 0;
    },

    next: function() {
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
    },

    reset: function() {
        this.position = 0;
    }
});
var Pwhite = PRandom;


/**
 * @depends Pattern.js
 */

var PSequence = new Class({
    Extends: Pattern,
    initialize: function(list, repeats, offset) {
        Pattern.prototype.initialize(this);
        this.list = list;
        this.repeats = repeats || 1;
        this.position = 0;
        this.offset = offset || 0;
    },

    next: function() {
        var returnValue;
        if (this.position < this.repeats * this.list.length) {
            var index = (this.position + this.offset) % this.list.length;
            var item = this.list[index];
            var value = this.valueOf(item);
            if (value != null) {
                if (!instanceOf(item, Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                if (instanceOf(item, Pattern)) {
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
    },

    reset: function() {
        this.position = 0;
        for (var i = 0; i < this.list.length; i++) {
            var item = this.list[i];
            if (instanceOf(item, Pattern)) {
                item.reset();
            }
        }
    }
});
var Pseq = PSequence;


/**
 * @depends Pattern.js
 */

var PSeries = new Class({
    Extends: Pattern,
    initialize: function(list, repeats, offset) {
        Pattern.prototype.initialize(this);
        this.list = list;
        this.repeats = repeats || 1;
        this.position = 0;
        this.offset = offset || 0;
    },

    next: function() {
        var returnValue;
        if (this.position < this.repeats) {
            var index = (this.position + this.offset) % this.list.length;
            var item = this.list[index];
            var value = this.valueOf(item);
            if (value != null) {
                if (!instanceOf(item, Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                if (instanceOf(item, Pattern)) {
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
    },

    reset: function() {
        this.position = 0;
        for (var i = 0; i < this.list.length; i++) {
            var item = this.list[i];
            if (instanceOf(item, Pattern)) {
                item.reset();
            }
        }
    }
});
var Pser = PSeries;


/**
 * @depends Pattern.js
 * @depends PSequence.js
 */

var PShuffle = new Class({
    Extends: Pattern,
    Implements: PSequence, // Use the same next function
    initialize: function(list, repeats) {
        Pattern.prototype.initialize(this);
        this.list = [];
        // Shuffle values into new list
        while (list.length) {
            var index = Math.floor(Math.random() * list.length);
            var value = list.splice(index, 1);
            this.list.push(value);
        }
        this.repeats = repeats;
        this.position = 0;
    }
});

var Pshuffle = PShuffle;


/**
 * @depends Pattern.js
 */

var PWeightedChoose = new Class({
    Extends: Pattern,
    initialize: function() {
        Pattern.prototype.initialize(this);
    },

    next: function() {
    }
});

Pwrand = PWeightedChoose;

var Scale = new Class({
    initialize: function(degrees, tuning) {
        this.degrees = degrees;
        this.tuning = tuning || new EqualTemperamentTuning(12);
    },

    getFrequency: function(degree, rootFrequency, octave) {
        var frequency = rootFrequency;
        octave += Math.floor(degree / this.degrees.length);
        degree %= this.degrees.length;
        frequency *= Math.pow(this.tuning.octaveRatio, octave);
        frequency *= this.tuning.ratios[this.degrees[degree]];
        return frequency;
    }
});

/**
 * @depends Scale.js
 */
var MajorScale = new Class({
    Extends: Scale,
    initialize: function() {
        Scale.prototype.initialize.apply(this, [[0, 2, 4, 5, 7, 9, 11]]);
    }
});

/**
 * @depends Scale.js
 */
var MinorScale = new Class({
    Extends: Scale,
    initialize: function() {
        Scale.prototype.initialize.apply(this, [[0, 2, 3, 5, 7, 8, 10]]);
    }
});

var Tuning = new Class({
    initialize: function(semitones, octaveRatio) {
        this.semitones = semitones;
        this.octaveRatio = octaveRatio || 2;
        this.ratios = [];
        var tuningLength = this.semitones.length;
        for (var i=0; i<tuningLength; i++) {
            this.ratios.push(Math.pow(2, i / tuningLength));
        }
    }
});

/**
 * @depends Tuning.js
 */
var EqualTemperamentTuning = new Class({
    Extends: Tuning,
    initialize: function(pitchesPerOctave) {
        var semitones = [];
        for (var i=0; i<pitchesPerOctave; i++) {
            semitones.push(i);
        }
        Tuning.prototype.initialize.apply(this, [semitones, 2]);
    }
});

