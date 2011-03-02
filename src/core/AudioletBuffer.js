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
