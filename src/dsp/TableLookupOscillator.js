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

