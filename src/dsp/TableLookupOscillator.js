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

