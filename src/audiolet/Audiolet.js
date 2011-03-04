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
                for (var j = 0; j < numberOfConnections; j++) {
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
        this.overflow = null;
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
            this.writePosition += numSamplesWritten;
            if (numSamplesWritten < this.overflow.length) {
                // Not all the data was written, saving the tail for writing
                // the next time fillBuffer is called
                this.overflow = this.overflow.subarray(numSamplesWritten);
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
            this.channels.push(new Float32Array(numberOfChannels * length));
        }

        this.unsliced_channels = [];
        for (var i = 0; i < this.numberOfChannels; i++) {
            this.unsliced_channels.push(this.channels[i]);
        }

        this.isEmpty = false;
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
            var channel1 = this.getChannelData(i).subarray(outputOffset,
                                                           outputOffset +
                                                           length);
            var channel2 = buffer.getChannelData(i).subarray(inputOffset,
                                                             inputOffset +
                                                             length);
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
        for (var i = 0; i < numberOfChannels; i++) {
            if (length > this.length) {
                var channel = this.channels[i];
                this.channels[i] = new Float32Array(length);
                if (!lazy && channel) {
                    this.channels[i].set(channel, offset);
                }
                this.unsliced_channels[i] = this.channels[i];
            }
            else {
                this.channels[i] = this.channels[i].subarray(offset, offset +
                                                                     length);
            }
        }
        this.numberOfChannels = numberOfChannels;
        this.length = length;
    },

    push: function(buffer) {
        var bufferLength = buffer.length;
        this.resize(this.numberOfChannels, this.length + bufferLength);
        this.setSection(buffer, bufferLength, 0, this.length - bufferLength);
    },

    pop: function(buffer) {
        var bufferLength = buffer.length;
        var offset = bufferLength - length;
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
                                                     Math.pow(2, 12));
        audiolet.blockSizeLimiter = this.blockSizeLimiter; // Shortcut

        this.upMixer = new UpMixer(audiolet, this.device.numberOfChannels);

        this.inputs[0].connect(this.blockSizeLimiter);
        this.blockSizeLimiter.connect(this.scheduler);
        this.scheduler.connect(this.upMixer);
        this.upMixer.connect(this.device);
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
    else if (typeof AudioContext != 'undefined') {
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

    setValue: function(value) {
        this.value = value;
    },

    getValue: function(index) {
        var input = this.input;
        if (input && input.connectedFrom.length) {
            return (input.buffer.channels[0][index]);
        }
        else {
            return (this.value);
        }
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

        var emptyBuffer = new AudioletBuffer(1, 1);
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
    },

    remove: function() {
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
            this.updateClock(event.time);


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

        this.sampleRate = sampleRate || 44100.0;
        this.numberOfChannels = numberOfChannels || 2;
        this.bufferSize = bufferSize || 8192;

        // AudioContext is called webkitAudioContext in the current
        // implementation, so look for either
        var AudioContext, webkitAudioContext;
        AudioContext = AudioContext || webkitAudioContext;
        this.context = new AudioContext(this.sampleRate);

        this.node = this.context.createJavaScriptAudioNode(this.bufferSize, 1,
                                                           1);

        this.node.onprocessaudio = this.tick;
        this.writePosition = 0;
    },

    tick: function(event) {
        var buffer = event.outputBuffer[0];
        var samplesNeeded = buffer.length;
        AudioletNode.prototype.tick.apply(this, [samplesNeeded]);
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
            var gate = gateParameter.getValue(i);

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
        var lastFrequency = this.lastFrequency;

        var a0 = this.a0;
        var a1 = this.a1;
        var a2 = this.a2;
        var b0 = this.b0;
        var b1 = this.b1;
        var b2 = this.b2;

        var bufferLength = outputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            var frequency = frequencyParameter.getValue(i);
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

var Delay = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, maximumDelayTime, delayTime) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);
        this.maximumDelayTime = maximumDelayTime;
        this.delayTime = new AudioletParameter(this, 1, delayTime || 1);
        var bufferSize = maximumDelayTime * this.audiolet.device.sampleRate;
        this.buffer = new Float32Array(Math.floor(bufferSize));
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
        var delayTimeParameter = this.delayTime;
        var buffer = this.buffer;
        var readWriteIndex = this.readWriteIndex;
        var sampleRate = this.audiolet.device.sampleRate;

        var inputChannel = inputBuffer.getChannelData(0);
        var outputChannel = outputBuffer.getChannelData(0);
        var bufferLength = inputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            var delayTime = delayTimeParameter.getValue(i) * sampleRate;
            delayTime = Math.floor(delayTime);
            outputChannel[i] = buffer[readWriteIndex];
            buffer[readWriteIndex] = inputChannel[i];
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
    callback: function() {
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];

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
                        this.callback();
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
        var gain = this.gain;

        var numberOfChannels = inputBuffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var inputChannel = inputBuffer.getChannelData(i);
            var outputChannel = outputBuffer.getChannelData(i);
            var bufferLength = inputBuffer.length;
            for (var j = 0; j < bufferLength; j++) {
                outputChannel[j] = inputChannel[j] * gain.getValue(j);
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

        // Local processing variables
        var mulParameter = this.mul;
        var addParameter = this.add;

        var numberOfChannels = inputBuffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var inputChannel = inputBuffer.getChannelData(i);
            var outputChannel = outputBuffer.getChannelData(i);
            var bufferLength = inputBuffer.length;
            for (var j = 0; j < bufferLength; j++) {
                var mul = mulParameter.getValue(j);
                var add = addParameter.getValue(j);
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
        var pan = this.pan;

        var bufferLength = outputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            var scaledPan = this.pan.getValue(i) * Math.PI / 2;
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
        var frequency = this.frequency;

        // Processing loop
        var bufferLength = buffer.length;
        for (var i = 0; i < bufferLength; i++) {
            var step = frequency.getValue(i) * tableSize / sampleRate;
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
        var bufferLength = buffer.length;
        for (var i = 0; i < bufferLength; i++) {
            var trigger = triggerParameter.getValue(i);

            if (trigger) {
                channel[i] = 1;
                triggerParameter.setValue(0);
            }
            else {
                channel[i] = 0;
            }
        }
    },

    toString: function() {
        return 'TriggerControl';
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

