var AudioletOutput = new Class({
    initialize: function(node, index) {
        this.node = node;
        this.index = index;
        this.connectedTo = [];
        // Minimum sized buffer, which we can resize from accordingly
        this.buffer = new AudioletBuffer(1, 0);
        // Buffers overflowing data if we are in a feedback loop
        this.overflow = new AudioletBuffer(1, 0);
        // Where overflow and regular buffer are concatenated if we are in a
        // feedback loop
        this.outputBuffer = new AudioletBuffer(1, 0);

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
    },

    getBuffer: function(length) {
        var buffer = this.buffer;
        if (buffer.length == length) {
            // Buffer not part of a feedback loop, so just return it
            return buffer;
        }
        else {
            // Buffer is part of a feedback loop, so we need to take care of
            // overflows and construct an output buffer
            var overflow = this.overflow;
            var outputBuffer = this.outputBuffer;

            if (outputBuffer.length == 0) {
                // First run through, so buffer will not hold any data.  Give
                // a buffer full of zeros
                var limiter = this.node.audiolet.blockSizeLimiter;
                buffer.resize(1, limiter.maximumBlockSize, true);
            }
            
            // Make the output buffer the correct size
            outputBuffer.resize(buffer.numberOfChannels, length, true);

            var overflowLength = overflow.length;
            var overflowSamples = Math.min(length, overflowLength);
            var remainingOverflow = overflow.length - overflowSamples;
            if (overflowSamples) {
                // Set the first part of the output from the overflow
                outputBuffer.setSection(overflow, overflowSamples);

                if (remainingOverflow) {
                    // Move any unused overflow to the start
                    overflow.setSection(overflow, remainingOverflow,
                                        overflowSamples, 0);
                }
            }
                                  
            var bufferSamples = length - overflowSamples;
            var remainingBuffer = buffer.length - bufferSamples;
            if (bufferSamples) {
                // Set the second part of the output from the buffer
                this.outputBuffer.setSection(this.buffer, bufferSamples, 0,
                                             overflowSamples);
            }

            // Resize the overflow to it's correct length
            overflow.resize(overflow.numberOfChannels,
                            remainingOverflow + remainingBuffer);
            if (remainingBuffer) {
                // Move any unused buffer to the start of the overflow
                overflow.setSection(buffer, remainingBuffer,
                                    bufferSamples, remainingOverflow);
            }
            return this.outputBuffer;
        }
    }
});

