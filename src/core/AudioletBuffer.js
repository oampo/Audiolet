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
            var channel1 = this.unsliced_channels[i].subarray(outputOffset,
                                                              outputOffset +
                                                              length);
            var channel2 = buffer.unsliced_channels[i].subarray(inputOffset,
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
        for (var i = 0; i < numberOfChannels; i++) {
            if (length > this.length) {
                var channel = this.channels[i];
                this.channels[i] = new Float32Array(length);
                if (!lazy && channel) {
                    this.channels[i].set(channel, offset);
                }
                this.unsliced_channels[i] = this.channels[i];
                this.channelOffset = 0;
            }
            else {
                // Begin subarray-of-subarray fix
                this.channelOffset += offset;
                offset = this.channelOffset;
                this.channels[i] = this.unsliced_channels[i].subarray(offset,
                                                                      offset +
                                                                      length);
                // End subarray-of-subarray fix
                // Uncomment the following lines when subarray-of-subarray is
                // fixed
                //this.channels[i] = this.channels[i].subarray(offset, offset +
                //                                                     length);
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
    },

    // WAV and AIFF loading based on http://pastebin.com/XVptxYEC from
    // yuri & ccliffe
    load: function(path, async) {
        if (typeof async == 'undefined' || async == null) {
            async = true;
        }
        var request = new Request({
            url: path,
            async: async,
            onSuccess: function(data) {
                // TODO: Maybe should check header, rather than just believing
                // the extension
                var splitPath = path.split('.');
                var extension = splitPath[splitPath.length - 1].toLowerCase();
                if (extension == 'wav') {
                    this.loadWAVData(data);
                }
                else if (extension == 'aiff' || extension == 'aif') {
                    this.loadAIFFData(data);
                }
                else {
                    console.error('Cannot load .' + extension + ' files');
                }

            }.bind(this),

            onFailure: function(xhr) {
                console.error('Could not load', path);
            }.bind(this)
        });
        request.xhr.overrideMimeType('text/plain; charset=x-user-defined');
        request.get();
    },

    loadWAVData: function(data) {
        // TODO: More robust loading!
        // Ignore header - 12 bytes
        // fmt chunk
        // Ignore fmt - 4 bytes
        // Ignore length of fmt - 4 bytes
        // Ignore file encoding
        // Number of channels - 2 bytes
        var numberOfChannels = (data.charCodeAt(22) & 0xFF) |
                                ((data.charCodeAt(23) & 0xFF) << 8);
        // Ignore sample rate - 4 bytes
        // Ignore bytes/sec - 4 bytes
        // Ignore block align - 2 bytes
        // Ignore bitrate - 2 bytes

        // data chunk
        // Ignore data - 4 bytes
        // Data size - 4 bytes
        var length = (data.charCodeAt(40) & 0xFF) |
                     ((data.charCodeAt(41) & 0xFF) << 8) |
                     ((data.charCodeAt(42) & 0xFF) << 16) |
                     ((data.charCodeAt(43) & 0xFF) << 24);
        // 2 bytes per sample
        length /= 2 * numberOfChannels;
        this.resize(numberOfChannels, length);

        var offset = 44;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel = this.channels[i];
            for (var j = 0; j < length; j++) {
                var index = offset + (j * numberOfChannels + i) * 2;
                // Sample - 2 bytes
                var value = (data.charCodeAt(index) & 0xFF) |
                            ((data.charCodeAt(index + 1) & 0xFF) << 8);
                // Scale range from 0 to 2**16 -> -2**15 to 2**15
                if (value >= 0x8000) {
                    value |= ~0x7FFF;
                }
                // Scale range to -1 to 1
                channel[j] = value / 0x8000;
            }
        }
    },

    loadAIFFData: function(data) {
        // TODO: More robust loading!
        // Only loads 16 bit AIFF-Cs without comments, ignoring the sample rate
        // Ignore the header - 16 bytes
        // COMM Chunk
        // Ignore COMM - 4 bytes
        // Number of channels - 2 bytes
        var numberOfChannels = ((data.charCodeAt(20) & 0xFF) << 8) |
                                (data.charCodeAt(21) & 0xFF);
        // Number of samples - 4 bytes
        var length = ((data.charCodeAt(22) & 0xFF) << 24) |
                     ((data.charCodeAt(23) & 0xFF) << 16) |
                     ((data.charCodeAt(24) & 0xFF) << 8) |
                      (data.charCodeAt(25) & 0xFF);
        this.resize(numberOfChannels, length, true);

        // Ignore bitrate - 2 bytes
        // Ignore sample rate - 10 bytes

        // SSND Chunk
        // Ignore SSND - 4 bytes
        // Ignore chunk size - 4 bytes
        // Ignore offset - 4 bytes
        // Ignore block size - 4 bytes
        // Hope to hell that there isn't a comment - 0 bytes
        var offset = 54;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel = this.channels[i];
            for (var j = 0; j < length; j++) {
                var index = offset + (j * numberOfChannels + i) * 2;
                // Sample - 2 bytes
                var value = ((data.charCodeAt(index) & 0xFF) << 8) |
                             (data.charCodeAt(index + 1) & 0xFF);
                // Scale range from 0 to 2**16 -> -2**15 to 2**15
                if (value >= 0x8000) {
                    value |= ~0x7FFF;
                }
                // Scale range to -1 to 1
                channel[j] = value / 0x8000;
            }
        }
    }
});
