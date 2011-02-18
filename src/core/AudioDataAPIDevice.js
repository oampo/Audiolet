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
        
        this.tick.periodical(1000 * this.bufferSize / this.sampleRate, this);
    },

    tick: function() {
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

        var outputPosition = this.output.mozCurrentSampleOffset();
        if (outputPosition == 0) {
            // Until the output starts ticking we ignore any samples written
            this.writePosition = 0;
        }
        var samplesNeeded = outputPosition +
                            (this.bufferSize * this.numberOfChannels) -
                            this.writePosition;
        // Seems to help stability - lob some extra samples in if the internal
        // buffer will become almost completely empty before we tick again
        if (samplesNeeded <= 0 && samplesNeeded >= -128) {
            samplesNeeded = this.bufferSize;
        }
        if (samplesNeeded > 0) {
            // Request some sound data from the callback function.
            AudioletNode.prototype.tick.apply(this, [samplesNeeded /
                                                     this.numberOfChannels]);
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

    getTime: function() {
        return this.output.mozCurrentSampleOffset() / this.numberOfChannels;
    }
});

