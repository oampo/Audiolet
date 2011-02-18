var AudioletBuffer = new Class({
    initialize: function(numberOfChannels, length, sampleRate) {
        this.numberOfChannels = numberOfChannels;
        this.sampleRate = sampleRate;
        this.length = length;

        this.duration = this.length / this.sampleRate;

        this.data = new Float32Array(numberOfChannels * length);
        this.unsliced_data = this.data;
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
