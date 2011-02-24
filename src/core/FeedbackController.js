/**
 * @depends AudioletNode.js
 */

var FeedbackController = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.lastTickSize = null;
        this.overflowSize = 0;
    },


    tick: function(length, timestamp) {
        if (this.lastTickSize == null) {
            // First tick, just do a normal tick
            AudioletNode.prototype.tick.apply(this, [length, timestamp]);
            this.lastTickSize = length;
            return;
        }

        var samplesAvailable = this.lastTickSize + this.overflowSize;
        if (length < samplesAvailable) {
            // Enough samples from the last tick and buffered, so just tick
            // and recalculate any overflow
            AudioletNode.prototype.tick.apply(this, [length, timestamp]);
            this.lastTickSize = length;
            this.overflowSize = samplesAvailable - length;
        }
        else {
            // Not enough samples available, so we will have to do it in blocks
            // of size samplesAvailable
            var samplesGenerated = 0;
            var outputBuffers = null;
            while (samplesGenerated < length) {
                var samplesNeeded;
                // If length does not split exactly into the sample size,
                // then do the small block size first, so at the end we still
                // have a lastTickSize equal to samplesAvailable
                var smallBlockSize = length % samplesAvailable;
                if (samplesGenerated == 0 && smallBlockSize) {
                    samplesNeeded = smallBlockSize;
                }
                else {
                    samplesNeeded = samplesAvailable;
                }
                
                this.tickParents(samplesNeeded, timestamp + samplesGenerated);

                var inputBuffers = this.createInputBuffers(samplesNeeded);
                if (!outputBuffers) {
                    outputBuffers = this.createOutputBuffers(length);
                }
                this.generate(inputBuffers, outputBuffers, samplesGenerated);

                samplesGenerated += samplesNeeded;
                this.lastTickSize = samplesNeeded;
                this.overflowSize = 0;
            }
        }
    },

    generate: function(inputBuffers, outputBuffers, offset) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];
        if (inputBuffer.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }
        outputBuffer.setSection(inputBuffer, inputBuffer.length,
                                0, offset);
    }
});
