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

                inputBuffers.push(inputBuffer);
            }
            else {
                // If we don't have any connections give a single channel empty
                // buffer of the correct length
                var inputBuffer = input.buffer;
                inputBuffer.resize(1, length);
                inputBuffer.isEmpty = true;
                inputBuffers.push(inputBuffer);
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


/**
 * @depends AudioletNode.js
 */
var AbstractAudioletDevice = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 0]);
        this.audiolet = audiolet;
        this.numberOfChannels = this.audiolet.numberOfChannels;
        this.sampleRate = this.audiolet.sampleRate;
        this.bufferSize = this.audiolet.bufferSize;
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
    }
});


/**
 * @depends AbstractAudioletDevice.js
 */

var AudioDataAPIDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);
        this.output = new Audio();
        this.overflow = null;
        this.writePosition = 0;

        this.output.mozSetup(this.numberOfChannels, this.sampleRate);
        
        this.started = new Date().valueOf();
        this.autoLatency = true;
        this.bufferSize = this.sampleRate * 0.02;
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
            this.buffer.interleave();
            var buffer = this.buffer.data;

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
    }
});


var AudioletBuffer = new Class({
    initialize: function(numberOfChannels, length, sampleRate) {
        this.numberOfChannels = numberOfChannels;
        this.sampleRate = sampleRate;
        this.length = length;

        this.duration = this.length / this.sampleRate;

        this.data = new Float32Array(numberOfChannels * length);
        this.unsliced_data = this.data;

        this.isEmpty = false;
    },

    getChannelData: function(channel) {
        return (this.data.subarray(channel * this.length,
                               (channel + 1) * this.length));
    },


    set: function(buffer) {
        this.data.set(buffer.data);
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

    resize: function(numberOfChannels, length) {
        if (numberOfChannels * length > this.unsliced_data.length) {
            this.data = new Float32Array(numberOfChannels * length);
            this.unsliced_data = this.data;
        }
        else {
            var numberOfSamples = numberOfChannels * length;
            this.data = this.unsliced_data.subarray(0, numberOfSamples);
        }
        this.numberOfChannels = numberOfChannels;
        this.length = length;
    },

    interleave: function() {
        var numberOfSamples = this.numberOfChannels * this.length;
        var interleaved = new Float32Array(numberOfSamples);
        var leftChannel = this.getChannelData(0);
        var rightChannel = this.getChannelData(1);
        var length = this.length;
        for (var i = 0; i < length; i++) {
            interleaved[2 * i] = leftChannel[i];
            interleaved[2 * i + 1] = rightChannel[i];
        }
        this.data = interleaved;
    }
});

var AudioletGroup = new Class({
    initialize: function(audiolet, numberOfInputs, numberOfOutputs) {
        this.audiolet = audiolet;
        this.numberOfInputs = numberOfInputs;
        this.numberOfOutputs = numberOfOutputs;

        this.inputs = [];
        for (var i=0; i<numberOfInputs; i++) {
            this.inputs.push(new PassThroughNode(this.audiolet, 1, 1));
        }
        
        this.outputs = [];
        for (var i=0; i<numberOfOutputs; i++) {
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
        for (var i=0; i<numberOfInputs; i++) {
            this.inputs[i].remove();
        }

        for (var i=0; i<numberOfOutputs; i++) {
            this.outputs[i].remove();
        }
    }
});

/**
 * @depends AudioletGroup.js
 */

var AudioletDestination = new Class({
    Extends: AudioletGroup,
    initialize: function(audiolet) {
        AudioletGroup.prototype.initialize.apply(this, [audiolet, 1, 0]);

        this.device = new AudioletDevice(audiolet);
        this.scheduler = new Scheduler(audiolet);
        this.upMixer = new UpMixer(audiolet, audiolet.numberOfChannels);

        this.inputs[0].connect(this.scheduler);
        this.scheduler.connect(this.upMixer);
        this.upMixer.connect(this.device);
    }
});

function AudioletDevice(audiolet) {
    // Mozilla?
    var tmpAudio = new Audio();
    var haveAudioDataAPI = (typeof tmpAudio.mozSetup == 'function');
    tmpAudio = null;
    if (haveAudioDataAPI) {
        return (new AudioDataAPIDevice(audiolet));
    }
    // Webkit?
    else if (typeof AudioContext != 'undefined') {
        return (new WebAudioAPIDevice(audiolet));
    }
    else {
        return (new DummyDevice(audiolet));
    }
}


var AudioletInput = new Class({
    initialize: function(node, index) {
        this.node = node;
        this.index = index;
        this.connectedFrom = [];
        // Minimum sized buffer, which we can resize from accordingly
        this.buffer = new AudioletBuffer(1, 1, node.audiolet.sampleRate);
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
        return(this.connectedFrom.length > 0);
    }
});


var Audiolet = new Class({
    initialize: function(sampleRate, numberOfChannels, bufferSize) {
        this.sampleRate = sampleRate || 44100.0;
        this.numberOfChannels = numberOfChannels || 2;
        this.bufferSize = bufferSize || Math.pow(2, 14);
        
        this.output = new AudioletDestination(this);
        // Easy-access destination variables
        this.device = this.output.device;
        this.scheduler = this.output.scheduler;
    }
});


var AudioletOutput = new Class({
    initialize: function(node, index) {
        this.node = node;
        this.index = index;
        this.connectedTo = [];
        // Minimum sized buffer, which we can resize from accordingly
        this.buffer = new AudioletBuffer(1, 1, node.audiolet.sampleRate);

        this.linkedInput = null;
        this.numberOfChannels = 1;
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
        return(this.connectedTo.length > 0);
    },

    link: function(input) {
        this.linkedInput = input;
    },

    unlink: function() {
        this.linkedInput = null;
    },

    getNumberOfChannels: function() {
        if (this.linkedInput && this.linkedInput.isConnected()) {
            return(this.linkedInput.buffer.numberOfChannels);
        }
        return(this.numberOfChannels);
    }
});


var AudioletParameter = new Class({
    initialize: function(node, inputIndex, value) {
        this.node = node;
        if (typeof inputIndex != "undefined" && inputIndex != null) {
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
        if (input && input.isConnected()) {
            return(input.buffer.data[index]);
        }
        else {
            return(this.value);
        }
    }
});

/**
 * @depends AbstractAudioletDevice.js
 */

var DummyDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);
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
        for (var i=0; i<numberOfOutputs; i++) {
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
        return(outputBuffers);
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
        return(this.heap.length == 0);
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
            this.heap[position] = this.heap[childposition];
            position = childPosition;
            childPosition = 2 * position + 1;
        }
        this.heap[position] = newItem;
        siftDown(startPosition, position);
    },

    compare: function(a, b) {
        return (a < b);
    },
});

/**
 * @depends AudioletNode.js
 */

var Scheduler = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, bpm) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.outputs[0].link(this.inputs[0]);
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
        this.beatLength = 60 / this.bpm * this.audiolet.sampleRate;

        var emptyBuffer = new AudioletBuffer(1, 1);
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

            // Generate samples to take us to the event
            var timeToEvent = event.time - lastEventTime;
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
            lastEventTime = event.time;
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
        this.seconds = this.time * this.audiolet.sampleRate;
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
            for (var i=0; i<numberOfPatterns; i++) {
                var pattern = patterns[i];
                args.push(pattern.next());
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
            original = "subarray";
            shim = "slice";
        }
        else if (types[i].prototype.subarray === undefined) {
            original = "slice";
            shim = "subarray";
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
    initialize: function(audiolet) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);
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
    }
});


var Envelope = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, gate, numberOfInputs, onComplete) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1,
                                                       numberOfInputs]);
        this.gate = new AudioletParameter(this, 0, gate || 1);
        this.onComplete = onComplete;
    }
});

/**
 * @depends Envelope.js
 */
var ADSR = new Class({
    Extends: Envelope,
    initialize: function(audiolet, gate, attack, decay, sustain, release,
                         onComplete) {
        Envelope.prototype.initialize.apply(this, [audiolet, gate, 5,
                                                   onComplete]);
        this.on = false;
        this.stage = null;
        this.level = 0;

        this.attack = new AudioletParameter(this, 1, attack || 0.01);
        this.decay = new AudioletParameter(this, 2, decay || 0.3);
        this.sustain = new AudioletParameter(this, 3, sustain || 0.5);
        this.release = new AudioletParameter(this, 4, release || 1);

        this.attackDelta = null;
        this.releaseDelta = null;
    },

    generate: function(inputBuffers, outputBuffers) {
        var buffer = outputBuffers[0];
        var channel = buffer.getChannelData(0);

        var sampleRate = this.audiolet.sampleRate;

        var gateParameter = this.gate;
        var attackParameter = this.attack;
        var decayParameter = this.decay;
        var sustainParameter = this.sustain;
        var releaseParameter = this.release;

        var on = this.on;
        var stage = this.stage;
        var level = this.level;
        var onComplete = this.onComplete;

        var attackDelta = this.attackDelta;
        var releaseDelta = this.releaseDelta;

        var bufferLength = buffer.length;
        for (var i=0; i<bufferLength; i++) {
            var gate = gateParameter.getValue(i);
            
            if (!on && gate) {
                on = true;
                stage = ADSR.ATTACK;
                var attack = attackParameter.getValue(i);
                attackDelta = (1 - level)/(attack * sampleRate);
            }

            if (on && !gate) {
                on = false;
                stage = ADSR.RELEASE;
                var release = releaseParameter.getValue(i);
                releaseDelta = level/(release * sampleRate);
            }

            if (stage == ADSR.ATTACK) {
                // Attack phase
                level += attackDelta;
                if (level >= 1) {
                    level = 1;
                    stage = ADSR.DECAY;
                    var decay = decayParameter.getValue(i);
                    var sustain = sustainParameter.getValue(i);
                    decayDelta = (1 - sustain)/(decay * sampleRate);
                }
            }
            else if (stage == ADSR.DECAY) {
                level -= decayDelta;
                var sustain = sustainParameter.getValue(i);
                if (level <= sustain) {
                    level = sustain;
                    stage = ADSR.SUSTAIN;
                }
            }
            else if (stage == ADSR.RELEASE) {
                level -= releaseDelta;
                if (level <= 0) {
                    level = 0;
                    stage = null;
                    if (onComplete) {
                        onComplete();
                    }
                }
            }

            channel[i] = level;
        }
        this.on = on;
        this.stage = stage;
        this.level = level;

        this.attackDelta = attackDelta;
        this.releaseDelta = releaseDelta;
    }
});

ADSR.ATTACK = 0;
ADSR.DECAY = 1;
ADSR.SUSTAIN = 2;
ADSR.RELEASE = 3;

/**
 * @depends ../core/AudioletNode.js
 */

// Maths from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
var BiquadFilter = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, frequency) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);

        // Same number of output channels as input channels
        this.outputs[0].link(this.inputs[0]);

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
        for (var i=0; i<numberOfChannels; i++) {
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
            
            for (var j=0; j<numberOfChannels; j++) {
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
        var w0 = 2 * Math.PI *  frequency /
                 this.audiolet.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = 1 - alpha;
        this.b1 = -2 * cosw0;
        this.b2 = 1 + alpha;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
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
        var w0 = 2 * Math.PI *  frequency /
                 this.audiolet.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = alpha;
        this.b1 = 0;
        this.b2 = -alpha;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
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
        var w0 = 2 * Math.PI *  frequency /
                 this.audiolet.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = 1;
        this.b1 = -2 * cosw0;
        this.b2 = 1;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
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
        this.buffer = new Float32Array(maximumDelayTime *
                                       this.audiolet.sampleRate);
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
        var sampleRate = this.audiolet.sampleRate;

        var inputChannel = inputBuffer.getChannelData(0);
        var outputChannel = outputBuffer.getChannelData(0);
        var bufferLength = inputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            var delayTime = delayTimeParameter.getValue(i) * sampleRate;
            outputChannel[i] = buffer[readWriteIndex];
            buffer[readWriteIndex] = inputChannel[i];
            readWriteIndex = (readWriteIndex + 1) % delayTime;
        }
        this.readWriteIndex = readWriteIndex;
    }
});


/**
 * @depends ../core/AudioletNode.js
 */

var Gain = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, gain) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);
        this.outputs[0].link(this.inputs[0]);
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
                outputChannel[j] = inputChannel[j] * gain.getValue(i);
            }
        }
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
        var w0 = 2 * Math.PI *  frequency /
                 this.audiolet.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = (1 + cosw0) / 2;
        this.b1 = - (1 + cosw0);
        this.b2 = this.b1;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
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
        var w0 = 2 * Math.PI *  frequency /
                 this.audiolet.sampleRate;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = sinw0 / (2 / Math.sqrt(2));

        this.b0 = (1 - cosw0) / 2;
        this.b1 = 1 - cosw0;
        this.b2 = this.b1;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cosw0;
        this.a2 = 1 - alpha;
    }
});

/**
 * @depends ../core/AudioletNode.js
 */

var MulAdd = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, mul, add) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 3, 1]);
        this.outputs[0].link(this.inputs[0]);
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
        this.outputs[0].numberOfChannels = 2;
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
    }
});

/**
 * @depends Envelope.js
 */
var Percussive = new Class({
    Extends: Envelope,
    initialize: function(audiolet, gate, attack, decay, sustain, release,
                         onComplete) {
        Envelope.prototype.initialize.apply(this, [audiolet, gate, 3,
                                                   onComplete]);
        this.canTrigger = true;
        this.stage = null;
        this.level = 0;

        this.attack = new AudioletParameter(this, 1, attack || 0.01);
        this.release = new AudioletParameter(this, 2, release || 1);

        this.attackDelta = null;
        this.releaseDelta = null;
    },

    generate: function(inputBuffers, outputBuffers) {
        var buffer = outputBuffers[0];
        var channel = buffer.getChannelData(0);

        var sampleRate = this.audiolet.sampleRate;

        var gateParameter = this.gate;
        var attackParameter = this.attack;
        var releaseParameter = this.release;

        var canTrigger = this.canTrigger;
        var stage = this.stage;
        var level = this.level;
        var onComplete = this.onComplete;

        var attackDelta = this.attackDelta;
        var releaseDelta = this.releaseDelta;

        var bufferLength = buffer.length;
        for (var i=0; i<bufferLength; i++) {
            var gate = gateParameter.getValue(i);
            
            if (canTrigger && gate) {
                stage = ADSR.ATTACK;
                var attack = attackParameter.getValue(i);
                attackDelta = (1 - level)/(attack * sampleRate);
                canTrigger = false;
            }

            if (!gate) {
                canTrigger = true;
            }

            if (stage == ADSR.ATTACK) {
                // Attack phase
                level += attackDelta;
                if (level >= 1) {
                    level = 1;
                    stage = ADSR.RELEASE;
                    releaseDelta = 1/(release * sampleRate);
                }
            }

            else if (stage == ADSR.RELEASE) {
                level -= releaseDelta;
                if (level <= 0) {
                    level = 0;
                    stage = null;
                    if (onComplete) {
                        onComplete();
                    }
                }
            }

            channel[i] = level;
        }
        this.canTrigger = canTrigger;
        this.stage = stage;
        this.level = level;

        this.attackDelta = attackDelta;
        this.releaseDelta = releaseDelta;
    }
});

Percussive.ATTACK = 0;
Percussive.RELEASE = 1;

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
        var sampleRate = this.audiolet.sampleRate;
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
    }
});

Triangle.TABLE = [];
for (var i = 0; i < 8192; i++) {
    // Smelly, but looks right...
    Triangle.TABLE.push(Math.abs(((((i - 2048) / 8192) % 1) + 1) % 1* 2 - 1) * 2 - 1);
}


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
    }
});


var Pattern = new Class({
    initialize: function() {
    },

    next: function() {
        return null;
    },

    value: function(item) {
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
        this.value = start;
        this.step = step;
        this.repeats = repeats;
        this.position = 0;
    },

    next: function() {
        var returnValue;
        if (this.position < this.repeats) {
            var step = this.value(this.step);
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
            var value = this.value(item);
            if (value != null) {
                if (!instanceOf(item, Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                this.position += 1;
                returnValue = this.next();
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
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
        this.value = start;
        this.step = step;
        this.repeats = repeats;
        this.position = 0;
    },

    next: function() {
        var returnValue;
        if (this.position < this.repeats) {
            var step = this.value(this.step);
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
            var low = this.value(this.low);
            var high = this.value(this.high);
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
            var value = this.value(item);
            if (value != null) {
                if (!instanceOf(item, Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                this.position += 1;
                returnValue = this.next();
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
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
            var value = this.value(item);
            if (value != null) {
                if (!instanceOf(item, Pattern)) {
                    this.position += 1;
                }
                returnValue = value;
            }
            else {
                this.position += 1;
                returnValue = this.next();
            }
        }
        else {
            returnValue = null;
        }
        return (returnValue);
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

